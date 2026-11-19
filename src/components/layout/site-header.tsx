import { Suspense } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { RouterBadge } from "@/components/layout/router-badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Container } from "@/components/ui/container";
import { mainNav, siteConfig } from "@/config/site";
import {
  CartBadge,
  CartBadgeSkeleton,
} from "@/features/cart/components/cart-badge";

/**
 * Server Component — renders once on the server, ships no JavaScript.
 *
 * `<Link>` is the exception: it hydrates on the client to enable prefetching
 * and client-side navigation. With `partialPrefetching: true` these links
 * prefetch each route's *App Shell* (static layout + session chrome) on hover
 * or viewport entry, rather than the whole route.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight text-content"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShoppingBag className="size-4" aria-hidden />
            </span>
            {siteConfig.name}
          </Link>

          {/* Renders in the Pages Router header too — see router-badge.tsx */}
          <RouterBadge />

          <div className="flex items-center gap-1">
            <nav aria-label="Main" className="hidden gap-1 sm:flex">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-content-muted transition-colors hover:bg-surface-muted hover:text-content"
                >
                  {item.title}
                </Link>
              ))}
            </nav>

            {/*
              The <Suspense> here is MANDATORY, not stylistic.

              CartBadge is a `"use cache: private"` function, and private cache
              functions are excluded from static-shell generation by definition
              — they run at request time. Without a boundary the whole header,
              and therefore every route that renders it, would fail the build
              with `blocking-prerender-dynamic`.

              With it, the header is static and prerendered; only this 36px
              square streams in per request.
            */}
            <Suspense fallback={<CartBadgeSkeleton />}>
              <CartBadge />
            </Suspense>

            <ThemeToggle />
          </div>
        </div>
      </Container>
    </header>
  );
}
