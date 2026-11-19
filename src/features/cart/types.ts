import { z } from "zod";

/**
 * Cart domain types.
 *
 * The cart lives in a cookie, which means the stored value is UNTRUSTED input:
 * the user can edit it, and an old release may have written a different shape.
 * So the schema is the contract, and `cartSchema.safeParse` is the only way the
 * data is allowed in. A malformed cookie degrades to an empty cart rather than
 * crashing a render.
 */

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  slug: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const cartSchema = z.array(cartItemSchema).max(50);

export type CartItem = z.infer<typeof cartItemSchema>;

/** A cart line joined with its product — what the UI actually renders. */
export interface CartLine extends CartItem {
  name: string;
  priceInCents: number;
  currency: string;
  imageUrl: string;
  imageAlt: string;
  /** quantity × unit price, computed server-side so the client cannot forge it. */
  lineTotalInCents: number;
  inStock: boolean;
}

export interface CartSummary {
  lines: CartLine[];
  itemCount: number;
  subtotalInCents: number;
  currency: string;
}

/** Discriminated result shared by every cart Server Action. */
export type ActionResult =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };
