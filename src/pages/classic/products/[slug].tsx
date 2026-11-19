import type {
  GetStaticPaths,
  GetStaticProps,
  InferGetStaticPropsType,
} from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import {
  queryAllProductSlugs,
  queryProductBySlug,
} from "@/features/catalog/lib/queries";
import type { ProductWithCategory } from "@/features/catalog/types";
import { formatPrice } from "@/lib/utils";

/**
 * `getStaticPaths` — the Pages Router ancestor of `generateStaticParams`.
 *
 * Two differences from the App Router version:
 *   1. It returns `{ params: { slug } }` objects, not bare `{ slug }`.
 *   2. It carries a `fallback` mode, which has no direct App Router equivalent.
 *
 * Deliberately prerendering only the FIRST FOUR slugs here, to prove `fallback`
 * actually does something — the other eight are generated on demand.
 *
 *   fallback: false      Anything not listed 404s immediately. Equivalent to
 *                        App Router's `dynamicParams = false` (which, note, is
 *                        rejected outright under `cacheComponents` — Topic 1).
 *   fallback: true       Serves a placeholder immediately, runs getStaticProps
 *                        in the background, then swaps in the data.
 *                        `router.isFallback` is true during that window.
 *   fallback: 'blocking' Waits for getStaticProps, then serves finished HTML.
 *                        No placeholder, no isFallback state.
 *
 * WHY 'blocking' AND NOT true
 * ---------------------------
 * This was `true` first, and it broke 404s. Measured against a production
 * server, an unknown slug returned:
 *
 *   /classic/products/does-not-exist   ->  200   (cold)
 *   /classic/products/does-not-exist   ->  200   (warm, every time)
 *
 * `fallback: true` commits a 200 and ships the placeholder HTML before
 * getStaticProps has run. By the time it returns `{ notFound: true }` the
 * status line is long gone, so the 404 happens CLIENT-side. The result is a
 * permanent soft 404 — worse than the App Router's PPR behaviour in Topic 1,
 * which at least settles on a real 404 once cached.
 *
 * `'blocking'` holds the response until getStaticProps resolves, so
 * `{ notFound: true }` still controls the status line and emits a true 404.
 *
 * The trade-off is real: no instant placeholder, and `router.isFallback` is
 * never true, so that API cannot be demonstrated here. Correct status codes
 * on a storefront are worth more than a loading skeleton.
 */
export const getStaticPaths = (async () => {
  // Deliberately prerendering only the first four; the rest are generated on
  // demand at request time, which is what makes `fallback` observable.
  const slugs = queryAllProductSlugs().slice(0, 4);

  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: "blocking",
  };
}) satisfies GetStaticPaths;

export const getStaticProps = (async (context) => {
  // `context.params` is NOT a Promise here. That v16 breaking change applies to
  // the App Router's `params`/`searchParams`; the Pages Router is unchanged.
  const slug = context.params?.slug;

  if (typeof slug !== "string") {
    return { notFound: true };
  }

  const product = queryProductBySlug(slug);

  /**
   * `{ notFound: true }` is how a Pages Router data function 404s — a returned
   * value, not a thrown call like App Router's `notFound()`.
   *
   * It only yields a real 404 STATUS because `fallback` is `'blocking'`. Under
   * `fallback: true` this same line produces a 200 with a client-side 404; see
   * the note on getStaticPaths above.
   */
  if (!product) {
    return { notFound: true };
  }

  return { props: { product }, revalidate: 900 };
}) satisfies GetStaticProps<{ product: ProductWithCategory }>;

/**
 * No `router.isFallback` guard here, and that is a consequence of choosing
 * `fallback: 'blocking'`.
 *
 * Under `fallback: true` this component would render ONCE with `product`
 * undefined while getStaticProps ran in the background, so a guard would be
 * mandatory — the inferred props type lies about that, and the page would
 * throw on `product.name` without it. `'blocking'` means props are always
 * present by the time anything renders, so the guard would be dead code.
 *
 * Worth noting the contrast: this failure mode has no App Router equivalent.
 * An async Server Component simply awaits its data before rendering anything,
 * so there is no "rendered but dataless" state to defend against.
 */
export default function ClassicProductDetail({
  product,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>{`${product.name} — Pages Router | Nexus Store`}</title>
        <meta name="description" content={product.description} />
      </Head>

      <Container>
        <div className="py-10">
          <Link
            href="/classic/products"
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
          >
            ← All products
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="relative aspect-square overflow-hidden rounded-card bg-surface-muted">
              {/*
                `next/image` works identically in both routers — same
                component, same optimisation pipeline, same remotePatterns
                allow-list from next.config.ts.
              */}
              <Image
                src={product.image.url}
                alt={product.image.alt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                preload
                className="object-cover"
              />
            </div>

            <div className="flex flex-col gap-4">
              <Badge tone="neutral">{product.category.name}</Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-content">
                {product.name}
              </h1>
              <span className="text-2xl font-semibold text-content">
                {formatPrice(product.priceInCents, product.currency)}
              </span>
              <p className="leading-relaxed text-content-muted">
                {product.description}
              </p>
              <p className="text-sm text-content-muted">
                {product.rating.toFixed(1)} ★ from {product.reviewCount} reviews
              </p>

              <a
                href={`/products/${product.slug}`}
                className="mt-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
              >
                View the App Router version of this page →
              </a>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
