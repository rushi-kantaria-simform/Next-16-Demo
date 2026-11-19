# Topic 2 — Routing (App Router)

Every App Router routing primitive, built into the storefront and verified
against a running production server.

---

## 1. Route map

```
src/app/
├── layout.tsx                      root layout — renders `children` + `modal`
├── error.tsx  not-found.tsx
│
├── @modal/                         PARALLEL ROUTE (slot)
│   ├── default.tsx                 → null. Required; see §4
│   └── (.)products/[slug]/page.tsx INTERCEPTING ROUTE → quick-view modal
│
├── (marketing)/                    ROUTE GROUP — no URL segment
│   ├── template.tsx                remounts per navigation (§6)
│   ├── page.tsx                    → /
│   └── about/page.tsx              → /about
│
├── (shop)/                         ROUTE GROUP — own layout, no URL segment
│   ├── layout.tsx                  shop sub-nav
│   ├── products/
│   │   ├── loading.tsx             auto-Suspense boundary
│   │   ├── page.tsx                → /products   (searchParams filtering)
│   │   └── [slug]/page.tsx         → /products/[slug]
│   ├── categories/
│   │   ├── page.tsx                → /categories
│   │   └── [slug]/page.tsx         → /categories/[slug]
│   └── shop/[[...filters]]/page.tsx → /shop, /shop/audio, …  OPTIONAL CATCH-ALL
│
├── legacy/[...path]/route.ts       CATCH-ALL + 308 redirects (§8)
└── api/products/
    ├── route.ts                    → /api/products
    └── [slug]/route.ts             → /api/products/[slug]
```

---

## 2. Route groups — `(name)`

`(shop)` and `(marketing)` contribute **nothing** to the URL. `/products` is
still `/products`. What they buy is a layout boundary: everything in `(shop)`
gets the sub-nav; `/` and `/about` do not.

That is the whole point — scope a layout without bending the URL to match.
Without groups you would need a real `/shop/products` segment just to hang a
layout off it.

> **Watch out:** two groups cannot both define the same route. One `page.tsx`
> for `/` across the whole app.

---

## 3. Dynamic segments

| Pattern         | Matches                     | `params` type        | Matches parent? |
| --------------- | --------------------------- | -------------------- | --------------- |
| `[slug]`        | `/products/abc`             | `{ slug: string }`   | —               |
| `[...path]`     | `/legacy/a`, `/legacy/a/b`  | `{ path: string[] }` | ❌ No            |
| `[[...filters]]`| `/shop`, `/shop/a`, `/shop/a/b` | `{ filters?: string[] }` | ✅ Yes      |

The parent-matching column is the only real difference between the two
catch-all forms, and it is verified:

```
/legacy          -> 404   (required catch-all does not match its parent)
/shop            -> 200   (optional catch-all does)
```

`/shop/[[...filters]]` reads filters from the **path** (`/shop/audio/under-300`)
for crawlable, canonical URLs. `/products` reads the **same filters** from the
query string for the interactive case. Both converge on one
`ProductListFilters` object and hit the same cached repository call — verified:
`/shop/audio` and `/products?category=audio` both return 3 products.

---

## 4. Parallel routes — `@modal`

A slot folder is passed to the layout as a prop beside `children`:

```tsx
export default function RootLayout({ children, modal }: LayoutProps<"/">) {
  return <body>{children}{modal}</body>;
}
```

`LayoutProps<"/">` types `modal` automatically — the generated
`LayoutSlotMap` records `{ "/": "modal" }`, so renaming the folder without
updating the prop is a compile error.

### `default.tsx` is not optional

This is the trap. On **soft** navigation Next remembers each slot's state, so a
missing `default.tsx` often appears to work. On **hard** navigation (refresh,
pasted URL) there is no remembered state, and an unmatched slot with no
`default.tsx` renders a **404 for the entire page** — even though `page.tsx`
is perfectly fine.

Ours returns `null`: "this slot shows nothing here."

---

## 5. Intercepting routes — `(.)`

`@modal/(.)products/[slug]/page.tsx` intercepts `/products/[slug]`.

**The matcher counts route segments, not folders.** Two folder kinds are
invisible to the count:

- `@modal` — parallel slot, no URL segment
- `(shop)` — route group, no URL segment

So the interceptor sits at segment level 0 and `(.)products` matches `products`
at level 0, which after discounting `(shop)` is where the real page lives.

