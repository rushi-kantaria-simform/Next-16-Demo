import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { ProductCard } from "@/features/catalog/components/product-card";
import { ProductGridSkeleton } from "@/features/catalog/components/product-grid-skeleton";
import {
  buildShopPath,
  describeFilters,
  parsePathFilters,
} from "@/features/catalog/lib/filters";
import {
  getCategories,
  listProducts,
} from "@/features/catalog/server/catalog-repository";

/**
 * OPTIONAL CATCH-ALL: `[[...filters]]`.
 *
 * The double brackets are the whole point — they match the parent route too:
 *
 *   /shop                       -> filters === undefined
 *   /shop/audio                 -> filters === ["audio"]
 *   /shop/audio/sort-price-asc  -> filters === ["audio", "sort-price-asc"]
 *   /shop/audio/under-300       -> filters === ["audio", "under-300"]
 *
 * A single-bracket `[...filters]` would 404 on `/shop`, forcing a separate
 * `shop/page.tsx` just to handle the bare case.
 *
 * Why path segments instead of `?category=audio`: these are crawlable,
 * canonical URLs that rank. The `/products` page does the same filtering via
 * query string for the interactive case — same repository, same cache entries,
 * two URL shapes serving two different jobs.
 */

export async function generateStaticParams() {
  const categories = await getCategories();

  // Prerender the bare /shop plus one page per category. Deeper combinations
  // (sort, price) still work — they just render on demand.
  return [
    { filters: [] },
    ...categories.map((category) => ({ filters: [category.slug] })),
  ];
}

export async function generateMetadata(
  props: PageProps<"/shop/[[...filters]]">,
): Promise<Metadata> {
  const { filters } = await props.params;
  const parsed = parsePathFilters(filters);
  const description = describeFilters(parsed);

  return {
    title: parsed.category ? `Shop ${parsed.category}` : "Shop",
    description: `Browse ${description}.`,
    alternates: {
      // Point every filter permutation at one canonical URL so search engines
      // do not treat /shop/audio/sort-rating as a duplicate of /shop/audio.
      canonical: buildShopPath({ category: parsed.category }),
    },
  };
}

export default async function ShopPage(
  props: PageProps<"/shop/[[...filters]]">,
) {
  // `params` is safe to await at the top level here: every value comes from
  // the path, and `generateStaticParams` means the common ones are known at
  // build time. Only `searchParams` is inherently request-time.
  const { filters } = await props.params;
  const parsed = parsePathFilters(filters);

  return (
    <Container>
      <div className="py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          Browse
        </h1>
        <p className="mt-2 text-content-muted">
          Showing {describeFilters(parsed)}.
        </p>

        <Suspense fallback={<FacetsSkeleton />}>
          <Facets activeCategory={parsed.category} />
        </Suspense>

        <div className="mt-8">
          <Suspense fallback={<ProductGridSkeleton count={8} />}>
            <Results filters={filters} />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}

async function Facets({ activeCategory }: { activeCategory?: string }) {
  const categories = await getCategories();

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {/* `buildShopPath({})` rather than a literal "/shop" — see src/lib/routes.ts */}
      <Link href={buildShopPath({})}>
        <Badge tone={activeCategory ? "neutral" : "brand"}>All</Badge>
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={buildShopPath({ category: category.slug })}
        >
          <Badge tone={activeCategory === category.slug ? "brand" : "neutral"}>
            {category.name}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

async function Results({ filters }: { filters?: string[] }) {
  const parsed = parsePathFilters(filters);
  const { items, total } = await listProducts(parsed, 1, 12);

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line py-16 text-center">
        <p className="font-medium text-content">Nothing here</p>
        <p className="mt-1 text-sm text-content-muted">
          No products match {describeFilters(parsed)}.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-content-muted">{total} products</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((product, index) => (
          <ProductCard key={product.id} product={product} eager={index < 4} />
        ))}
      </div>
    </>
  );
}

function FacetsSkeleton() {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-6 w-20 animate-pulse rounded-full bg-surface-muted"
        />
      ))}
    </div>
  );
}
