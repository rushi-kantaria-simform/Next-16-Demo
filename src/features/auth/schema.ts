import { z } from "zod";

/**
 * Session shape, shared by the proxy and the server-only session module.
 *
 * Deliberately has NO `import "server-only"`. `proxy.ts` needs to parse the
 * same cookie, and it is not a React Server Component — marking this
 * server-only would make it unimportable there, exactly as it did for the
 * Pages Router in Topic 3.
 *
 * Nothing secret lives here: it is a schema and a pure parser. The parts that
 * touch `cookies()` stay in server/session.ts, which IS server-only.
 */

export const SESSION_COOKIE = "nexus_session";

export const sessionSchema = z.object({
  user: z.string().min(1).max(40),
  role: z.enum(["customer", "admin"]),
});

export type Session = z.infer<typeof sessionSchema>;

/**
 * Parse a raw cookie value into a Session, or null.
 *
 * One implementation, two callers — so the proxy and the page can never
 * disagree about what counts as a valid session. Two separate parsers would
 * eventually drift, and a drift here is an authorisation bug.
 */
export function parseSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
