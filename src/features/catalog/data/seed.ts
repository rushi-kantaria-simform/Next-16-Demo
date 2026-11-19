import type { Category, Product } from "../types";

/**
 * In-memory seed data — the "database" behind the `memory` catalog adapter.
 *
 * This module is intentionally dumb: plain arrays, no logic. All reads go
 * through the repository in ../server/catalog-repository.ts so that swapping
 * in a real database later touches exactly one file.
 *
 * Images use picsum.photos (allow-listed in next.config.ts) with a stable seed
 * per product, so the same product always renders the same photo.
 */

export const categories: Category[] = [
  {
    id: "cat_audio",
    slug: "audio",
    name: "Audio",
    description:
      "Headphones, earbuds and speakers tuned for everyday listening.",
  },
  {
    id: "cat_wearables",
    slug: "wearables",
    name: "Wearables",
    description: "Watches and trackers that stay out of your way.",
  },
  {
    id: "cat_peripherals",
    slug: "peripherals",
    name: "Peripherals",
    description: "Keyboards, mice and the desk hardware you touch all day.",
  },
  {
    id: "cat_displays",
    slug: "displays",
    name: "Displays",
    description: "Monitors and panels with colour you can trust.",
  },
  {
    id: "cat_accessories",
    slug: "accessories",
    name: "Accessories",
    description:
      "Cables, stands, hubs and the small things that complete a setup.",
  },
];

function image(seed: string, alt: string) {
  return {
    url: `https://picsum.photos/seed/${seed}/800/800`,
    alt,
    width: 800,
    height: 800,
  };
}

