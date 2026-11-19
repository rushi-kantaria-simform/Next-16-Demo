import { z } from "zod";

/**
 * Type-safe, validated environment variables.
 *
 * Why this file exists
 * --------------------
 * `process.env.FOO` is typed `string | undefined` and is never checked. A typo
 * or a missing value in CI surfaces as `undefined` three layers deep inside a
 * request. Parsing once, at module load, turns that into a loud failure with
 * the variable name attached.
 *
 * The server/client split
 * -----------------------
 * Next inlines `process.env.NEXT_PUBLIC_*` into the browser bundle at build
 * time. Anything else is server-only and is literally not present in client
 * code. Keeping two schemas — and throwing if server env is touched from the
 * browser — makes it impossible to leak a secret by importing the wrong thing.
 */

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  /** Which catalog adapter to use. Grows as we add a real database later. */
  CATALOG_SOURCE: z.enum(["memory"]).default("memory"),

  /**
   * Artificial read latency in ms, so Suspense/streaming is observable in dev.
   * `coerce` because every env var arrives as a string.
   */
  CATALOG_LATENCY_MS: z.coerce.number().int().min(0).max(5_000).default(0),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
});

/**
 * Client vars must be referenced as full static literals. Next replaces the
 * exact text `process.env.NEXT_PUBLIC_SITE_URL` during the build — a computed
 * lookup like `process.env[key]` would survive as a runtime read of an object
 * that does not exist in the browser, and silently yield `undefined`.
 */
const rawClientEnv = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

function format(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function parseClientEnv() {
  const parsed = clientSchema.safeParse(rawClientEnv);
  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables:\n${format(parsed.error)}\n\n` +
        `Copy .env.example to .env.local and fill in the missing values.`,
    );
  }
  return parsed.data;
}

function parseServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error(
      "`serverEnv` was imported into client code. Server variables are not " +
        "available in the browser — use `clientEnv` instead, or move this " +
        "code into a Server Component.",
    );
  }

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${format(parsed.error)}\n\n` +
        `Copy .env.example to .env.local and fill in the missing values.`,
    );
  }
  return parsed.data;
}

/** Safe to import anywhere, including Client Components. */
export const clientEnv = parseClientEnv();

/**
 * Server-only. Lazy via getter so that merely importing this module from a
 * shared file does not blow up the client bundle — it only throws if something
 * actually *reads* a server variable in the browser.
 */
export const serverEnv = new Proxy({} as z.infer<typeof serverSchema>, {
  get(_target, prop: string) {
    const parsed = parseServerEnv();
    return parsed[prop as keyof typeof parsed];
  },
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
