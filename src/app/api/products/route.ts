import type { NextRequest } from "next/server";

import { parseSearchParams } from "@/features/catalog/lib/filters";
import { listProducts } from "@/features/catalog/server/catalog-repository";

/**
 * GET /api/products?q=&category=&sort=&page=
 *
 * Route handlers live in `route.ts` and export one function per HTTP verb
 * (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS). A folder cannot contain both
 * `route.ts` and `page.tsx` — they would both try to own the same URL.
 *
 * Under `cacheComponents`, GET handlers are DYNAMIC by default (this changed
 * in v15 — they used to be cached). Reading `request.nextUrl.searchParams`
 * here is therefore fine and needs no Suspense; Suspense is a rendering
 * concept and there is no component tree in a route handler.
 *
 * The data still comes from the same `use cache` repository as the pages, so
 * identical filters hit the same cache entry regardless of whether the caller
 * was a page render or this endpoint.
 */
export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams);
  const { filters, page } = parseSearchParams(raw);

  const result = await listProducts(filters, page, 12);

  return Response.json(result, {
    headers: {
      // Let a CDN serve this for a minute and keep serving the stale copy for
      // an hour while it revalidates behind the scenes.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=3600",
    },
  });
}
