import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";

/**
 * Site-wide Open Graph image, generated at build time.
 *
 * `next/og` renders JSX to a PNG with Satori. The constraints are tighter than
 * normal React and the error messages are unhelpful if you forget them:
 *
 *   - NO Tailwind classes. This runs outside the CSS pipeline, so everything
 *     is inline `style`. (A `tw` prop exists but is a separate Satori feature.)
 *   - Flexbox only. No grid, no float. A parent with multiple children MUST
 *     declare `display: "flex"` or Satori throws.
 *   - A small CSS subset — no box-shadow, no filters, limited gradients.
 *
 * Exporting `size` and `contentType` is what tells Next the dimensions and
 * MIME type to advertise in the generated `<meta>` tags.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} — modern tech, thoughtfully chosen`;

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        // Hex, not oklch(): Satori does not understand modern colour
        // functions, so the design tokens cannot be reused directly here.
        background: "linear-gradient(135deg, #0d1017 0%, #1b2440 100%)",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#3b5bdb",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          {/*
            ASCII only — Satori resolves fonts per glyph against Google Fonts
            and logs `Failed to load dynamic font for ◆` for anything outside
            the loaded subset, rendering a blank. See the note in
            products/[slug]/opengraph-image.tsx.
          */}
          N
        </div>
        <span style={{ fontSize: 34, fontWeight: 600 }}>{siteConfig.name}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/*
          Two stacked <span>s rather than one with a <br />.

          Satori ignores <br /> inside text — the first render produced
          "Modern tech,thoughtfully chosen." on a single overflowing line,
          with the comma jammed against the next word. Explicit flex children
          are the reliable way to force a line break here.
        */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.15 }}>
            Modern tech,
          </span>
          <span style={{ fontSize: 68, fontWeight: 600, lineHeight: 1.15 }}>
            thoughtfully chosen.
          </span>
        </div>
        <span style={{ fontSize: 28, color: "#9aa7c7" }}>
          Audio · Wearables · Peripherals · Displays
        </span>
      </div>
    </div>,
    size,
  );
}
