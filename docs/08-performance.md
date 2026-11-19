# Topic 8 — Performance Optimization

Everything here is measured against this project, not quoted. Two of the
results contradict the common assumption.

---

## 1. React Compiler costs build time and bundle size

`reactCompiler` is **top-level** in v16 (promoted out of `experimental`) and
needs a peer dependency:

```bash
npm i -D babel-plugin-react-compiler   # build fails without it
```

It was left off through Topics 1–6 deliberately so it could be A/B'd. Same
code, same commit, only the flag toggled:

| | Compiler **off** | Compiler **on** | Δ |
| --- | --- | --- | --- |
| Compile | 3.9s | 4.6s | **+18%** |
| Wall | 11.19s | 13.06s | +17% |
| Client bundle | 1235.3 KB | 1249.8 KB | **+14.5 KB** |
| Chunk count | 40 | 40 | — |

**The compiler makes builds slower and bundles bigger.** That is not a
regression — it is what auto-memoisation *is*. It injects memo caches into
component code, which is more bytes and more work at build time. The payoff is
runtime: fewer re-renders, paid for in build seconds and ~1.2% of bundle.

Worth stating plainly because "React Compiler" sounds like an optimisation that
shrinks things. It does not. It is a **runtime** optimisation with a build-time
and bundle-size cost, and whether that trade is worth it depends on how
re-render-heavy your UI actually is.

> My first measurement was confounded — I enabled the compiler and added
> features in the same step, showing +34.6 KB. Re-running with only the flag
> toggled isolated the real figure at +14.5 KB.

---

## 2. `priority` is deprecated — and the obvious migration is wrong

v16 deprecates `<Image priority>` in favour of `preload`. A straight rename
would have been a bug, because the docs are explicit:

> **When not to use it:** when you have multiple images that could be
> considered the LCP element depending on the viewport.

A responsive product grid is exactly that. Preloading four candidates via
`<link>` in `<head>` makes them compete, and the real LCP image arrives
*later*, not sooner. The documented alternative is
`loading="eager"` + `fetchPriority="high"` — skip lazy-loading, hint
importance, no head-of-queue preload.

So the migration split by context:

| Where | Before | After | Why |
| --- | --- | --- | --- |
| Product grid (4 cards) | `priority={i<4}` | `loading="eager"` + `fetchPriority="high"` | multiple LCP candidates |
| Product detail hero | `priority` | `preload` | single unambiguous LCP |
| Classic detail hero | `priority` | `preload` | single unambiguous LCP |
| Cart thumbnails, modal | — | neither | below fold / post-interaction |

**Verified in the built HTML:**

| Page | `<link rel=preload as=image>` | First `<img>` |
| --- | --- | --- |
| `/products` (grid) | **0** | `loading="eager"` `fetchpriority="high"` |
| `/products/[slug]` (hero) | **1** | — |

My original blanket `priority={index < 4}` was wrong on its own terms, before
the deprecation entered into it.

---

## 3. Code splitting with `next/dynamic`

The specification panel is a Client Component most visitors never expand —
exactly the profile worth splitting.

```tsx
const SizeGuide = dynamic(
  () => import("./size-guide").then((mod) => mod.SizeGuide),
  { loading: () => <div className="h-40 animate-pulse …" /> },
);
```

Two things that are easy to get wrong:

1. **The import must be a literal arrow returning `import(...)`.** The bundler
   reads that call statically to create the chunk; build the specifier from a
   variable and nothing splits.
2. **`ssr: false` is only legal inside a Client Component.** From a Server
   Component it is a build error. Omitted here on purpose — the table is real
   content, so letting it server-render when expanded keeps it crawlable.

Also: mount on demand (`{open && <SizeGuide />}`), not render-and-hide. `hidden`
still downloads and executes the chunk, defeating the split entirely.

**Verified at runtime:**

| Check | Result |
| --- | --- |
| Panel content in main entry chunks | **0 occurrences** |
| Dedicated chunk size | 4 KB |
| Content present before expand | no |
| Chunks fetched on expand | **2** |
| Content present after expand | yes |

---

## 4. Web Vitals

```tsx
import { useReportWebVitals } from "next/web-vitals";   // not next/navigation
```

Works identically in both routers (Pages Router calls it from `_app.tsx`). The
callback fires **once per metric as each becomes available** — TTFB and FCP
early, LCP when the largest element settles, CLS and INP only when the page is
hidden. It is not one batched report.

`<WebVitals />` renders `null`: it exists purely so a hook can run, and is a
Client Component only because hooks do not exist on the server. Logging is
gated to development so real users never pay for console noise; in production
this would POST to an analytics endpoint.

Using `metric.rating` ("good" / "needs-improvement" / "poor") rather than
hardcoded thresholds means the buckets track Google's definitions instead of
drifting.

---

## 5. Server-side performance already in place

Earlier topics did most of the real work, and it is worth naming:

| Technique | Where | Effect |
| --- | --- | --- |
| Partial Prerendering | every route | static shell served instantly, dynamic streams |
| `use cache` + `cacheLife` | catalogue, reviews | repeat renders skip the data layer |
| `use cache: private` | cart badge | per-user data without a shared-cache leak |
| Suspense boundaries | lists, reviews, cart | slow section never blocks the page |
| Server Components | ~95% of the tree | 0 KB of component JS |
| `server-only` | data layer | catalogue cannot reach the browser |

Measured in Topic 4: the entire catalogue, product ids and cookie name appear
in **0 of 38 client chunks**.

---

## 6. Config keys considered

| Key | Decision |
| --- | --- |
| `reactCompiler` | **on** — costs documented above |
| `optimizePackageImports` | **not set** — lives under `experimental`, and `lucide-react` is optimised by default (Topic 1) |
| `experimental.inlineCss` | **off** — inlines CSS into `<head>`, helping first-time visitors and hurting repeat ones. No data here to justify either way |
| `experimental.staleTimes` | **default** — tuning client-cache retention needs real navigation data |
| `productionBrowserSourceMaps` | **off** — slower builds, larger output, debugging-only |
| `supportsImmutableAssets` | **not set** — adapter-owned, not an app concern |

The last four are left at defaults deliberately. Changing a performance knob
without a measurement is guessing, and this topic is about measuring.

---

## 7. Verified

- React Compiler A/B isolated to a single flag — ✅ +18% build, +14.5 KB
- Image strategy per context — ✅ 1 preload on hero, 0 on grid
- `next/dynamic` split — ✅ 4 KB chunk, fetched only on expand
- Web Vitals reporting — ✅ wired, dev-gated
- `build` / `typecheck` / `lint` / `format:check` — ✅ clean
- 16/16 routes 200 — ✅

---

## Related

- **[Topic 9 — Turbopack](09-turbopack.md):** build-time numbers in full.
- **[Topic 4](04-server-and-client-components.md):** the bundle measurements.
