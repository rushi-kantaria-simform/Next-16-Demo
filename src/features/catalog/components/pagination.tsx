"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { dynamicRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageCount: number;
}

/**
 * Pagination that preserves the rest of the query string.
 *
 * The bug this avoids: building links as `?page=2` wipes any active `q`,
 * `category` and `sort`. Cloning the existing params and setting only `page`
 * keeps the user's filters intact as they page through results.
 */
export function Pagination({ page, pageCount }: PaginationProps) {
  const router = useRouter();
  // Both hooks widened to `| null` once a `pages/` directory joined the
  // project — an App Router hook under the Pages Router returns null. This
  // component is App-Router-only, so the fallbacks are unreachable, but the
  // compiler now insists. See shop-nav.tsx for the longer note.
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  if (pageCount <= 1) return null;

  function goTo(target: number) {
    const next = new URLSearchParams(searchParams ?? undefined);
    // Page 1 is the default — leave it out so the canonical URL stays clean.
    if (target <= 1) next.delete("page");
    else next.set("page", String(target));

    const query = next.toString();
    router.push(dynamicRoute(query ? `${pathname}?${query}` : pathname), {
      scroll: false,
    });
  }

  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-1"
    >
      <button
        type="button"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
        className="h-9 rounded-lg px-3 text-sm font-medium text-content-muted hover:text-content disabled:pointer-events-none disabled:opacity-40"
      >
        Previous
      </button>

      {pages.map((target) => (
        <button
          key={target}
          type="button"
          onClick={() => goTo(target)}
          aria-current={target === page ? "page" : undefined}
          className={cn(
            "h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition-colors",
            target === page
              ? "bg-brand-600 text-white"
              : "text-content-muted hover:bg-surface-muted hover:text-content",
          )}
        >
          {target}
        </button>
      ))}

      <button
        type="button"
        onClick={() => goTo(page + 1)}
        disabled={page >= pageCount}
        className="h-9 rounded-lg px-3 text-sm font-medium text-content-muted hover:text-content disabled:pointer-events-none disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}
