import "server-only";

import { cookies } from "next/headers";

import { queryProductBySlug } from "@/features/catalog/lib/queries";
import { cartSchema, type CartItem, type CartSummary } from "../types";

/**
 * Cookie-backed cart storage.
 *
 * A cookie is a deliberate choice for this build: it needs no database, it
 * survives a reload, and — most usefully for Topic 5 — it makes the cart
 * genuinely request-scoped data, which is exactly what `cacheComponents`
 * forces you to think about.
 *
 * `cookies()` is async in v16. The synchronous form was deprecated in v15 and
 * removed in v16.
 */

const CART_COOKIE = "nexus_cart";
const CART_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Read and validate the cart.
 *
 * NOTE: this must never be called from inside a plain `"use cache"` scope —
 * `cookies()` there fails with `next-request-in-use-cache`. Callers either sit
 * inside a `<Suspense>` boundary, or use `"use cache: private"`, which is the
 * one cache variant permitted to touch runtime request APIs.
 */
export async function readCart(): Promise<CartItem[]> {
  const store = await cookies();
  const raw = store.get(CART_COOKIE)?.value;
  if (!raw) return [];

  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    // A tampered or outdated cookie resolves to an empty cart instead of a
    // 500. The user loses their cart; they do not lose the site.
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/**
 * Persist the cart.
 *
 * `cookies().set()` is only legal in a Server Action or Route Handler. Calling
 * it while rendering a page throws — a response's headers are already being
 * streamed by then, so there is nothing left to attach a Set-Cookie to.
 */
export async function writeCart(items: CartItem[]): Promise<void> {
  const store = await cookies();

  if (items.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }

  store.set(CART_COOKIE, JSON.stringify(items), {
    // Not readable from JavaScript — the cart is only ever mutated through a
    // Server Action, so the client has no reason to touch it directly.
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Join raw cart items with product data and compute totals.
 *
 * Prices are looked up server-side from the catalogue, never taken from the
 * cookie. If the cookie carried its own price, a user could edit it and buy a
 * $899 monitor for $1. The cookie stores identity and quantity only.
 */
export async function buildCartSummary(
  items: CartItem[],
): Promise<CartSummary> {
  const lines = items.flatMap((item) => {
    const product = queryProductBySlug(item.slug);
    // Product removed from the catalogue since it was added — drop the line
    // rather than render a broken row.
    if (!product) return [];

    return [
      {
        ...item,
        name: product.name,
        priceInCents: product.priceInCents,
        currency: product.currency,
        imageUrl: product.image.url,
        imageAlt: product.image.alt,
        lineTotalInCents: product.priceInCents * item.quantity,
        inStock: product.stock > 0,
      },
    ];
  });

  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotalInCents: lines.reduce(
      (sum, line) => sum + line.lineTotalInCents,
      0,
    ),
    currency: lines[0]?.currency ?? "USD",
  };
}

/** Convenience: read + join in one call. */
export async function getCart(): Promise<CartSummary> {
  return buildCartSummary(await readCart());
}
