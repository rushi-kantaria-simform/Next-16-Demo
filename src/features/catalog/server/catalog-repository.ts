import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { serverEnv } from "@/lib/env";
import { sleep } from "@/lib/utils";
import {
  queryAllCategorySlugs,
  queryAllProductSlugs,
  queryCategories,
  queryCategoryBySlug,
  queryFeaturedProducts,
  queryProductBySlug,
  queryProducts,
} from "../lib/queries";
import type {
  Category,
  CategorySlug,
  Paginated,
  Product,
  ProductListFilters,
  ProductWithCategory,
} from "../types";

/**
 * App Router catalogue data access.
 *
 * The query LOGIC lives in ../lib/queries.ts. This file adds the two things
 * that are App Router only, and which are exactly what the Pages Router cannot
 * import:
 *
 * 1. `import "server-only"` — makes importing this from a Client Component (or
 *    from anywhere in the Pages Router) a BUILD ERROR instead of a confusing
 *    runtime failure.
 * 2. `"use cache"` + `cacheLife` + `cacheTag` — Cache Components. This is what
 *    lets these functions run during prerender and land in the static shell.
 *    Without the directive, calling them from a page forces the route dynamic.
 *
 * The Pages Router gets the same data by calling ../lib/queries.ts directly and
 * wrapping it in `revalidate` (ISR) instead. See Topic 3.
 *
 * On `cacheTag`: the tags declared here are the handles used to invalidate this
 * data later — `revalidateTag("products")` after a Server Action writes.
 */

/** Simulated I/O so loading states and streaming are observable in dev. */
async function simulateLatency() {
  await sleep(serverEnv.CATALOG_LATENCY_MS);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag("categories");

  await simulateLatency();
  return queryCategories();
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  "use cache";
  cacheLife("catalog");
  cacheTag("categories", `category:${slug}`);

  await simulateLatency();
  return queryCategoryBySlug(slug);
}

export async function getAllCategorySlugs(): Promise<CategorySlug[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag("categories");

  return queryAllCategorySlugs();
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProductBySlug(
  slug: string,
): Promise<ProductWithCategory | null> {
  "use cache";
  cacheLife("catalog");
  cacheTag("products", `product:${slug}`);

  await simulateLatency();
  return queryProductBySlug(slug);
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag("products", "products:featured");

  await simulateLatency();
  return queryFeaturedProducts(limit);
}

/**
 * Filtered, sorted, paginated product list.
 *
 * Note the plain-object argument: `use cache` keys the entry on the serialised
 * arguments, so two callers with the same filters share one entry. Everything
 * passed in must be serialisable — no functions, no class instances, no Dates.
 */
export async function listProducts(
  filters: ProductListFilters = {},
  page = 1,
  pageSize = 8,
): Promise<Paginated<Product>> {
  "use cache";
  cacheLife("catalog");
  cacheTag("products");

  await simulateLatency();
  return queryProducts(filters, page, pageSize);
}

/**
 * Every product slug — used by `generateStaticParams` to prerender the detail
 * pages at build time.
 */
export async function getAllProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("catalog");
  cacheTag("products");

  return queryAllProductSlugs();
}
