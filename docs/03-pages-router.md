# Topic 3 — Pages Router

The Pages Router running **alongside** the App Router in the same application,
serving the same catalogue under `/classic/*`. Built as a migration scenario,
because that is the only reason to write Pages Router code in 2026.

---

## 1. What was added

```
src/pages/
├── _app.tsx                     wraps every page — global CSS, fonts, chrome
├── _document.tsx                <html>/<body> shell, server-only, renders once
├── 404.tsx  500.tsx             static error pages
├── classic/
│   ├── index.tsx                getStaticProps              → SSG
│   ├── live.tsx                 getServerSideProps          → SSR
│   └── products/
│       ├── index.tsx            getStaticProps + revalidate → ISR
│       └── [slug].tsx           getStaticPaths + getStaticProps
└── api/
    └── classic-products.ts      NextApiRequest/NextApiResponse
```

Build output lists them in a **separate table**, with their own rendering
markers:

```
Route (pages)                           Revalidate  Expire
├ ○ /404                                                     static
├ ƒ /api/classic-products                                    dynamic
├ ● /classic                                                 SSG
├ ƒ /classic/live                                            SSR
├ ● /classic/products                          15m      1y   ISR
└   /classic/products/[slug]                   15m      1y
  ├ ● /classic/products/aurora-over-ear-headphones
  └ … 4 of 12 prerendered; the rest on demand
```

---

## 2. The blocker: `server-only` stops at the router boundary

The first attempt imported the existing App Router repository from
`getStaticProps`. It fails the build:

```
Error: You're importing a module that depends on "server-only". This API is
only available in Server Components in the App Router, but you are using it in
the Pages Router.
```

`"use cache"`, `cacheLife()` and `cacheTag()` are equally off-limits — Cache
Components is an App Router feature and `cacheComponents: true` simply does not
apply to `pages/` routes.

**This forced a real architectural change**, and it is the most useful thing in
this topic. The data layer is now split three ways:

```
features/catalog/
├── lib/queries.ts              pure logic — NO server-only, NO use cache
│                               ← imported by BOTH routers
├── server/catalog-repository.ts  App Router: adds server-only + use cache
│                                 + cacheLife + cacheTag
└── (pages call lib/queries directly, adding `revalidate` for ISR)
```

One implementation of "which products are in Audio", two caching strategies
layered on top. The alternative — duplicating the filter/sort logic — would
guarantee the two halves drift apart.

Verified they agree: `/api/products?category=audio` and
`/api/classic-products?category=audio` both return `total=3`.

Omitting `server-only` from `queries.ts` is safe: Next strips
`getStaticProps`/`getServerSideProps` and any imports used only by them out of
the client bundle, so the seed data never reaches the browser.

---

## 3. Rendering models, measured

| | `/classic/products` (ISR) | `/classic/live` (SSR) |
| --- | --- | --- |
| Data function | `getStaticProps` + `revalidate: 900` | `getServerSideProps` |
| Runs | build, then ≤1×/15min | **every request** |
| Build marker | `●` | `ƒ` |

Each page stamps a timestamp. Three consecutive requests:

```
ISR  2026-11-18T06:39:42.467Z   ← identical
     2026-11-18T06:39:42.467Z
     2026-11-18T06:39:42.467Z

SSR  2026-11-18T06:40:09.119Z   ← moves every request
     2026-11-18T06:40:09.453Z
     2026-11-18T06:40:09.783Z
```

`getServerSideProps` also reads live request state — `?sort=price-asc` and a
custom `User-Agent` both surfaced correctly from `context.query` and
`context.req.headers`.

### ISR vs Cache Components

Both set 15 minutes, deliberately, so they can be compared:

| | `revalidate` (pages) | `cacheLife` (app) |
| --- | --- | --- |
| Granularity | whole page | per function |
| Invalidation | time only | time **or** `revalidateTag()` |
| Partial staleness | impossible — all or nothing | one section can revalidate alone |
| Default expire | 1y | 1d (our `catalog` profile) |

The Pages Router cannot express "this page is static except for this one
slow widget". That gap is the entire reason Partial Prerendering exists.

---

## 4. Bug found: `fallback: true` breaks 404s permanently

`getStaticPaths` prerenders only 4 of 12 slugs, so `fallback` actually matters.
It was `fallback: true` first. Measured against a production server:

```
/classic/products/does-not-exist  ->  200   (cold)
/classic/products/does-not-exist  ->  200   (warm — every single time)
```

