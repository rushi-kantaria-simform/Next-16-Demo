import Head from "next/head";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Pages Router 404 — the counterpart to `app/not-found.tsx`.
 *
 * Statically generated at build time, which is why it must not depend on
 * request data. It handles 404s for `pages/` routes only; App Router URLs
 * still resolve to `app/not-found.tsx`. Two routers, two 404 pages, and
 * whichever router owns the URL wins.
 *
 * Unlike the App Router version, this one reliably gets a real 404 status —
 * no shell is streamed ahead of it, so there is nothing to fix the status line
 * early (see Topic 1).
 */
export default function Custom404() {
  return (
    <>
      <Head>
        <title>Page not found | Nexus Store</title>
      </Head>
      <Container>
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="font-mono text-sm text-content-muted">pages/404.tsx</p>
          <h1 className="text-3xl font-semibold tracking-tight text-content">
            We couldn&apos;t find that page
          </h1>
          <p className="max-w-md text-content-muted">
            This 404 was served by the Pages Router.
          </p>
          <Link href="/classic" className="mt-2">
            <Button>Back to the classic overview</Button>
          </Link>
        </div>
      </Container>
    </>
  );
}
