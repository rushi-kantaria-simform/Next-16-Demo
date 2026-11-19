import { Suspense } from "react";
import { forbidden, unauthorized } from "next/navigation";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { getSession } from "@/features/auth/server/session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <Container>
      <div className="max-w-2xl py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          Admin area
        </h1>
        <Suspense fallback={<Skeleton />}>
          <AdminPanel />
        </Suspense>
      </div>
    </Container>
  );
}

/**
 * 401 vs 403 — the distinction people collapse, and shouldn't.
 *
 *   unauthorized()  401  "I don't know who you are."   -> sign in
 *   forbidden()     403  "I know who you are, and no." -> signing in again
 *                                                         will not help
 *
 * Collapsing both into a redirect-to-login produces the classic loop: a
 * customer hits an admin page, gets sent to sign-in, signs in successfully,
 * is sent back, and bounces again forever.
 *
 * Both require `experimental.authInterrupts` and render their nearest
 * boundary file — `unauthorized.tsx` / `forbidden.tsx` — with the matching
 * status, plus an injected `<meta name="robots" content="noindex">`.
 *
 * Note the proxy cannot make this decision: it guards `/account/*` on session
 * PRESENCE. Role is a property of the data, so it is checked where the data
 * is read.
 */
async function AdminPanel() {
  const session = await getSession();

  if (!session) unauthorized();
  if (session.role !== "admin") forbidden();

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-card border border-line p-4">
        <Badge tone="brand">admin</Badge>
        <p className="text-sm text-content-muted">
          Signed in as{" "}
          <span className="font-medium text-content">{session.user}</span>
        </p>
      </div>
      <p className="text-sm text-content-muted">
        Admin-only content. A customer session reaching this URL gets a 403 from{" "}
        <code>forbidden()</code>, not a redirect.
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mt-6 h-24 animate-pulse rounded-lg bg-surface-muted" />
  );
}
