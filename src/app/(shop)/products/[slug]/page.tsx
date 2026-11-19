import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";
import { AddToCartForm } from "@/features/cart/components/add-to-cart-form";
import { ProductDetailsPanel } from "@/features/catalog/components/product-details-panel";
import {
  getAllProductSlugs,
  getProductBySlug,
} from "@/features/catalog/server/catalog-repository";
import {
  ReviewSection,
  ReviewSectionSkeleton,
} from "@/features/reviews/components/review-section";
import { formatPrice } from "@/lib/utils";

/**
 * Prerender every product at build time.
 *
 * This is what keeps the page in the static shell under `cacheComponents`:
 * the `slug` is known ahead of time, so awaiting `params` does not force the
 * route to become request-time dynamic.
 */
export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

/**
 * A note on 404 status codes, because the behaviour surprises people.
 *
 * Request an unknown slug cold and you get `200`, not `404`. Request it again
 * and you get `404`. That is not a bug:
 *
 *   - Under Partial Prerendering the static shell is flushed immediately.
 *     Sending the first chunk fixes the status line, so when the streamed part
 *     later calls `notFound()` the `200` can no longer be retracted.
 *   - Next handles this by injecting `<meta name="robots" content="noindex">`
 *     into the not-found UI, so crawlers skip it regardless of status.
 *   - Once the render is cached, the 404 is served from the start.
 *
 * The usual escape hatch — `export const dynamicParams = false` — is rejected
 * outright under `cacheComponents`, which is the correct trade: it would pin
 * the catalogue to build time. If a hard 404 before streaming is genuinely
 * required, validate the slug in proxy.ts (Topic 11) so the rejection happens
 * before the response starts.
 */

/**
 * Per-page metadata. Runs on the server and reuses the same cached repository
 * call as the page body, so resolving metadata costs no extra data fetch.
 */
export async function generateMetadata(
  props: PageProps<"/products/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Product not found" };

  return {
    title: product.name,
    description: product.description,
    /**
     * Canonical URL. Relative paths are composed with `metadataBase` from the
     * root layout, so this resolves to the full origin.
     *
     * It matters here because the SAME product is reachable from several
     * paths — /products/[slug], the intercepted modal at that URL, and the
     * Pages Router twin at /classic/products/[slug]. A canonical tells search
     * engines which one to index and consolidates ranking onto it instead of
     * splitting it across duplicates.
     */
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      title: product.name,
      description: product.description,
      type: "website",
      url: `/products/${product.slug}`,
      /**
       * Note what is NOT set: an `images` array.
       *
       * `opengraph-image.tsx` in this folder generates the social card and
       * Next wires it into the meta tags automatically. Setting `images` here
       * would OVERRIDE that generated image with the raw product photo —
       * losing the name, price and rating rendered onto the card.
       */
    },
  };
}

export default async function ProductDetailPage(
  props: PageProps<"/products/[slug]">,
) {
  // `params` is a Promise in v16 — the synchronous access that worked in v14
  // and was deprecated in v15 is now removed.
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  // `notFound()` throws, rendering the nearest not-found.tsx. Returning null
  // here would render a blank page with a 200 status instead of a real 404.
  if (!product) notFound();

  const outOfStock = product.stock === 0;

  return (
    <Container>
      {/*
        Product structured data. Google reads this to build a rich result —
        price, availability and rating stars under the search listing.

        Every value is duplicated from what the page already renders, which is
        the rule that keeps it legitimate: structured data must match the
        visible content. Advertising a price or rating the page does not show
        is cloaking, and gets rich results revoked.
      */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description,
          image: product.image.url,
          sku: product.id,
          category: product.category.name,
          brand: { "@type": "Brand", name: siteConfig.name },
          offers: {
            "@type": "Offer",
            // schema.org wants a decimal string, not our integer cents.
            price: (product.priceInCents / 100).toFixed(2),
            priceCurrency: product.currency,
            availability: outOfStock
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
            url: `${siteConfig.url}/products/${product.slug}`,
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }}
      />

      <div className="grid gap-10 py-12 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-card bg-surface-muted">
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            // `preload`, not the deprecated `priority`. Correct HERE — unlike a
            // grid — because this is a single, unambiguous LCP hero image, so
            // a <link rel="preload"> in <head> has nothing to compete with.
            preload
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href={`/categories/${product.category.slug}`}
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
          >
            {product.category.name}
          </Link>

          <h1 className="text-3xl font-semibold tracking-tight text-content">
            {product.name}
          </h1>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold text-content">
              {formatPrice(product.priceInCents, product.currency)}
            </span>
            {outOfStock ? (
              <Badge tone="danger">Out of stock</Badge>
            ) : product.stock < 10 ? (
              <Badge tone="warning">Only {product.stock} left</Badge>
            ) : (
              <Badge tone="success">In stock</Badge>
            )}
          </div>

          <p className="leading-relaxed text-content-muted">
            {product.description}
          </p>

          <p className="text-sm text-content-muted">
            {product.rating.toFixed(1)} ★ from {product.reviewCount} reviews
          </p>

          <div className="mt-2 max-w-xs">
            {/*
              A Client Component rendered by a Server Component, receiving only
              a string. That is the ideal shape for the boundary: the server
              does the data work, the client gets the minimum it needs to be
              interactive.
            */}
            <AddToCartForm
              slug={product.slug}
              disabled={outOfStock}
              label={outOfStock ? "Out of stock" : "Add to cart"}
            />
          </div>

          {/* Code-split: its chunk is fetched only when expanded. */}
          <div className="mt-4">
            <ProductDetailsPanel />
          </div>
        </div>
      </div>

      {/*
        Reviews stream in their own boundary.

        The product details above are cached and land in the static shell. The
        review list is cached too, but its cache is invalidated per product on
        every submission — so isolating it here means a new review never forces
        the rest of the page to re-render, and a slow review query can never
        delay the product details.
      */}
      <div className="pb-16">
        <Suspense fallback={<ReviewSectionSkeleton />}>
          <ReviewSection productSlug={product.slug} />
        </Suspense>
      </div>
    </Container>
  );
}
