import { categories, products } from "../data/seed";
import type {
  Category,
  CategorySlug,
  Paginated,
  Product,
  ProductListFilters,
  ProductWithCategory,
} from "../types";

/**
 * Router-neutral catalogue queries.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `catalog-repository.ts` cannot be imported from the Pages Router. It starts
 * with `import "server-only"`, and doing so fails the build outright:
 *
 *   Error: You're importing a module that depends on "server-only". This API is
 *   only available in Server Components in the App Router, but you are using it
 *   in the Pages Router.
 *
 * The same applies to its `"use cache"` directives and `cacheLife`/`cacheTag`
 * calls — all Cache Components features, all App Router only.
 *
 * So the query LOGIC lives here, free of both, and each router wraps it in its
 * own caching model:
 *
 *   App Router   -> catalog-repository.ts adds `use cache` + cacheLife + cacheTag
 *   Pages Router -> getStaticProps/getServerSideProps add `revalidate` (ISR)
 *
 * One implementation of "what are the audio products", two caching strategies.
 * Duplicating the filtering logic instead would guarantee the two halves drift.
 *
 * NO `server-only` HERE — by design, since the Pages Router must import it.
 * That is safe because Next strips `getStaticProps`/`getServerSideProps` and
 * any imports used solely by them out of the client bundle, so the seed data
 * never reaches the browser.
 */

export function queryCategories(): Category[] {
  return categories;
}

export function queryCategoryBySlug(slug: string): Category | null {
  return categories.find((category) => category.slug === slug) ?? null;
}

export function queryAllCategorySlugs(): CategorySlug[] {
  return categories.map((category) => category.slug);
}

export function queryAllProductSlugs(): string[] {
  return products.map((product) => product.slug);
}

export function queryFeaturedProducts(limit = 4): Product[] {
  return products.filter((product) => product.featured).slice(0, limit);
}

export function queryProductBySlug(slug: string): ProductWithCategory | null {
  const product = products.find((candidate) => candidate.slug === slug);
  if (!product) return null;

  const category = categories.find(
    (candidate) => candidate.slug === product.categorySlug,
  );
  // A product pointing at a missing category is a data-integrity bug, not a
  // 404 — fail loudly rather than render half a page.
  if (!category) {
    throw new Error(
      `Product "${product.slug}" references unknown category "${product.categorySlug}".`,
    );
  }

  return { ...product, category };
}

export function queryProducts(
  filters: ProductListFilters = {},
  page = 1,
  pageSize = 8,
): Paginated<Product> {
  let result = [...products];

  if (filters.category) {
    result = result.filter(
      (product) => product.categorySlug === filters.category,
    );
  }

  if (filters.search) {
    const needle = filters.search.toLowerCase();
    result = result.filter(
      (product) =>
        product.name.toLowerCase().includes(needle) ||
        product.description.toLowerCase().includes(needle),
    );
  }

  if (typeof filters.minPriceInCents === "number") {
    const min = filters.minPriceInCents;
    result = result.filter((product) => product.priceInCents >= min);
  }

  if (typeof filters.maxPriceInCents === "number") {
    const max = filters.maxPriceInCents;
    result = result.filter((product) => product.priceInCents <= max);
  }

  switch (filters.sort) {
    case "price-asc":
      result.sort((a, b) => a.priceInCents - b.priceInCents);
      break;
    case "price-desc":
      result.sort((a, b) => b.priceInCents - a.priceInCents);
      break;
    case "rating":
      result.sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
    default:
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
  }

  const total = result.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;

  return {
    items: result.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    pageCount,
  };
}
