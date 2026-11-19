import type { GetStaticProps, InferGetStaticPropsType } from "next";
import Head from "next/head";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { queryProducts } from "@/features/catalog/lib/queries";
import type { Product } from "@/features/catalog/types";
import { formatPrice } from "@/lib/utils";

/**
 * INCREMENTAL STATIC REGENERATION (ISR) — the Pages Router version.
 *
 * `revalidate: 900` means: serve the prerendered HTML; after 15 minutes the
 * next request triggers a background regeneration and subsequent visitors get
 * the fresh copy. Stale-while-revalidate, built in.
 *
 * The App Router equivalent is `cacheLife("catalog")` on a `use cache`
 * function — deliberately the same 15 minutes here, so the two models can be
 * compared directly. The differences that matter:
 *
 *   revalidate (pages)     whole-page granularity, time-based only
 *   cacheLife (app)        per-function granularity, composable, and
 *                          tag-invalidatable via revalidateTag()
 *
 * A page here is all-or-nothing: one stale field means the entire page is
 * stale. Cache Components lets one slow section revalidate on its own schedule
 * while the rest of the page stays static.
 */
export const getStaticProps = (async () => {
  const { items, total } = queryProducts({ sort: "newest" }, 1, 12);

  return {
    props: {
      products: items,
      total,
      /**
       * Stamped at build/regeneration time so the ISR window is observable.
       *
       * Worth noting: `new Date()` here is completely fine. The identical call
       * inside an App Router Server Component fails the build with
       * `blocking-prerender-current-time`, because Cache Components refuses to
       * bake a non-deterministic value into a prerender. The Pages Router has
       * no such validation — which is the trade-off in a sentence: fewer
       * guardrails, and correspondingly easier to ship a stale timestamp.
       */
      generatedAt: new Date().toISOString(),
    },
    revalidate: 900,
  };
}) satisfies GetStaticProps<{
  products: Product[];
  total: number;
  generatedAt: string;
}>;

export default function ClassicProducts({
  products,
  total,
  generatedAt,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>Products (ISR) — Pages Router | Nexus Store</title>
      </Head>

      <Container>
        <div className="py-10">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-content">
              Products
            </h1>
            <Badge tone="brand">getStaticProps · revalidate 900s</Badge>
          </div>

          <p className="mt-2 text-sm text-content-muted">
            {total} products · page generated{" "}
            <time dateTime={generatedAt} className="font-mono">
              {generatedAt}
            </time>
          </p>
          <p className="mt-1 text-xs text-content-muted">
            That timestamp is baked into the HTML at build time. It only changes
            when ISR regenerates the page — note that it does NOT update on
            refresh, which is the whole point.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link key={product.id} href={`/classic/products/${product.slug}`}>
                <Card className="h-full transition-colors hover:border-brand-300">
                  <CardBody className="flex flex-col gap-2">
                    <CardTitle className="text-sm">{product.name}</CardTitle>
                    <span className="font-semibold text-content">
                      {formatPrice(product.priceInCents, product.currency)}
                    </span>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
