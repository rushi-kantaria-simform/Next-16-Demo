/**
 * The `default.tsx` for the `@modal` slot.
 *
 * This file is NOT optional, and the failure mode without it is confusing:
 *
 *   - Soft (client-side) navigation: Next remembers each slot's active state,
 *     so a missing `default.tsx` often appears to work.
 *   - Hard navigation (fresh page load, refresh, pasted URL): there is no
 *     remembered state to fall back on. Next renders `default.tsx` for every
 *     unmatched slot, and if the file is absent it renders a **404** — for the
 *     whole page, not just the slot.
 *
 * So: load /products with no `@modal/default.tsx` and the entire route 404s,
 * even though `/products/page.tsx` is perfectly fine. Returning `null` means
 * "this slot renders nothing here", which is what we want everywhere except
 * the intercepted product route.
 */
export default function ModalDefault() {
  return null;
}
