"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Route-level error boundary.
 *
 * `error.tsx` MUST be a Client Component — React error boundaries rely on
 * class-component lifecycle and event handlers, neither of which exist on the
 * server. It catches errors thrown while rendering this route's children; it
 * does NOT catch errors thrown in the root layout itself (that is what
 * global-error.tsx is for).
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with a real reporter (Sentry, etc.) in Topic 11.
    console.error("Route error:", error);
  }, [error]);

  return (
    <Container>
      <div className="flex flex-col items-center gap-4 py-28 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-content">
          Something went wrong
        </h1>
        <p className="max-w-md text-content-muted">
          An unexpected error occurred while rendering this page.
        </p>
        {/*
          In production, `error.message` is replaced with a generic string and
          the real message is redacted — `digest` is the hash you correlate
          against your server logs.
        */}
        {error.digest && (
          <p className="font-mono text-xs text-content-muted">
            Digest: {error.digest}
          </p>
        )}
        <Button onClick={reset} className="mt-2">
          Try again
        </Button>
      </div>
    </Container>
  );
}
