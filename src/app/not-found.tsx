import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Rendered whenever `notFound()` is thrown, or a URL matches no route.
 * Next serves this with a real HTTP 404 status.
 */
export default function NotFound() {
  return (
    <Container>
      <div className="flex flex-col items-center gap-4 py-28 text-center">
        <p className="text-sm font-medium text-brand-600 dark:text-brand-400">
          404
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          We couldn&apos;t find that page
        </h1>
        <p className="max-w-md text-content-muted">
          The link may be out of date, or the product may have been removed from
          the catalogue.
        </p>
        <Link href="/" className="mt-2">
          <Button>Back to home</Button>
        </Link>
      </div>
    </Container>
  );
}
