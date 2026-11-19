import { clientEnv } from "@/lib/env";
import { dynamicRoute } from "@/lib/routes";

/**
 * Single source of truth for anything that names or describes the site.
 * Imported by the root layout's metadata, the header, the footer, and later by
 * sitemap.ts / robots.ts / OG image generation.
 */
export const siteConfig = {
  name: "Nexus Store",
  shortName: "Nexus",
  description:
    "A production-shaped Next.js 16 storefront built to demonstrate the App Router, Cache Components, Server Actions and the rest of the v16 feature set.",
  url: clientEnv.NEXT_PUBLIC_SITE_URL,
  locale: "en-US",
  currency: "USD",
} as const;

/**
 * Primary navigation. Typed as a plain array for now; once the matching routes
 * exist, `href` becomes assignable to Next's generated `Route` union because
 * `typedRoutes` is enabled.
 */
export const mainNav = [
  { title: "Shop", href: dynamicRoute("/products") },
  // "/shop" is the bare path of an optional catch-all, which typedRoutes does
  // not emit as a literal — see src/lib/routes.ts.
  { title: "Browse", href: dynamicRoute("/shop") },
  { title: "Categories", href: dynamicRoute("/categories") },
  { title: "About", href: dynamicRoute("/about") },
] as const;

export type SiteConfig = typeof siteConfig;