| Matcher      | Intercepts                |
| ------------ | ------------------------- |
| `(.)`        | same segment level        |
| `(..)`       | one level up              |
| `(..)(..)`   | two levels up             |
| `(...)`      | from the `app` root       |

`@modal` lives at the **app root**, not inside `(shop)`, on purpose: a slot
only renders under the layout that owns it, so nesting it in `(shop)` would
break quick-view when clicking from the home page (which is in `(marketing)`).

### Verified in a real browser

Interception only fires on client-side navigation, so `curl` cannot test it.
Driven through a headless browser against `next start`:

| Action                                   | Result |
| ---------------------------------------- | ------ |
| Click a card on `/products`               | URL → `/products/riser-monitor-stand`, `<dialog>` open, list still behind ✅ |
| Reload that same URL (hard nav)           | 0 dialogs, full page renders (`h1` = product name) ✅ |
| Close button                              | URL → `/products`, dialog closed ✅ |
| Escape (`cancel` event)                   | URL → `/products`, dialog closed ✅ |
| "Full details" button                     | see below — this one was broken |

One URL, two presentations — that is the entire feature.

### Bug: `<Link>` cannot escape its own intercepted route

The modal's "Full details" button did nothing. Clicking it left the dialog open
and the page unchanged. Reproduced:

```
href         /products/aurora-over-ear-headphones
current URL  /products/aurora-over-ear-headphones    ← identical
after click  URL unchanged, dialog[open] still present, main h1 still "Shop"
```

**Why:** interception does not change the URL, it changes what renders at it.
The modal already occupies `/products/[slug]`, so a `<Link>` to that href asks
the router to navigate somewhere it already is — and it correctly does nothing.

This is not fixable with `<Link>`. Whether a route is intercepted is decided by
HOW you arrived: a soft navigation intercepts, a document load does not. Since
we are already at the destination URL, the only route to the non-intercepted
page is to re-request it as a fresh document.

**Fix:** a plain `<a href>`. The browser performs a real navigation, no
interception applies, and the full page renders. It also keeps link semantics
an `onClick` would discard — middle-click, cmd-click, open-in-new-tab, and a
visible href on hover.

Verified after the fix: dialog count 0, `main h1` = "Aurora Over-Ear
Headphones", reviews and specs panel present. All four rows above still pass.

> The original code carried a comment asserting that `<Link>` here "replaces
> the modal with the full page". That was written from reasoning, never
> exercised, and was wrong. The browser-driven checks in this table covered
> opening, reloading and both dismiss paths — but never this button.

### Bug found: leaked `open` dialogs

Measured in the browser, quick-viewing three products grew the `<dialog>` count
**1 → 2 → 3**, and it never shrank. Next deliberately preserves a slot's
subtree across soft navigations (that is what makes back/forward instant), so
the effect cleanup runs but the DOM node stays.

Before the fix every leftover kept `open=""` — several elements the browser
still treated as open dialogs. Adding an explicit `close()` to the effect
cleanup fixed it; the open-count now returns to **0** on every dismiss.

The leftover nodes remain (framework behaviour, not unmountable from the
component), but they are closed, `display: none` and out of the accessibility
tree. Cosmetic, not a correctness bug.

---

## 6. `layout.tsx` vs `template.tsx`

| | Layout | Template |
| --- | --- | --- |
| Across navigation | Persists | **Remounts** |
| Client state | Kept | Reset |
| `useEffect` | Runs once | Re-runs |
| CSS entry animation | Fires once ever | Replays |
| Search-param change | — | Does **not** remount |

`(marketing)/template.tsx` wraps its children in `animate-fade-in`. The fade
replays on every navigation precisely because a template produces a new DOM
node; in a layout it would run once and never again.

Default to `layout.tsx`. Remounting discards state and costs work — reach for a
template only when the reset is the goal.

---

## 7. `searchParams` under `cacheComponents` — the pattern that matters

`searchParams` is a Promise, and reading it is request-time data. The naive
version makes the whole route dynamic and throws away the static shell.

**Do not await it in the page.** Pass the Promise down into a Suspense child:

```tsx
export default function ProductsPage(props: PageProps<"/products">) {
  return (
    <>
      <h1>Shop</h1>                                  {/* static shell */}
      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductResults searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}

async function ProductResults({ searchParams }) {
  const { filters, page } = parseSearchParams(await searchParams);  // await HERE
  const result = await listProducts(filters, page, 8);              // `use cache`
  ...
}
```

