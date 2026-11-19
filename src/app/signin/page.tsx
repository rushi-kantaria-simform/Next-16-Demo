import { Suspense } from "react";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { signIn } from "@/features/auth/server/actions";

export const metadata: Metadata = {
  title: "Sign in",
  // A sign-in form has no business in an index.
  robots: { index: false, follow: false },
};

/**
 * Sign-in page — a role switcher for demonstrating authorisation boundaries.
 *
 * The page shell is static; only the part that reads `searchParams` (the
 * `from` round-trip set by proxy.ts) streams, keeping the PPR pattern from
 * Topic 2 intact.
 */
export default function SignInPage(props: PageProps<"/signin">) {
  return (
    <Container>
      <div className="max-w-md py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-content-muted">
          No password — pick a role to see how authorisation boundaries behave.
        </p>

        <Suspense fallback={<FormSkeleton />}>
          <SignInForm searchParams={props.searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}

async function SignInForm({
  searchParams,
}: {
  searchParams: PageProps<"/signin">["searchParams"];
}) {
  const { from } = await searchParams;
  const returnTo = typeof from === "string" ? from : "";

  return (
    <form action={signIn} className="mt-8 flex flex-col gap-4">
      {/*
        Carried through so proxy.ts can bounce the user back where they were
        headed. The action re-validates it — a `from` from a query string is
        attacker-controlled, and honouring it blindly is an open redirect.
      */}
      <input type="hidden" name="from" value={returnTo} />

      {returnTo && (
        <p className="rounded-lg border border-line bg-surface-muted px-3 py-2 text-xs text-content-muted">
          You&apos;ll be returned to{" "}
          <code className="text-content">{returnTo}</code>
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button type="submit" name="role" value="customer">
          Sign in as customer
        </Button>
        <Button type="submit" name="role" value="admin" variant="secondary">
          Sign in as admin
        </Button>
      </div>

      <p className="text-xs text-content-muted">
        <strong className="text-content">Customer</strong> can reach /account
        but is blocked from /account/admin with a 403.{" "}
        <strong className="text-content">Admin</strong> can reach both.
      </p>
    </form>
  );
}

function FormSkeleton() {
  return (
    <div className="mt-8 flex flex-col gap-2">
      <div className="h-10 animate-pulse rounded-lg bg-surface-muted" />
      <div className="h-10 animate-pulse rounded-lg bg-surface-muted" />
    </div>
  );
}