The response body was the loading skeleton, with `isFallback` in the payload.

**Why:** `fallback: true` commits a `200` and ships placeholder HTML *before*
`getStaticProps` runs. By the time it returns `{ notFound: true }` the status
line is already sent, so the 404 happens **client-side**. The result is a
permanent soft 404 — strictly worse than the App Router's PPR behaviour from
Topic 1, which at least settles on a real 404 once cached.

**Fix:** `fallback: 'blocking'`. It holds the response until `getStaticProps`
resolves, so `notFound` still controls the status line.

```
known slug (prerendered)   200
known slug (on demand)     200   ← still generated at request time
unknown slug  COLD         404
unknown slug  warm ×3      404 404 404
```

Note the second row: `'blocking'` does **not** sacrifice on-demand generation.
The only real cost is the lost placeholder — and with it `router.isFallback`,
which cannot be demonstrated under `'blocking'` at all.

| `fallback` | Unknown slug | On-demand gen | `isFallback` |
| --- | --- | --- | --- |
| `false` | real 404 | ❌ | ❌ |
| `true` | **200 forever ⚠️** | ✅ | ✅ |
| `'blocking'` | real 404 | ✅ | ❌ |

A consequence worth internalising: under `fallback: true` the component renders
once with `product` **undefined**, despite the inferred props type claiming
otherwise, so a `router.isFallback` guard is mandatory or the page throws. The
App Router has no equivalent failure mode — an async Server Component awaits
its data before rendering anything.

### Status codes: the Pages Router wins here

| Scenario | Pages Router | App Router (PPR) |
| --- | --- | --- |
| Unknown slug, cold | **404** | 200 (soft 404 + `noindex`) |
| Unknown slug, warm | **404** | 404 |
| Redirect from a page | n/a | 200 + client-side redirect (Topic 2) |

Nothing is streamed ahead of a Pages Router response, so the status line is
still open when the data function returns. That is the one place the older
model is simply more correct — worth remembering before assuming newer is
better across the board.

---

## 5. Side effect: `pages/` changed App Router types

Adding `src/pages/` broke the **App Router** build with 12 type errors:

```
src/components/layout/shop-nav.tsx(36,37): error TS18047: 'pathname' is possibly 'null'.
src/features/catalog/components/product-filters.tsx(39,25): error TS18047: 'searchParams' is possibly 'null'.
```

Nothing in `app/` was touched. With both routers present, Next widens
`usePathname()` to `string | null` and `useSearchParams()` to
`ReadonlyURLSearchParams | null`, because an App Router hook rendered under the
Pages Router returns `null`.

The null branches are unreachable in these components — they only ever render
in `app/` — but the types are now honest about a scenario that genuinely
exists in a mixed codebase. Fixed with explicit fallbacks rather than `!`.

**Budget for this when planning a migration.** Adding one `pages/` file can
produce type errors across an App Router codebase that is otherwise untouched.

---

## 6. `_app.tsx` and `_document.tsx`

| | `_document.tsx` | `_app.tsx` |
| --- | --- | --- |
| Renders | server only, once | every page render |
| Hooks / effects | ❌ | ✅ |
| Owns | `<html>`, `<body>` | shared chrome, providers, CSS |
| App Router equivalent | `layout.tsx` (partly) | `layout.tsx` (partly) |

Two rules that are build errors if broken:

- **Global CSS can only be imported from `_app.tsx`.** Anywhere else fails.
  The App Router has no such restriction.
- **`next/font` goes in `_app.tsx`, not `_document.tsx`** — the generated
  className has to reach a component that re-renders.

Three different `Head`-ish things, easy to confuse:

| Import | Scope |
| --- | --- |
| `next/document` → `<Head>` | document-wide, `_document.tsx` only |
| `next/head` → `<Head>` | per page, Pages Router |
| `export const metadata` | App Router only — does not exist here |

The stylesheet is **shared** with the App Router (`@/app/globals.css`), so
`bg-surface` means the same thing on both sides — visible in the screenshot,
where the Pages Router pages are indistinguishable in styling.

### The structural gap

`_app.tsx` is a single **flat** wrapper. There is no nesting, so "this section
has its own sub-layout" must be hand-rolled (typically a per-page `getLayout`
function). The App Router gets nested layouts from the folder structure for
free — which is exactly what `(shop)/layout.tsx` does in Topic 2.

---

## 7. Two routers, two API conventions

