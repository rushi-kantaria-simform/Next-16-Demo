import type { Route } from "next";

import { dynamicRoute } from "@/lib/routes";
import type { CategorySlug, ProductListFilters, ProductSort } from "../types";

/**
 * Parsing and serialising catalogue filters.
 *
 * Both `/products` (query string) and `/shop/...` (path segments) end up here,
 * so the two URL shapes converge on one `ProductListFilters` object. That is
 * what lets them share a cached repository call.
 *
 * Everything is validated against a known set. A URL is user input — an
 * unrecognised `?sort=drop%20table` must degrade to the default, never reach
 * the data layer.
 */

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
] as const satisfies ReadonlyArray<{ value: ProductSort; label: string }>;

const VALID_SORTS = new Set<string>(SORT_OPTIONS.map((option) => option.value));

const VALID_CATEGORIES = new Set<string>([
  "audio",
  "wearables",
  "peripherals",
  "displays",
  "accessories",
]);

/** Next gives each search param as `string | string[] | undefined`. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Repeated params (`?q=a&q=b`) arrive as an array — take the first. */
function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function isCategorySlug(value: string): value is CategorySlug {
  return VALID_CATEGORIES.has(value);
}

export function parseSort(value: string | undefined): ProductSort {
  return value && VALID_SORTS.has(value) ? (value as ProductSort) : "newest";
}

export function parsePage(value: string | undefined): number {
  const parsed = Number(value);
  // Guards NaN, 0, negatives and Infinity in one expression.
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/** `/products?q=…&category=…&sort=…&page=…` */
export function parseSearchParams(raw: RawSearchParams): {
  filters: ProductListFilters;
  page: number;
} {
  const category = first(raw.category);
  const search = first(raw.q)?.trim();

  return {
    filters: {
      ...(category && isCategorySlug(category) ? { category } : {}),
      ...(search ? { search } : {}),
      sort: parseSort(first(raw.sort)),
    },
    page: parsePage(first(raw.page)),
  };
}

/**
 * `/shop/audio/sort-price-asc` — SEO-friendly filters as path segments.
 *
 * Order-independent and tolerant: an unrecognised segment is ignored rather
 * than 404ing, so an old or hand-edited URL still renders the catalogue.
 */
export function parsePathFilters(segments: string[] = []): ProductListFilters {
  const filters: ProductListFilters = { sort: "newest" };

  for (const segment of segments) {
    if (isCategorySlug(segment)) {
      filters.category = segment;
      continue;
    }
    if (segment.startsWith("sort-")) {
      filters.sort = parseSort(segment.slice("sort-".length));
      continue;
    }
    if (segment.startsWith("under-")) {
      const dollars = Number(segment.slice("under-".length));
      if (Number.isFinite(dollars) && dollars > 0) {
        filters.maxPriceInCents = Math.round(dollars * 100);
      }
    }
  }

  return filters;
}

/**
 * Inverse of `parsePathFilters`, for building canonical `/shop` links.
 *
 * Returns a `Route` via `dynamicRoute` because the no-filter case produces the
 * bare `"/shop"`, which `typedRoutes` does not accept for an optional
 * catch-all — see the note in src/lib/routes.ts.
 */
export function buildShopPath(filters: ProductListFilters): Route {
  const segments: string[] = [];
  if (filters.category) segments.push(filters.category);
  if (filters.sort && filters.sort !== "newest") {
    segments.push(`sort-${filters.sort}`);
  }
  if (filters.maxPriceInCents) {
    segments.push(`under-${Math.round(filters.maxPriceInCents / 100)}`);
  }
  return dynamicRoute(
    segments.length ? `/shop/${segments.join("/")}` : "/shop",
  );
}

/** Human-readable summary of the active filters, for headings. */
export function describeFilters(filters: ProductListFilters): string {
  const parts: string[] = [];
  if (filters.category) parts.push(filters.category);
  if (filters.search) parts.push(`matching “${filters.search}”`);
  if (filters.maxPriceInCents) {
    parts.push(`under $${Math.round(filters.maxPriceInCents / 100)}`);
  }
  return parts.length ? parts.join(", ") : "all products";
}
