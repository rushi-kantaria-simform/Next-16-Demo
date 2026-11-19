import type { NextApiRequest, NextApiResponse } from "next";

import { parseSearchParams } from "@/features/catalog/lib/filters";
import { queryProducts } from "@/features/catalog/lib/queries";
import type { Paginated, Product } from "@/features/catalog/types";

/**
 * Pages Router API route — contrast with `app/api/products/route.ts`.
 *
 * Both endpoints serve the same data from the same query layer. The APIs are
 * from different eras:
 *
 *                  pages/api                     app/api/route.ts
 *   Export         one default handler           one function PER verb (GET, POST…)
 *   Request        NextApiRequest (Node)         Request (Web standard)
 *   Response       res.status().json()           return Response.json()
 *   Method routing manual `if (req.method...)`   handled by the export name
 *   Body parsing   automatic (req.body)          manual `await request.json()`
 *
 * The Web-standard version is the reason App Router handlers run unchanged on
 * edge runtimes; `NextApiRequest` is a Node `IncomingMessage` subclass and is
 * tied to Node.
 *
 * They coexist with no conflict — different URLs, different routers.
 */

type ErrorBody = { error: string };

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Paginated<Product> | ErrorBody>,
) {
  // Method dispatch is manual here. Forgetting this means POST/DELETE silently
  // fall through to the GET branch — a whole class of bug the App Router's
  // per-verb exports make impossible.
  if (req.method !== "GET") {
    // `Allow` is required by the HTTP spec on a 405.
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // `req.query` is already parsed and has the same shape the App Router gets
  // from searchParams, so the shared validator works unchanged.
  const { filters, page } = parseSearchParams(req.query);
  const result = queryProducts(filters, page, 12);

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=3600",
  );
  return res.status(200).json(result);
}