| | `pages/api/*.ts` | `app/api/*/route.ts` |
| --- | --- | --- |
| Export | one default handler | one function per verb |
| Request | `NextApiRequest` (Node) | `Request` (Web standard) |
| Response | `res.status().json()` | `return Response.json()` |
| Method routing | manual `if (req.method…)` | by export name |
| Body parsing | automatic | `await request.json()` |

Manual method dispatch is a real footgun: forget the check and `POST` silently
falls through to the `GET` branch. Ours returns `405` with the spec-required
`Allow` header — verified: `POST /api/classic-products` → `405`, `Allow: GET`.

The Web-standard version is why App Router handlers run unchanged on edge
runtimes; `NextApiRequest` extends Node's `IncomingMessage` and is tied to Node.

---

## 8. Navigation: the hooks are not interchangeable

| | `next/router` (pages) | `next/navigation` (app) |
| --- | --- | --- |
| Shape | one object: `pathname`, `query`, `asPath`, `isReady`, `isFallback` | split: `usePathname()`, `useSearchParams()`, `useParams()` |
| `push`/`replace` | return Promises | do not |
| Wrong router | throws "NextRouter was not mounted" | returns null / misbehaves |

`router.pathname` is the route **pattern** (`/classic/products/[slug]`);
`router.asPath` is the actual URL. The nav compares against `pathname` so the
parent tab stays active on detail pages.

### `next/compat/router` for shared components

The documented escape hatch for a component that must render under both: it
returns `null` instead of throwing when no Pages router is mounted, so the null
check doubles as router detection.

`RouterBadge` renders in **both** headers from one file. Verified in the HTML:

```
on /         → "next/compat/router returned null — App Router"       badge: app/
on /classic  → "next/compat/router returned a router — Pages Router" badge: pages/ · /classic
```

### Cross-router navigation is always a hard load

Proven by planting `window.__navProbe` and navigating:

| Navigation | Probe survived? | Means |
| --- | --- | --- |
| `/classic/products` → `/classic/live` (`<Link>`) | ✅ yes | soft, client-side |
| `/classic` → `/` (plain `<a>`) | ❌ **no** | full document reload |

There is no client-side routing across the boundary. The docs are explicit:

> there will be a hard navigation. Automatic link prefetching with `next/link`
> will not prefetch across routers.

Note the second sentence — it is still correct to use `<Link>` for that link.
It costs no wasted prefetch, because Next declines to prefetch across the
boundary, and a raw `<a>` behaves identically while tripping
`@next/next/no-html-link-for-pages`. (This project used `<a>` at first on the
assumption that `<Link>` would prefetch a payload the Pages Router could not
consume. The docs say otherwise.)

**Migration consequence:** every App↔Pages transition costs a full page load.
Migrate in whole user journeys, not scattered pages, or users pay that cost
repeatedly.

---

## 9. What `cacheComponents: true` does and does not touch

It stayed enabled throughout and caused **no conflict**. It simply does not
apply to `pages/`:

| | `app/` | `pages/` |
| --- | --- | --- |
| Cache Components / PPR | ✅ | ❌ not available |
| `use cache` / `cacheLife` / `cacheTag` | ✅ | ❌ build error |
| `server-only` | ✅ | ❌ build error |
| ISR | via `cacheLife` | via `revalidate` |
| Turbopack | ✅ | ✅ |
| `next/image`, `next/font`, `next/link` | ✅ | ✅ identical |
| `new Date()` during render | ❌ `blocking-prerender-current-time` | ✅ allowed |

That last row is a neat summary of the philosophies: the App Router refuses to
bake a non-deterministic value into a prerender; the Pages Router lets you,
and lets you ship a stale timestamp.

---

## 10. Verified

- `npm run build` — ✅ both route tables, 47 app + 8 pages entries
- `npm run typecheck` / `lint` / `format:check` — ✅ clean
- ISR stable across 3 requests; SSR changes across 3 — ✅ asserted
- `fallback: 'blocking'` 404s cold **and** warm — ✅ asserted
- On-demand generation of non-prerendered slugs — ✅ 200
- `405 + Allow: GET` on wrong method — ✅
- Both API routers return identical data — ✅ `total=3`
- `next/compat/router` reports correctly from both — ✅
- Soft nav within pages / hard nav across routers — ✅ probe-verified
- All App Router routes still 200 — ✅

---

## Next

**Topic 4 — Server & Client Components:** the `"use client"` boundary, what
actually crosses it, serialisation rules, composition patterns (passing Server
Components as `children` into Client Components), and measuring what really
ends up in the browser bundle.
