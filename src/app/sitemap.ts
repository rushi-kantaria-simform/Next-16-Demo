import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import {
  queryAllProductSlugs,
  queryCategories,
} from "@/features/catalog/lib/queries";

/**
 * Dynamic sitemap at /sitemap.xml.
 *
 * Note the import: `lib/queries`, not the `use cache` repository. `sitemap.ts`
 * is a metadata route, not a React render, so the Cache Components directives
 * do not apply — the same router-neutral query layer that Topic 3 extracted
 * for the Pages Router is what makes this work.
 *
 * Generated from the catalogue rather than hand-maintained, so a new product
 * is listed the moment it exists. A static XML file is guaranteed to drift.
 *
 * For >50,000 URLs, split with `generateSitemaps()` returning `[{id: 0}, …]`,
 * which produces /sitemap/0.xml etc. (In v16 that `id` param is a Promise.)
 * This catalogue is 12 products, so a single file is correct.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;

  // `lastModified` is intentionally a fixed build-time value rather than
  // `new Date()` per entry. Telling crawlers every page changed on every
  // build is noise, and they learn to ignore the field.
  const buildDate = new Date();

  // `lastModified` is set inline rather than via `.map()`: spreading through
  // a map widens `changeFrequency` from its literal union to `string`, which
  // no longer satisfies `MetadataRoute.Sitemap`.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: buildDate,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/products`,
      lastModified: buildDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/shop`,
      lastModified: buildDate,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/categories`,
      lastModified: buildDate,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/about`,
      lastModified: buildDate,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = queryCategories().map(
    (category) => ({
      url: `${base}/categories/${category.slug}`,
      lastModified: buildDate,
      changeFrequency: "weekly",
      priority: 0.6,
    }),
  );

  const productRoutes: MetadataRoute.Sitemap = queryAllProductSlugs().map(
    (slug) => ({
      url: `${base}/products/${slug}`,
      lastModified: buildDate,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  /**
   * Deliberately ABSENT: /cart, /account, /account/admin, /signin, /classic/*
   * and /api/*. Per-user and non-canonical URLs do not belong in a sitemap —
   * a sitemap is a statement that these pages are worth indexing, and each of
   * those also carries `robots: { index: false }` on the page itself.
   */
  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
