"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { dynamicRoute } from "@/lib/routes";
import { SORT_OPTIONS } from "../lib/filters";
import type { Category } from "../types";

const SEARCH_DEBOUNCE_MS = 300;

interface ProductFiltersProps {
  categories: Category[];
}

/**
 * URL-driven filter controls.
 *
 * The URL is the single source of truth — there is no local "filter state" to
 * drift out of sync. Every control writes to the query string and the server
 * re-renders from it. That makes filtered views shareable, bookmarkable and
 * back-button-correct for free.
 *
 * IMPORTANT: `useSearchParams()` makes this component suspend during
 * prerendering, so the caller MUST wrap it in <Suspense>. Without a boundary,
 * Next has to bail the whole surrounding client subtree out to client-side
 * rendering only.
 */
export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  /**
   * The `?? ""` / `?? new URLSearchParams()` fallbacks became mandatory when a
   * `pages/` directory was added: with both routers present Next widens these
   * hooks to `| null`, since an App Router hook rendered under the Pages
   * Router returns null. Unreachable here (this is App-Router-only), but the
   * compiler is right to ask. See shop-nav.tsx for the full note.
   */
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams() ?? new URLSearchParams();

  // `isPending` stays true while the server streams the new list, which lets
  // the UI dim instead of freezing. This is why we use a transition rather
  // than a bare router.replace().
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(currentSearch);

  /** Rewrite one param, always resetting pagination. */
  function commit(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(updates)) {
      // Drop empty values instead of emitting `?q=&sort=` noise.
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }

    // Changing a filter while on page 3 would otherwise show an empty page.
    next.delete("page");

    const query = next.toString();
    startTransition(() => {
      // `replace`, not `push`: typing in a search box should not create a
      // history entry per keystroke. `scroll: false` keeps the viewport put.
      router.replace(dynamicRoute(query ? `${pathname}?${query}` : pathname), {
        scroll: false,
      });
    });
  }

  // Debounce the text input so a 12-character query is one navigation, not 12.
  useEffect(() => {
    if (searchInput === currentSearch) return;

    const timer = setTimeout(
      () => commit({ q: searchInput }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, currentSearch]);

  const hasFilters = Boolean(
    searchParams.get("q") ??
    searchParams.get("category") ??
    searchParams.get("sort"),
  );

  return (
    <div
      className="flex flex-wrap items-end gap-3 transition-opacity"
      style={{ opacity: isPending ? 0.6 : 1 }}
      // Tell assistive tech the results below are being updated.
      aria-busy={isPending}
    >
      <div className="flex min-w-50 flex-1 flex-col gap-1">
        <label
          htmlFor="product-search"
          className="text-xs font-medium text-content-muted"
        >
          Search
        </label>
        <input
          id="product-search"
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Headphones, keyboard…"
          className="h-10 rounded-lg border border-line bg-surface-raised px-3 text-sm text-content"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="product-category"
          className="text-xs font-medium text-content-muted"
        >
          Category
        </label>
        <select
          id="product-category"
          value={searchParams.get("category") ?? ""}
          onChange={(event) => commit({ category: event.target.value })}
          className="h-10 rounded-lg border border-line bg-surface-raised px-3 text-sm text-content"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="product-sort"
          className="text-xs font-medium text-content-muted"
        >
          Sort
        </label>
        <select
          id="product-sort"
          value={searchParams.get("sort") ?? "newest"}
          onChange={(event) => commit({ sort: event.target.value })}
          className="h-10 rounded-lg border border-line bg-surface-raised px-3 text-sm text-content"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setSearchInput("");
            startTransition(() =>
              router.replace(dynamicRoute(pathname), { scroll: false }),
            );
          }}
          className="h-10 px-3 text-sm font-medium text-content-muted hover:text-content"
        >
          Clear
        </button>
      )}
    </div>
  );
}
