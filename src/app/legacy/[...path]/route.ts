import { NextResponse, type NextRequest } from "next/server";

import { getAllProductSlugs } from "@/features/catalog/server/catalog-repository";

/**
 * REQUIRED CATCH-ALL: `[...path]` — absorbing URLs from a previous storefront.
 *
 * Single brackets match one or more segments but NOT `/legacy` itself:
 *
 *   /legacy                 -> 404 (no match)
 *   /legacy/p/aurora-…      -> path === ["p", "aurora-…"]
 *   /legacy/store/old/thing -> path === ["store", "old", "thing"]
 *
 * `[[...path]]` would also match the bare `/legacy`. That is the only
 * difference between the two forms.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A ROUTE HANDLER AND NOT A PAGE
 * ---------------------------------------------------------------------------
 * This started as `page.tsx` calling `permanentRedirect()`. It built fine and
 * redirected correctly in a browser — but `curl` showed the truth:
 *
 *   HTTP/1.1 200 OK
 *   x-nextjs-postponed: 1
 *   …<NEXT_REDIRECT in the streamed body>
 *
 * Under Partial Prerendering the static shell is flushed before the component
 * runs, which fixes the status line at 200. `permanentRedirect()` then cannot
 * send a 308; it degrades to a client-side redirect carried in the RSC
 * payload. A browser follows it, so the bug is invisible in manual testing. A
 * crawler that does not execute JavaScript sees a 200 — and the entire point
 * of a 308 is telling crawlers to transfer ranking and stop fetching the old
 * URL.
 *
 * A route handler has no shell and no streaming. It returns a Response, so it
 * controls the status line directly and emits a real 308.
 *
 * Rule of thumb: an SEO-critical redirect must never live in a rendered page.
 * Use `next.config.ts` redirects for static rules (cheapest — see `/old-shop`
 * there), a route handler when the target needs a lookup, or `proxy.ts` when
 * it needs to run across many routes.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/legacy/[...path]">,
) {
  const { path } = await context.params;
  const [kind, slug] = path;

  // `new URL(..., request.url)` resolves against the current origin, so this
  // works in dev, preview and production without a hardcoded host.
  const to = (pathname: string) =>
    NextResponse.redirect(new URL(pathname, request.url), 308);

  if (kind === "p" && slug) {
    const slugs = await getAllProductSlugs();
    // Only redirect to a product that still exists — otherwise a dead legacy
    // link would 308 into a 404, which is worse than landing on the catalogue.
    if (slugs.includes(slug)) return to(`/products/${slug}`);
  }

  if (kind === "c" && slug) {
    return to(`/categories/${slug}`);
  }

  // Unknown legacy URL: send it to the catalogue rather than 404ing, so an
  // inbound link from an old sitemap still lands somewhere useful.
  return to("/products");
}
