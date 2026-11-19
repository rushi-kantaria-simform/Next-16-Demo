import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Rendered when `unauthorized()` is called anywhere under /account.
 * Served with a 401 and an injected `<meta name="robots" content="noindex">`.
 *
 * It offers a sign-in link because 401 means "I don't know who you are" —
 * authenticating genuinely fixes it. Compare forbidden.tsx, which must not.
 */
export default function Unauthorized() {
  return (
    <Container>
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="font-mono text-sm text-content-muted">401</p>
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          You need to sign in
        </h1>
        <p className="max-w-md text-content-muted">
          This page requires a session.
        </p>
        <Link href="/signin" className="mt-2">
          <Button>Sign in</Button>
        </Link>
      </div>
    </Container>
  );
}
