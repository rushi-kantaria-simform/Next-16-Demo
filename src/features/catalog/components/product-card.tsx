import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import type { Product } from "../types";

interface ProductCardProps {
  product: Product;
  /**
   * Set on the handful of cards above the fold.
   *
   * Note what this does NOT use. `priority` is deprecated in Next 16 (renamed
   * to `preload`), but the straight swap would have been wrong anyway: the
   * docs say not to use `preload` "when you have multiple images that could be
   * considered the LCP element depending on the viewport" — which is exactly a
   * responsive product grid. Preloading four candidates via <link> in <head>
   * makes them compete, and the real LCP image arrives later, not sooner.
   *
   * `loading="eager"` + `fetchPriority="high"` is the documented alternative:
   * skip lazy-loading and hint importance, without the head-of-queue preload.
   */
  eager?: boolean;
}

export function ProductCard({ product, eager = false }: ProductCardProps) {
  const outOfStock = product.stock === 0;
  const lowStock = !outOfStock && product.stock < 10;

  return (
    <Card className="group flex flex-col transition-colors hover:border-brand-300">
      <Link href={`/products/${product.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden bg-surface-muted">
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            // Tells the optimiser which widths to generate. Without it, Next
            // assumes 100vw and serves a needlessly large file in a grid.
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {outOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Badge tone="neutral">Out of stock</Badge>
            </div>
          )}
        </div>

        <CardBody className="flex flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm leading-snug">
              {product.name}
            </CardTitle>
            {lowStock && <Badge tone="warning">Low</Badge>}
          </div>

          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="font-semibold text-content">
              {formatPrice(product.priceInCents, product.currency)}
            </span>
            <span className="text-xs text-content-muted">
              {product.rating.toFixed(1)} ★ ({product.reviewCount})
            </span>
          </div>
        </CardBody>
      </Link>
    </Card>
  );
}
