"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { queryProductBySlug } from "@/features/catalog/lib/queries";
import type { ActionResult } from "../types";
import { readCart, writeCart } from "./cart-store";

/**
 * Cart Server Actions.
 *
 * `"use server"` at the top of the file marks EVERY export as a Server Action.
 *
 * SECURITY — the thing to internalise: each of these is a public HTTP POST
 * endpoint. Next generates an ID for it and wires it to a route; anyone can
 * call it with any payload, not just your form. So:
 *
 *   - Validate every input. The `formData` arriving here is attacker-controlled
 *     even though the form that normally sends it is not.
 *   - Derive prices and identity on the server. Never trust a price, a total
 *     or a user id that came from the client.
 *   - Only export what should be callable. An exported helper in this file is
 *     an endpoint, not an internal function.
 *
 * CACHE INVALIDATION — `updateTag`, not `revalidateTag`:
 *
 *   updateTag(tag)              immediate expiry. The next read blocks until
 *                               fresh data is ready. Server Actions ONLY.
 *   revalidateTag(tag, 'max')   stale-while-revalidate. Serves the old value
 *                               once more, refreshes in the background.
 *
 * A cart demands read-your-own-writes: click "Add" and the badge must show the
 * new count immediately, not one render later. That is exactly `updateTag`.
 * `revalidateTag` would be right for the product catalogue, where a few
 * seconds of staleness is invisible.
 *
 * Note the bare `revalidateTag(tag)` single-argument form is deprecated in v16
 * — it now takes a profile.
 */

const CART_TAG = "cart";
const MAX_QUANTITY = 99;
const MAX_LINES = 50;

const addSchema = z.object({
  slug: z.string().min(1, "Missing product."),
  quantity: z.coerce.number().int().min(1).max(MAX_QUANTITY).default(1),
});

const updateSchema = z.object({
  slug: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(MAX_QUANTITY),
});

/**
 * `useActionState` calls an action as `(prevState, formData)`. The previous
 * state is unused here, but the parameter must exist for the signature to
 * line up.
 */
export async function addToCart(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = addSchema.safeParse({
    slug: formData.get("slug"),
    quantity: formData.get("quantity") ?? 1,
  });

  if (!parsed.success) {
    // RETURN the error, do not throw. A returned value lands in
    // `useActionState` and renders inline next to the field; a thrown error
    // blows up to the nearest error.tsx and replaces the whole page — wrong
    // response to "quantity must be a number".
    return {
      status: "error",
      message: "That doesn't look right.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0] ?? "form"),
          issue.message,
        ]),
      ),
    };
  }

  const { slug, quantity } = parsed.data;

  // Re-check the product server-side. The form could have been replayed with
  // a slug that no longer exists.
  const product = queryProductBySlug(slug);
  if (!product) {
    return { status: "error", message: "That product is no longer available." };
  }
  if (product.stock === 0) {
    return { status: "error", message: `${product.name} is out of stock.` };
  }

  const cart = await readCart();
  const existing = cart.find((item) => item.slug === slug);

  if (existing) {
    // Clamp rather than reject — adding 5 to a cart of 97 should land on 99,
    // not throw away the whole interaction.
    existing.quantity = Math.min(existing.quantity + quantity, MAX_QUANTITY);
  } else {
    if (cart.length >= MAX_LINES) {
      return { status: "error", message: "Your cart is full." };
    }
    cart.push({ productId: product.id, slug, quantity });
  }

  await writeCart(cart);
  updateTag(CART_TAG);

  return { status: "success", message: `${product.name} added to your cart.` };
}

/** Set an exact quantity. Zero removes the line. */
export async function updateCartItem(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateSchema.safeParse({
    slug: formData.get("slug"),
    quantity: formData.get("quantity"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Invalid quantity." };
  }

  const { slug, quantity } = parsed.data;
  const cart = await readCart();
  const index = cart.findIndex((item) => item.slug === slug);

  if (index === -1) {
    return { status: "error", message: "That item is not in your cart." };
  }

  if (quantity === 0) {
    cart.splice(index, 1);
  } else {
    // Non-null assertion is safe: `index` came from findIndex above, but
    // `noUncheckedIndexedAccess` cannot see that, so narrow explicitly.
    const line = cart[index];
    if (line) line.quantity = quantity;
  }

  await writeCart(cart);
  updateTag(CART_TAG);

  return { status: "success", message: "Cart updated." };
}

/**
 * Remove one line. Bound with `.bind(null, slug)` at the call site, so the
 * slug arrives as a real argument rather than a hidden form field — it cannot
 * be edited in devtools the way an <input type="hidden"> can.
 */
export async function removeFromCart(slug: string): Promise<void> {
  const cart = await readCart();
  await writeCart(cart.filter((item) => item.slug !== slug));
  updateTag(CART_TAG);
}

export async function clearCart(): Promise<void> {
  await writeCart([]);
  updateTag(CART_TAG);
}