Build output confirms it: `◐ /products` — partially prerendered, static shell
plus streamed results.

**A consequence of this pattern:** the page never sees the filter values, so it
cannot pass them as a `<Suspense key>`. React reuses the subtree across filter
changes and the fallback does not re-fire. Loading feedback comes from
`useTransition` in the filter bar instead, which dims the live results rather
than replacing them with skeletons — better UX anyway.

Two separate boundaries are used, not one: the filter bar suspends because
`useSearchParams()` does, the results suspend because the fetch does. Keeping
them apart means re-filtering never blanks out the controls you are using.

### Verified filtering

| URL | Result |
| --- | --- |
| `/products` | 8 cards (page size) |
| `?category=audio` | 3 |
| `?q=keyboard` | 2 |
| `?category=audio&q=earbuds` | 1 |
| `?sort=price-asc` | first card $79.00 |
| `?sort=price-desc` | first card $899.00 |
| `?sort='; --` | 200, silently falls back to `newest` |
| `?page=-5` | clamped to page 1 of 2 |

URL input is validated against known sets — an unrecognised value degrades to
the default and never reaches the data layer.

---

## 8. Redirects — and a bug worth remembering

### The bug: `permanentRedirect()` in a page does not send a 308

`/legacy/[...path]` started as a `page.tsx` calling `permanentRedirect()`. It
worked in a browser. `curl` told a different story:

```
HTTP/1.1 200 OK
x-nextjs-postponed: 1
…NEXT_REDIRECT in the streamed body
```

Under PPR the static shell is flushed before the component runs, which fixes
the status line at 200. The redirect degrades to a **client-side** redirect in
the RSC payload. A browser follows it — so the bug is invisible to manual
testing — but a crawler that does not run JavaScript sees a 200. The entire
purpose of a 308 is telling crawlers to transfer ranking, so this silently
defeats a URL migration.

This is the same root cause as the `notFound()` 200-cold/404-warm behaviour
documented in Topic 1: **once streaming starts, the status code is fixed.**

**Fix:** it is now a `route.ts`. A route handler has no shell and no streaming
— it returns a `Response`, so it controls the status line directly.

| Where | Status | Use when |
| --- | --- | --- |
| `next.config.ts` `redirects()` | 308 / 307 | Static rule, no lookup. Cheapest — runs before rendering |
| Route handler | Any | Target needs a database lookup |
| `proxy.ts` | Any | Must apply across many routes (Topic 10) |
| **Rendered page** | **200 ⚠️** | **Never, for SEO-critical redirects** |

### Verified

```
/old-shop                        308 -> /products                      (config)
/item/glide-ergonomic-mouse      308 -> /products/glide-ergonomic-mouse (config, :slug)
/collections/audio               307 -> /shop/audio                     (config, :path*)
/legacy/p/pulse-wireless-earbuds 308 -> /products/pulse-wireless-earbuds (handler + lookup)
/legacy/c/displays               308 -> /categories/displays            (handler)
/legacy/p/no-such-product        308 -> /products                       (lookup failed, safe landing)
/legacy                          404                                    (required catch-all)
```

`permanent: true` sends 308, `false` sends 307. Get it wrong and browsers cache
a 308 more or less forever.

### Rewrites

A rewrite proxies internally — the address bar does not change.
`/feed/products.json` serves `/api/products`: verified 200, JSON body, URL
unchanged.

---

## 9. Route handlers

```ts
export async function GET(
  _request: Request,
  context: RouteContext<"/api/products/[slug]">,
) {
  const { slug } = await context.params;   // Promise in v16
}
```

- `RouteContext<"/path">` is generated by `next typegen`, same family as
  `PageProps` / `LayoutProps`.
- Supported: `GET POST PUT PATCH DELETE HEAD OPTIONS`.
- A folder cannot hold both `route.ts` and `page.tsx` — both would own the URL.
- Under `cacheComponents`, **GET handlers are dynamic by default** (changed in
  v15; they used to be cached). Build output shows `ƒ /api/products`.
- No Suspense concerns: Suspense is a rendering concept and there is no
  component tree here.

**They get real status codes.** `/api/products/nope` returns a true `404` —
none of the PPR streaming caveats apply, because nothing is streamed.

