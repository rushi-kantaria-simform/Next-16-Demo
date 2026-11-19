import { Suspense } from "react";
import Link from "next/link";
import { unauthorized } from "next/navigation";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { signOut } from "@/features/auth/server/actions";
import { getSession } from "@/features/auth/server/session";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <Container>
      <div className="max-w-2xl py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          Your account
        </h1>
        <Suspense fallback={<Skeleton />}>
          <AccountDetails />
        </Suspense>
      </div>
    </Container>
  );
}

/**
 * DEFENCE IN DEPTH — note this re-checks the session that proxy.ts already
 * guarded.
 *
 * That is not redundant. The proxy matcher is a path pattern, and a path
 * pattern is easy to get subtly wrong: a new route added outside the matcher,
 * a trailing-slash variant, a rewrite that bypasses it. The proxy gives a
 * clean redirect for the common case; this check is what actually guarantees
 * the data is never rendered without a session.
 *
 * The rule: a proxy is a convenience, not an authorisation boundary.
 * Authorise where the data is read.
 */
async function AccountDetails() {
  const session = await getSession();

  // `unauthorized()` throws and renders the nearest unauthorized.tsx with a
  // 401. Requires `experimental.authInterrupts`. Like notFound(), it must be
  // called — not returned.
  if (!session) unauthorized();

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-card border border-line p-4">
        <div>
          <p className="font-medium text-content">{session.user}</p>
          <p className="mt-0.5 text-sm text-content-muted">
            Session stored in an httpOnly cookie
          </p>
        </div>
        <Badge tone={session.role === "admin" ? "brand" : "neutral"}>
          {session.role}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/account/admin">
          <Button variant="secondary">Open admin area</Button>
        </Link>

        {/*
          A Server Action passed straight to `action`. Functions cannot
          normally cross the server/client boundary — a Server Action is the
          one exception, because what crosses is a reference, not the code.
        */}
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>

      <p className="text-sm text-content-muted">
        {session.role === "admin"
          ? "You are an admin — the admin area will render."
          : "You are a customer — the admin area will return 403 Forbidden."}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mt-6 h-24 animate-pulse rounded-lg bg-surface-muted" />
  );
}