export const products: Product[] = [
  {
    id: "prod_001",
    slug: "aurora-over-ear-headphones",
    name: "Aurora Over-Ear Headphones",
    description:
      "Closed-back wireless headphones with adaptive noise cancelling and a 40-hour battery. Memory-foam earcups stay comfortable through a full workday.",
    priceInCents: 24900,
    currency: "USD",
    categorySlug: "audio",
    image: image("aurora-headphones", "Aurora over-ear headphones in charcoal"),
    rating: 4.7,
    reviewCount: 1284,
    stock: 42,
    featured: true,
    createdAt: "2026-09-02T10:00:00.000Z",
  },
  {
    id: "prod_002",
    slug: "pulse-wireless-earbuds",
    name: "Pulse Wireless Earbuds",
    description:
      "Pocket-sized earbuds with transparency mode, wireless charging and an IPX5 rating for rainy commutes.",
    priceInCents: 12900,
    currency: "USD",
    categorySlug: "audio",
    image: image("pulse-earbuds", "Pulse wireless earbuds with charging case"),
    rating: 4.4,
    reviewCount: 862,
    stock: 130,
    featured: false,
    createdAt: "2026-08-19T10:00:00.000Z",
  },
  {
    id: "prod_003",
    slug: "meridian-smart-watch",
    name: "Meridian Smart Watch",
    description:
      "A titanium-cased tracker with always-on display, multi-band GPS and seven-day battery life.",
    priceInCents: 39900,
    currency: "USD",
    categorySlug: "wearables",
    image: image("meridian-watch", "Meridian smart watch with titanium case"),
    rating: 4.6,
    reviewCount: 537,
    stock: 18,
    featured: true,
    createdAt: "2026-10-11T10:00:00.000Z",
  },
  {
    id: "prod_004",
    slug: "orbit-fitness-band",
    name: "Orbit Fitness Band",
    description:
      "Lightweight band with continuous heart-rate and sleep staging. Charges fully in under an hour.",
    priceInCents: 8900,
    currency: "USD",
    categorySlug: "wearables",
    image: image("orbit-band", "Orbit fitness band in slate grey"),
    rating: 4.1,
    reviewCount: 294,
    stock: 0,
    featured: false,
    createdAt: "2026-06-28T10:00:00.000Z",
  },
  {
    id: "prod_005",
    slug: "tactile-75-mechanical-keyboard",
    name: "Tactile 75 Mechanical Keyboard",
    description:
      "A 75% hot-swappable board with gasket mounting, doubleshot PBT keycaps and per-key RGB.",
    priceInCents: 17900,
    currency: "USD",
    categorySlug: "peripherals",
    image: image("tactile-75", "Tactile 75 mechanical keyboard"),
    rating: 4.8,
    reviewCount: 2140,
    stock: 64,
    featured: true,
    createdAt: "2026-10-30T10:00:00.000Z",
  },
  {
    id: "prod_006",
    slug: "glide-ergonomic-mouse",
    name: "Glide Ergonomic Mouse",
    description:
      "A 58-gram wireless mouse with an 8K polling rate and a shape built for claw grip.",
    priceInCents: 9900,
    currency: "USD",
    categorySlug: "peripherals",
    image: image("glide-mouse", "Glide ergonomic wireless mouse"),
    rating: 4.3,
    reviewCount: 713,
    stock: 87,
    featured: false,
    createdAt: "2026-07-14T10:00:00.000Z",
  },
  {
    id: "prod_007",
    slug: "clarity-27-4k-monitor",
    name: "Clarity 27 4K Monitor",
    description:
      "A 27-inch 4K IPS panel, factory-calibrated to Delta-E under 2, with 90W USB-C power delivery.",
    priceInCents: 64900,
    currency: "USD",
    categorySlug: "displays",
    image: image("clarity-27", "Clarity 27-inch 4K monitor on a desk"),
    rating: 4.5,
    reviewCount: 418,
    stock: 23,
    featured: true,
    createdAt: "2026-09-21T10:00:00.000Z",
  },
  {
    id: "prod_008",
    slug: "panorama-34-ultrawide",
    name: "Panorama 34 Ultrawide",
    description:
      "A 34-inch curved ultrawide at 144Hz — enough horizontal room for three editors side by side.",
    priceInCents: 89900,
    currency: "USD",
    categorySlug: "displays",
    image: image("panorama-34", "Panorama 34-inch curved ultrawide monitor"),
    rating: 4.2,
    reviewCount: 196,
    stock: 7,
    featured: false,
    createdAt: "2026-05-09T10:00:00.000Z",
  },
  {
    id: "prod_009",
    slug: "anchor-usb-c-hub",
    name: "Anchor USB-C Hub",
    description:
      "Eight ports in an aluminium shell: HDMI 2.1, gigabit ethernet, SD, and 100W pass-through.",
    priceInCents: 7900,
    currency: "USD",
    categorySlug: "accessories",
    image: image("anchor-hub", "Anchor USB-C hub in aluminium"),
    rating: 4.0,
    reviewCount: 1023,
    stock: 210,
    featured: false,
    createdAt: "2026-04-02T10:00:00.000Z",
  },
  {
    id: "prod_010",
    slug: "riser-monitor-stand",
    name: "Riser Monitor Stand",
    description:
      "A solid oak riser that lifts a display to eye level and hides a keyboard underneath.",
    priceInCents: 11900,
    currency: "USD",
    categorySlug: "accessories",
    image: image("riser-stand", "Riser monitor stand in solid oak"),
    rating: 4.6,
    reviewCount: 341,
    stock: 55,
    featured: true,
    createdAt: "2026-11-05T10:00:00.000Z",
  },
  {
    id: "prod_011",
    slug: "cascade-desk-speakers",
    name: "Cascade Desk Speakers",
    description:
      "A compact two-way pair with a woven mid-bass driver and a genuinely usable sub-out.",
    priceInCents: 29900,
    currency: "USD",
    categorySlug: "audio",
    image: image("cascade-speakers", "Cascade desk speakers, pair"),
    rating: 4.4,
    reviewCount: 158,
    stock: 31,
    featured: false,
    createdAt: "2026-08-01T10:00:00.000Z",
  },
  {
    id: "prod_012",
    slug: "vector-webcam-4k",
    name: "Vector 4K Webcam",
    description:
      "A 4K sensor with on-device framing, a real privacy shutter and no mandatory companion app.",
    priceInCents: 15900,
    currency: "USD",
    categorySlug: "peripherals",
    image: image("vector-webcam", "Vector 4K webcam mounted on a monitor"),
    rating: 3.9,
    reviewCount: 487,
    stock: 76,
    featured: false,
    createdAt: "2026-03-17T10:00:00.000Z",
  },
];
