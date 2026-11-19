"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { dynamicRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

// `/shop` goes through `dynamicRoute` because it is the bare path of an
// optional catch-all, which typedRoutes does not emit as a literal.
const links = [
  { href: dynamicRoute("/products"), label: "All products" },
  { href: dynamicRoute("/shop"), label: "Browse" },
  { href: dynamicRoute("/categories"), label: "Categories" },
] as const;

/**
 * Sub-navigation with an active indicator.
 *
 * This needs `"use client"` purely because `usePathname()` is a hook. It is a
 * leaf component — the `(shop)` layout that renders it stays a Server
 * Component, so only this small piece ships to the browser.
 *
 * `usePathname()` returns the path WITHOUT the query string, which is what we
 * want: `/products?sort=rating` should still highlight "All products".
 */
export function ShopNav() {
  /**
   * `?? ""` is not defensive padding — it became REQUIRED the moment a
   * `pages/` directory was added to this project.
   *
   * With both routers present, Next widens `usePathname()` to
   * `string | null`, because an App Router hook rendered under the Pages
   * Router returns null. This component only ever renders in `app/`, so the
   * null branch is unreachable at runtime — but the type is now honest about
   * a scenario that exists in a mixed codebase, and the compiler enforces it.
   */
  const pathname = usePathname() ?? "";

  return (
    // `scrollbar-none` is our custom @utility — the tabs scroll horizontally
    // on narrow screens without a scrollbar cutting through the underline.
    <nav
      aria-label="Shop"
      className="scrollbar-none flex gap-1 overflow-x-auto border-b border-line"
    >
      {links.map((link) => {
        // Prefix match so /products/aurora-… keeps "All products" active,
        // but guard against /products matching /productsomething.
        const isActive =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              isActive
                ? "border-brand-600 text-brand-700 dark:text-brand-300"
                : "border-transparent text-content-muted hover:text-content",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
