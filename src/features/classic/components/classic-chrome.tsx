import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { RouterBadge } from "@/components/layout/router-badge";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for every Pages Router page, rendered from `_app.tsx`.
 *
 * PAGES-ROUTER ONLY. It imports `useRouter` from `next/router`, which throws
 * inside an App Router tree ("NextRouter was not mounted"). The two hooks share
 * a name and nothing else:
 *
 *   next/router      (pages) -> one object: pathname, query, asPath, isReady,
 *                               isFallback, push/replace returning Promises
 *   next/navigation  (app)   -> split hooks: usePathname(), useSearchParams(),
 *                               useParams(), useRouter() with no query/asPath
 *
 * For a component that genuinely must render under both, `next/compat/router`
 * returns `null` instead of throwing when no Pages router is mounted — see
 * router-badge.tsx.
 *
 * Note there is no "use client" directive. The Pages Router predates Server
 * Components: every component here is a client component already, so the
 * directive is meaningless (and harmless) in this half of the app.
 */
const classicNav = [
  { href: "/classic", label: "Overview" },
  { href: "/classic/products", label: "Products (ISR)" },
  { href: "/classic/live", label: "Live (SSR)" },
] as const;

export function ClassicChrome({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <>
      <header className="border-b border-line bg-surface-muted">
        <Container>
          <div className="flex h-14 items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {/* Same component also renders in the App Router header —
                  it reports which router it is under. */}
              <RouterBadge />
              <span className="text-sm text-content-muted">
                Pages Router — legacy surface
              </span>
            </div>

            {/*
              Crosses from the Pages Router into the App Router.
              Per the migration docs: "there will be a hard navigation.
              Automatic link prefetching with next/link will not prefetch
              across routers." So this IS a full document load — verified by
              planting a global and watching it die — but <Link> is still the
              right component: it costs no wasted prefetch (Next declines to
              prefetch across the boundary) and keeps routing idiomatic.
              A raw <a> would behave identically and trip
              @next/next/no-html-link-for-pages for no benefit.
            */}
            <Link
              href="/"
              className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              ← Back to the App Router store
            </Link>
          </div>
        </Container>
      </header>

      <nav aria-label="Classic" className="border-b border-line">
        <Container>
          <div className="flex gap-1">
            {classicNav.map((item) => {
              // `router.pathname` is the ROUTE PATTERN ("/classic/products/[slug]"),
              // while `router.asPath` is the actual URL ("/classic/products/abc").
              // Comparing against pathname keeps the parent tab active on detail
              // pages; comparing asPath would not.
              const isActive =
                router.pathname === item.href ||
                router.pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "border-brand-600 text-brand-700 dark:text-brand-300"
                      : "border-transparent text-content-muted hover:text-content",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </Container>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="mt-auto border-t border-line bg-surface-muted">
        <Container>
          <p className="py-6 text-sm text-content-muted">
            Rendered by the Pages Router · _app.tsx → _document.tsx
          </p>
        </Container>
      </footer>
    </>
  );
}
