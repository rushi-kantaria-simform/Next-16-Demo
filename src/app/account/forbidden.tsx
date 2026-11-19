import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Rendered when `forbidden()` is called anywhere under /account.
 * Served with a 403 and an injected `<meta name="robots" content="noindex">`.
 *
 * Deliberately NO sign-in link. 403 means the server knows exactly who you
 * are and the answer is still no — offering "sign in" would invite the user
 * to repeat an action that cannot change the outcome. The useful exits are
 * back to their own account, or the storefront.
 */
export default function Forbidden() {
  return (
    <Container>
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="font-mono text-sm text-content-muted">403</p>
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          You don&apos;t have access
        </h1>
        <p className="max-w-md text-content-muted">
          Your account is signed in, but this area is restricted to
          administrators.
        </p>
        <div className="mt-2 flex gap-3">
          <Link href="/account">
            <Button variant="secondary">Back to your account</Button>
          </Link>
          <Link href="/products">
            <Button>Continue shopping</Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