---

## 10. `loading.tsx`

> **Update from [Topic 12](12-ai-agent-integration.md):** this file was later
> REMOVED. Shell inspection showed `products/loading.tsx` also wraps the
> `[slug]` child route, so the product page prerendered 11 skeletons and
> streamed its own name and price. The listing already had its own `<Suspense>`
> boundaries, so the file added nothing there. Removing it put the product
> name and price into the static shell. The explanation below still describes
> how `loading.tsx` behaves.

Sugar for a Suspense boundary: Next wraps `page.tsx` and its children with it
automatically. It does **not** wrap the segment's `layout.tsx` or
`template.tsx` — which is why the shop sub-nav stays on screen while the
product grid loads.

It coexists with the explicit `<Suspense>` boundaries inside the page: this one
covers the route during navigation, those cover individual slow sections, and
the innermost boundary wins for any given subtree.

---

## 11. Client navigation hooks

All from `next/navigation` (**never** `next/router` — that is the Pages Router).

| Hook | Used in | Note |
| --- | --- | --- |
| `usePathname()` | `shop-nav.tsx` | Returns path **without** query, so `/products?sort=rating` still highlights "All products" |
| `useRouter()` | `product-filters.tsx`, `pagination.tsx` | `.replace()` for filters (no history spam), `.push()` for pages |
| `useSearchParams()` | both | **Requires a `<Suspense>` boundary** — it suspends during prerender |
| `useTransition()` | `product-filters.tsx` | `isPending` dims results instead of freezing |

Two details that are easy to get wrong:

- **Preserve the query string.** Pagination clones the existing
  `URLSearchParams` and sets only `page`. Building `?page=2` from scratch would
  silently wipe the user's active filters.
- **Reset `page` on filter change.** Changing a filter while on page 3 would
  otherwise land on an empty page.

---

## 12. `typedRoutes` caught three real bugs — and has one real gap

`typedRoutes: true` type-checks every `<Link href>` and `router.push()` against
a generated union of real routes. It failed the build on genuine mistakes.

**The gap:** an optional catch-all does not generate its own bare path. The
generated type is

```ts
| `/shop/${OptionalCatchAllSlug<T>}`   // ../../src/app/(shop)/shop/[[...filters]]/page.tsx
```

which demands a trailing segment, so the literal `"/shop"` is rejected — even
though the route matches it at runtime. The build output proves the route is
real: `○ /shop` is prerendered.

Runtime-assembled URLs (`${pathname}?${query}`) are unverifiable by definition
and hit the same wall.

Rather than scatter `as Route` casts, both cases go through one named helper,
`dynamicRoute()` in `src/lib/routes.ts`, so `grep dynamicRoute` finds every
unchecked URL in the codebase.

**Also learned:** route-group layouts get no entry in the generated
`LayoutRoutes` union — it contains only `"/"`. `(shop)/layout.tsx` therefore
takes a plain `{ children }` prop; borrowing `LayoutProps<"/">` would compile
but wrongly advertise the root's `modal` slot.

---

## 13. `instant = false`

`/legacy/[...path]` as a page failed the build:

```
Error: Next.js encountered uncached or runtime data during prerendering.
```

Legacy paths are arbitrary, so there is no `generateStaticParams` to enumerate
them. The usual fixes did not apply — no UI to stream, and the result must not
be cached because it depends on the incoming path.

`export const instant = false` declares "this segment is allowed to block."
Requires `cacheComponents`; illegal in Client Components.

In the end the route became a handler for the 308 reason above, so the export
is gone — but the escape hatch is the right tool when a page genuinely must
block.

**Related gotcha:** an intercepting route needs its **own**
`generateStaticParams`. It does not inherit the one on the route it intercepts,
and without it the build fails the same way.

---

## 14. Verified

- `npm run build` — ✅ 47 pages
- `npm run typecheck` / `lint` / `format:check` — ✅ clean
- 9 page routes, 7 redirects, 1 rewrite, 3 route handlers — all asserted above
- Modal interception, hard-nav fallback, and both dismiss paths — browser-verified
- Filtering, sorting, pagination and malformed-input handling — asserted above

---

## Next

**Topic 3 — Pages Router:** `pages/` alongside `app/`, `getServerSideProps` /
`getStaticProps`, `next/router` vs `next/navigation`, and what actually happens
when both routers coexist in one project.
