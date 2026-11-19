"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * LAZY LOADING with `next/dynamic`.
 *
 * `SizeGuide` plus its CSS Module are split into a separate chunk that is only
 * requested when the panel is first expanded. Most visitors never open it, so
 * most visitors never download it.
 *
 * Two things that are easy to get wrong:
 *
 * 1. The import must be a plain arrow returning `import(...)`. The bundler
 *    reads that call statically to create the chunk — build the specifier
 *    from a variable and there is nothing to split.
 *
 * 2. `ssr: false` is ONLY legal inside a Client Component. Using it from a
 *    Server Component is a build error. It is omitted here on purpose: the
 *    table is real content, so letting it server-render when expanded keeps
 *    it in the HTML for crawlers.
 *
 * `React.lazy` would also work, but needs its own <Suspense>; `next/dynamic`
 * takes the fallback inline.
 */
const SizeGuide = dynamic(
  () => import("./size-guide").then((mod) => mod.SizeGuide),
  {
    loading: () => (
      <div className="h-40 animate-pulse rounded-lg bg-surface-muted" />
    ),
  },
);

export function ProductDetailsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-card border border-line">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="product-details-panel"
        className="flex w-full items-center justify-between rounded-[inherit] px-4 py-3 text-sm font-medium text-content transition-colors hover:bg-surface-muted"
      >
        Specifications &amp; policies
        <ChevronDown
          className={cn(
            "size-4 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {/*
        Mount on demand rather than render-and-hide. `hidden` would still
        download and execute the chunk, which defeats the split entirely.
      */}
      {open && (
        <div id="product-details-panel" className="px-4 pb-4">
          <SizeGuide />
        </div>
      )}
    </div>
  );
}
