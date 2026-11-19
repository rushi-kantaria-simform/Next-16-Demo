import { Suspense } from "react";
import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { CartLines } from "@/features/cart/components/cart-lines";
import { getCart } from "@/features/cart/server/cart-store";

export const metadata: Metadata = {
  title: "Your cart",
  // A cart is per-user and has no business in an index.
  robots: { index: false, follow: false },
};

/**
 * Cart page.
 *
 * The page function itself is synchronous and fully static — heading and all.
 * Everything cookie-dependent lives inside <Suspense>, so the shell is
 * prerendered and only the lines stream per request. Same Partial Prerendering
 * pattern as `/products`, with cookies as the request-time input instead of
 * searchParams.
 *
 * Note this one does NOT use `"use cache: private"`, unlike the header badge.
 * The badge renders on every page and benefits from a short client-side cache;
 * the cart page is visited deliberately and must always show the current
 * truth, so plain Suspense-wrapped dynamic rendering is the right call.
 */
export default function CartPage() {
  return (
    <Container>
      <div className="py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          Your cart
        </h1>
        <p className="mt-2 text-sm text-content-muted">
          Stored in an httpOnly cookie and mutated only through Server Actions.
        </p>

        <div className="mt-8 max-w-3xl">
          <Suspense fallback={<CartLinesSkeleton />}>
            <CartContents />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}

/**
 * The async boundary. Reading cookies here is legal precisely because this
 * component sits inside <Suspense> — the same read at the page's top level
 * would fail the build with `blocking-prerender-dynamic`.
 */
async function CartContents() {
  const cart = await getCart();
  // A Server Component fetching data, then handing a plain serialisable object
  // to a Client Component that owns the interactivity. The data never round
  // trips through the client to be fetched.
  return <CartLines cart={cart} />;
}

function CartLinesSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 2 }, (_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-4 rounded-card border border-line p-3"
        >
          <div className="size-16 shrink-0 rounded-lg bg-surface-muted" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-4 w-1/2 rounded bg-surface-muted" />
            <div className="h-3 w-24 rounded bg-surface-muted" />
          </div>
          <div className="h-7 w-24 rounded bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}
