import Head from "next/head";

import { Container } from "@/components/ui/container";

/**
 * Pages Router 500 — shown when a server-side error escapes, in production
 * only. In development you get the error overlay with a real stack instead.
 *
 * Also statically generated, which is the point: if the server is already
 * failing, rendering the error page must not require the server to work. The
 * App Router's `error.tsx` is the rough equivalent, but it is a CLIENT
 * component with `reset()`, so it can recover in place; this one cannot.
 */
export default function Custom500() {
  return (
    <>
      <Head>
        <title>Server error | Nexus Store</title>
      </Head>
      <Container>
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <p className="font-mono text-sm text-content-muted">pages/500.tsx</p>
          <h1 className="text-3xl font-semibold tracking-tight text-content">
            Something went wrong
          </h1>
          <p className="max-w-md text-content-muted">
            A server-side error occurred while rendering this page.
          </p>
        </div>
      </Container>
    </>
  );
}
