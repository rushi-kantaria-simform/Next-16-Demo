import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * Generated /robots.txt.
 *
 * A file-based `public/robots.txt` would work, but it cannot read
 * `siteConfig.url`, so the sitemap line would be a hardcoded host that is
 * wrong in every environment except production.
 *
 * Worth being precise about what robots.txt does: it controls CRAWLING, not
 * INDEXING. A disallowed URL can still appear in results if other sites link
 * to it — and because it is disallowed, the crawler never reads the
 * `noindex` meta tag that would have removed it. Hence the belt-and-braces
 * here: these routes are blocked from crawling AND carry
 * `robots: { index: false }` in their own metadata.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/", // JSON endpoints, no value in an index
        "/cart", // per-user
        "/account", // per-user, 401/403 behind auth
        "/signin", // no value, and indexing login pages is a smell
        "/legacy/", // 308 redirects; crawlers should follow the targets
      ],
    },
    // Tells crawlers where the canonical URL list lives. Without it they
    // discover pages only by following links.
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
