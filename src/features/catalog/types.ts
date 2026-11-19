/**
 * Catalog domain types.
 *
 * These describe the *shape of the business*, deliberately independent of how
 * the data is stored or rendered. A page imports these; it never imports the
 * seed array or a database row type directly. When the in-memory adapter is
 * swapped for a real database, this file is the contract that does not change.
 */

export type CategorySlug =
  "audio" | "wearables" | "peripherals" | "displays" | "accessories";

export interface Category {
  id: string;
  /** URL segment — the `[slug]` in /categories/[slug]. */
  slug: CategorySlug;
  name: string;
  description: string;
}

export interface ProductImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  /**
   * Stored in minor units (cents) as an integer.
   *
   * Never store money as a float: 0.1 + 0.2 !== 0.3 in IEEE-754, and those
   * fractions of a cent compound across a cart subtotal. Format at the edge
   * with `formatPrice()`.
   */
  priceInCents: number;
  currency: string;
  categorySlug: CategorySlug;
  image: ProductImage;
  rating: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
  createdAt: string;
}

/** A product plus its resolved category — what detail pages actually render. */
export interface ProductWithCategory extends Product {
  category: Category;
}

export interface ProductListFilters {
  category?: CategorySlug;
  search?: string;
  minPriceInCents?: number;
  maxPriceInCents?: number;
  sort?: ProductSort;
}

export type ProductSort = "newest" | "price-asc" | "price-desc" | "rating";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
