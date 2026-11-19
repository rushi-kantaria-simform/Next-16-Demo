import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { ShoppingCart } from "lucide-react";

import { getCart } from "../server/cart-store";

/**
 * Cart indicator for the site header — the hardest thing to render under
 * `cacheComponents`, because it appears on EVERY page yet depends on a cookie.
 *
 * Three ways to render per-user data, and why this one:
 *
 *   1. Plain `"use cache"`        ILLEGAL. Touching cookies() inside fails with
 *                                 `next-request-in-use-cache`, and rightly so —
 *                                 one user's cart would be served to everyone.
 *   2. Uncached + <Suspense>      Legal and correct, but re-reads and re-renders
 *                                 on every single navigation.
 *   3. `"use cache: private"`     What we use. The one cache variant allowed to
 *                                 read runtime request APIs. Results are NEVER
 *                                 written to a shared server cache; the client
 *                                 router holds the rendered output in browser
 *                                 memory for `stale`, and it does not survive a
 *                                 reload.
 *
 * `stale: 30` is not arbitrary — the docs require at least 30 seconds for
 * per-link prefetching to include this content. Below that, prefetch skips it.
 * (5 minutes would be needed to make the App Shell, which is wrong for a cart.)
 *
 * `cacheTag` is what makes it correct after a mutation: every cart action calls
 * `updateTag("cart")`, which expires this immediately so the next read blocks
 * for fresh data. Without it the badge would show a stale count for up to 30
 * seconds after clicking "Add" — the classic read-your-own-writes bug.
 *
 * A private cache function is excluded from the static shell by definition, so
 * the CALLER MUST wrap it in <Suspense>. See site-header.tsx.
 */
export async function CartBadge() {
  "use cache: private";
  cacheLife({ stale: 30 });
  cacheTag("cart");

  const { itemCount } = await getCart();

  return (
    <Link
      href="/cart"
      className="relative inline-flex size-9 items-center justify-center rounded-lg text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
      aria-label={
        itemCount === 0
          ? "Cart, empty"
          : `Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
      }
    >
      <ShoppingCart className="size-4" aria-hidden />
      {itemCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white tabular-nums"
          // The count is already in the aria-label above; hide the duplicate.
          aria-hidden
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}

/** Suspense fallback. Same 36px box, so the header does not shift. */
export function CartBadgeSkeleton() {
  return (
    <div
      className="size-9 animate-pulse rounded-lg bg-surface-muted"
      aria-hidden
    />
  );
}
