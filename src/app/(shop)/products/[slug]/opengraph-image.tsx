import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";
import {
  queryAllProductSlugs,
  queryProductBySlug,
} from "@/features/catalog/lib/queries";
import { formatPrice } from "@/lib/utils";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Product preview";

/**
 * Prerender one OG image per product at build time.
 *
 * Without this the image is generated on first request — and the first
 * request is usually a social crawler with a short timeout, which is exactly
 * when you do not want to be rendering a PNG.
 */
export function generateStaticParams() {
  return queryAllProductSlugs().map((slug) => ({ slug }));
}

/**
 * Per-product Open Graph image.
 *
 * V16 BREAKING CHANGE: `params` here is a **Promise**. In v15 this was a plain
 * object, so the v15 code (`{ params }: { params: { slug: string } }`,
 * `params.slug`) silently yields `undefined` rather than failing loudly —
 * every product would render the fallback card.
 *
 * The same change applies to `twitter-image`, `icon` and `apple-icon`, and to
 * the `id` argument of `generateImageMetadata`.
 */
export default async function ProductOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = queryProductBySlug(slug);

  // A missing product must still produce a valid PNG. Throwing here would
  // leave the crawler with a broken image URL in the page's meta tags.
  if (!product) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d1017",
          color: "#ffffff",
          fontSize: 48,
          fontFamily: "sans-serif",
        }}
      >
        {siteConfig.name}
      </div>,
      size,
    );
  }

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0d1017",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      {/* Satori can fetch and render a remote image, so the real product
            photo appears in the social card rather than a generic template. */}
      <img
        src={product.image.url}
        alt=""
        width={560}
        height={630}
        style={{ objectFit: "cover" }}
      />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 20,
          padding: 64,
        }}
      >
        <span
          style={{
            fontSize: 22,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#9aa7c7",
          }}
        >
          {product.category.name}
        </span>

        <span style={{ fontSize: 54, fontWeight: 600, lineHeight: 1.1 }}>
          {product.name}
        </span>

        <span style={{ fontSize: 44, fontWeight: 600, color: "#8ea2ff" }}>
          {formatPrice(product.priceInCents, product.currency)}
        </span>

        {/*
          Plain ASCII only. The build logged:

            Failed to load dynamic font for ★ . Status: 400

          Satori resolves fonts per glyph against Google Fonts, and there is
          no match for ★, so it silently renders nothing — the card would ship
          with a gap where the rating should be. Shipping a self-hosted font
          file that covers the glyph would also work; for one decorative
          character, words are cheaper.
        */}
        <span style={{ fontSize: 24, color: "#9aa7c7" }}>
          Rated {product.rating.toFixed(1)} / 5 from {product.reviewCount}{" "}
          reviews
        </span>
      </div>
    </div>,
    size,
  );
}
