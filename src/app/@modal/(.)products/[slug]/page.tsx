import Image from "next/image";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AddToCartForm } from "@/features/cart/components/add-to-cart-form";
import {
  getAllProductSlugs,
  getProductBySlug,
} from "@/features/catalog/server/catalog-repository";
import { formatPrice } from "@/lib/utils";

/**
 * INTERCEPTING ROUTE: `@modal/(.)products/[slug]`.
 *
 * How the matcher resolves — this is the part people get wrong. `(.)` means
 * "same level", counted in ROUTE SEGMENTS, not folders. Two folder kinds are
 * invisible to that count:
 *
 *   - `@modal`      a parallel slot  — contributes no URL segment
 *   - `(shop)`      a route group    — contributes no URL segment
 *
 * So this file sits at route-segment level 0 (the root), and `(.)products`
 * matches `products` at that same level. The real page lives at
 * `(shop)/products/[slug]/page.tsx`, which is also level 0 after the group is
 * discounted. They line up.
 *
 * Behaviour:
 *   - Click a product card from / or /products  -> SOFT navigation, this
 *     intercepts, the modal opens over the list, URL becomes /products/[slug].
 *   - Paste that URL or refresh                 -> HARD navigation, no
 *     interception, the full page renders.
 *
 * One shared URL, two presentations. That is the entire feature.
 *
 * `@modal` is at the APP ROOT rather than inside `(shop)` deliberately: the
 * slot only renders under the layout that owns it, so nesting it in `(shop)`
 * would break quick-view when navigating from the home page, which lives in
 * `(marketing)`.
 */

/**
 * An intercepting route needs its own `generateStaticParams` — it does not
 * inherit the one on the route it intercepts.
 *
 * Omitting it fails the build under `cacheComponents`:
 *
 *   Error: Route "/(.)products/[slug]": Next.js encountered uncached or
 *   runtime data during prerendering.
 *
 * With no known params, awaiting `props.params` counts as request-time data,
 * and request-time data outside a <Suspense> boundary blocks prerendering.
 * Declaring the slugs makes them build-time values and the route prerenders —
 * which is also what makes quick-view open instantly instead of streaming.
 */
export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function ProductQuickView(
  props: PageProps<"/products/[slug]">,
) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const outOfStock = product.stock === 0;

  return (
    <Modal>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-card bg-surface-muted">
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            sizes="(min-width: 640px) 28rem, 100vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium tracking-wide text-content-muted uppercase">
            Quick view
          </span>

          <h2 className="text-2xl font-semibold tracking-tight text-content">
            {product.name}
          </h2>

          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold text-content">
              {formatPrice(product.priceInCents, product.currency)}
            </span>
            {outOfStock ? (
              <Badge tone="danger">Out of stock</Badge>
            ) : (
              <Badge tone="success">In stock</Badge>
            )}
          </div>

          <p className="line-clamp-4 text-sm leading-relaxed text-content-muted">
            {product.description}
          </p>

          <div className="mt-auto flex flex-wrap items-start gap-2 pt-2">
            <div className="w-44">
              <AddToCartForm
                slug={product.slug}
                disabled={outOfStock}
                label={outOfStock ? "Out of stock" : "Add to cart"}
              />
            </div>
            {/*
              A plain <a>, NOT <Link> — and this is the one case where that is
              required rather than preferred.

              The modal already occupies /products/[slug]: interception does not
              change the URL, it changes what renders there. So a <Link> to that
              same href asks the router to navigate somewhere it already is, and
              it correctly does nothing — the modal stays open and the page
              never changes. Reproduced before fixing:

                href        /products/aurora-over-ear-headphones
                current URL /products/aurora-over-ear-headphones
                after click URL unchanged, dialog[open] still present

              Whether a route is intercepted is decided by HOW you arrived —
              soft navigation intercepts, a document load does not. Since we are
              already at the destination URL, the only way to reach the
              non-intercepted page is to re-request it as a fresh document.

              An <a> does exactly that, and keeps real link semantics that an
              onClick handler would throw away: middle-click, cmd-click,
              "open in new tab", and a visible href on hover.
            */}
            <a href={`/products/${product.slug}`}>
              <Button variant="secondary">Full details</Button>
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
}
