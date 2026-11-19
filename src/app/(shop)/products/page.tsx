import { Suspense } from "react";
import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { ProductCard } from "@/features/catalog/components/product-card";
import { ProductFilters } from "@/features/catalog/components/product-filters";
import { ProductGridSkeleton } from "@/features/catalog/components/product-grid-skeleton";
import { Pagination } from "@/features/catalog/components/pagination";
import { parseSearchParams } from "@/features/catalog/lib/filters";
import {
  getCategories,
  listProducts,
} from "@/features/catalog/server/catalog-repository";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse the full catalogue.",
};

/**
 * Filterable catalogue, driven entirely by `searchParams`.
 *
 * THE PATTERN THAT MATTERS — note what this function does NOT do: it never
 * awaits `props.searchParams`. It passes the Promise down into a child that
 * sits inside <Suspense>.
 *
 * Awaiting it here would make the whole route request-time dynamic, and the
 * static shell (heading, nav, filter chrome) would be lost. By pushing the
 * await past a Suspense boundary, the shell is prerendered once and only the
 * result list streams per request. That is Partial Prerendering doing its job.
 *
 * A consequence worth knowing: because the page never reads the filter values,
 * it cannot pass them as a `<Suspense key>`, so React reuses the subtree across
 * filter changes and the fallback does not re-fire on every re-filter. Loading
 * feedback for subsequent filter changes comes from `useTransition` in
 * ProductFilters instead, which is the better signal anyway — it dims the live
 * results rather than replacing them with skeletons.
 */
export default function ProductsPage(props: PageProps<"/products">) {
  return (
    <Container>
      <div className="py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-content">
          Shop
        </h1>
        <p className="mt-2 text-content-muted">
          Filter and sort the catalogue. Every control writes to the URL.
        </p>

        <div className="mt-6">
          {/*
            Two separate boundaries. The filter bar suspends because
            `useSearchParams()` does; the results suspend because the data
            fetch does. Keeping them apart means re-filtering does not blank
            out the controls you are currently using.
          */}
          <Suspense fallback={<FiltersSkeleton />}>
            <FilterBar />
          </Suspense>
        </div>

        <div className="mt-8">
          <Suspense fallback={<ProductGridSkeleton count={8} />}>
            <ProductResults searchParams={props.searchParams} />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}

async function FilterBar() {
  const categories = await getCategories();
  return <ProductFilters categories={categories} />;
}

async function ProductResults({
  searchParams,
}: {
  searchParams: PageProps<"/products">["searchParams"];
}) {
  // The await happens HERE, inside the boundary — not in the page.
  const { filters, page } = parseSearchParams(await searchParams);

  // `filters` is a plain serialisable object, so this cached call is keyed on
  // the filter combination: the same query from two users is one cache entry.
  const {
    items,
    total,
    pageCount,
    page: current,
  } = await listProducts(filters, page, 8);

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line py-16 text-center">
        <p className="font-medium text-content">No products match</p>
        <p className="mt-1 text-sm text-content-muted">
          Try removing a filter or searching for something broader.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-content-muted">
        {total} {total === 1 ? "product" : "products"}
        {pageCount > 1 ? ` · page ${current} of ${pageCount}` : ""}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((product, index) => (
          <ProductCard key={product.id} product={product} eager={index < 4} />
        ))}
      </div>

      <Pagination page={current} pageCount={pageCount} />
    </>
  );
}

function FiltersSkeleton() {
  return (
    <div className="flex animate-pulse flex-wrap items-end gap-3">
      <div className="h-10 min-w-50 flex-1 rounded-lg bg-surface-muted" />
      <div className="h-10 w-40 rounded-lg bg-surface-muted" />
      <div className="h-10 w-40 rounded-lg bg-surface-muted" />
    </div>
  );
}
