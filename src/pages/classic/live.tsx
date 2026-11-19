import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";

import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { parseSearchParams } from "@/features/catalog/lib/filters";
import { queryProducts } from "@/features/catalog/lib/queries";
import type { Product } from "@/features/catalog/types";
import { formatPrice } from "@/lib/utils";

/**
 * SERVER-SIDE RENDERING — `getServerSideProps` runs on EVERY request.
 *
 * This is the page to compare against `/products` in the App Router, because
 * they solve the same problem in opposite ways.
 *
 * Pages Router (here):
 *   The whole page is dynamic. Nothing is prerendered, nothing is cached, and
 *   the user waits for the slowest query before seeing ANY markup.
 *
 * App Router (`/products`):
 *   Partial Prerendering. The shell (heading, nav, filter chrome) is static
 *   and arrives immediately; only the filtered results stream in. Same
 *   request-time data, dramatically better first paint.
 *
 * That is the single biggest architectural reason the App Router exists.
 *
 * Note what IS available here that the App Router restricts: `context.req` and
 * `context.res` are the raw Node objects, so reading headers or setting a
 * Cache-Control header needs no `await cookies()` / `await headers()` dance —
 * and no Suspense boundary, because there is no streaming to protect.
 */
export const getServerSideProps = (async (context) => {
  // `context.query` merges route params and query string, already parsed —
  // and crucially it is NOT a Promise, unlike App Router `searchParams`.
  const { filters } = parseSearchParams(context.query);
  const { items, total } = queryProducts(filters, 1, 12);

  // Direct access to the Node response. Let a CDN serve this for a minute
  // while revalidating in the background.
  context.res.setHeader(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=600",
  );

  return {
    props: {
      products: items,
      total,
      sort: filters.sort ?? "newest",
      // Unlike the ISR page, this moves on EVERY reload — proof the page is
      // rendered per request rather than served from a prerender.
      renderedAt: new Date().toISOString(),
      userAgent: context.req.headers["user-agent"] ?? "unknown",
    },
  };
}) satisfies GetServerSideProps<{
  products: Product[];
  total: number;
  sort: string;
  renderedAt: string;
  userAgent: string;
}>;

export default function ClassicLive({
  products,
  total,
  sort,
  renderedAt,
  userAgent,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Live (SSR) — Pages Router | Nexus Store</title>
        {/* Request-specific output should never be indexed. */}
        <meta name="robots" content="noindex" />
      </Head>

      <Container>
        <div className="py-10">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-content">
              Live
            </h1>
            <Badge tone="warning">getServerSideProps · every request</Badge>
          </div>

          <p className="mt-2 text-sm text-content-muted">
            Rendered at{" "}
            <time dateTime={renderedAt} className="font-mono">
              {renderedAt}
            </time>{" "}
            — refresh and this changes, unlike the ISR page.
          </p>

          <dl className="mt-6 grid gap-2 border-t border-line pt-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-content-muted">Sort (from ?sort=)</dt>
              <dd className="font-mono text-content">{sort}</dd>
            </div>
            <div>
              <dt className="text-content-muted">Matching products</dt>
              <dd className="font-mono text-content">{total}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-content-muted">
                Your user-agent (read from context.req)
              </dt>
              <dd className="truncate font-mono text-xs text-content">
                {userAgent}
              </dd>
            </div>
          </dl>

          <p className="mt-6 text-xs text-content-muted">
            Try <code>?sort=price-asc</code>, <code>?sort=rating</code> or{" "}
            <code>?category=audio</code> — parsed by the same validator the App
            Router uses.
          </p>

          <ul className="mt-6 flex flex-col gap-2">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between border-b border-line pb-2 text-sm"
              >
                <span className="text-content">{product.name}</span>
                <span className="font-mono text-content-muted">
                  {formatPrice(product.priceInCents, product.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </>
  );
}
