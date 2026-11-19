import { ShopNav } from "@/components/layout/shop-nav";
import { Container } from "@/components/ui/container";

/**
 * Layout for the `(shop)` route group.
 *
 * The parentheses mean this folder contributes NOTHING to the URL — `/products`
 * stays `/products`. What it buys is a layout boundary: everything under
 * `(shop)` gets this sub-nav, while `(marketing)` routes (`/`, `/about`) do
 * not. That is the whole point of route groups: scoping layout without
 * distorting the URL structure to match.
 *
 * Because this is a layout and not a template, it persists across navigations
 * within the group — the nav is not remounted when moving between /products
 * and /categories, so its scroll position and any state survive.
 */
/**
 * Typed with a plain `children` prop rather than `LayoutProps<"/">`.
 *
 * Route-group layouts do not get their own entry in the generated
 * `LayoutRoutes` union — it contains only `"/"`, the root layout. Borrowing
 * `LayoutProps<"/">` here would compile, but it would wrongly advertise the
 * root's `modal` slot as a prop of this layout.
 */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Container>
        <ShopNav />
      </Container>
      {children}
    </>
  );
}
