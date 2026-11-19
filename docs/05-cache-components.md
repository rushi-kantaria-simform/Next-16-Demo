# Topic 5 — Cache Components & Caching (v16)

`cacheComponents: true` has been on since Topic 1. This topic uses the parts
that only matter once an app has per-user data and writes.

---

## 1. Three cache directives

| Directive | Runtime APIs (`cookies`/`headers`) | Server cache | In static shell | Used here for |
| --- | --- | --- | --- | --- |
| `"use cache"` | ❌ build error | ✅ shared | ✅ | catalogue, reviews |
| `"use cache: private"` | ✅ allowed | ❌ never | ❌ | cart badge |
| `"use cache: remote"` | ❌ | ✅ cross-instance | ✅ | not used (needs `cacheHandlers`) |

The distinction that matters: **`"use cache"` entries are shared between
users.** Reading `cookies()` inside one would serve one person's cart to
everyone, so Next makes it a hard error (`next-request-in-use-cache`) rather
than a security incident.

`"use cache: private"` is the escape hatch: it may read request APIs, and in
exchange it is **never written to a shared server cache**. The client router
holds the rendered output in browser memory for the `stale` window, and that
does not survive a reload.

---

## 2. The hard case: a cart badge in the global header

Per-user data in chrome that renders on every page is the problem
`cacheComponents` is most opinionated about. Three options were available:

| Approach | Verdict |
| --- | --- |
| `"use cache"` | **Illegal.** `cookies()` inside fails the build — and would leak carts between users if it didn't. |
| Uncached + `<Suspense>` | Legal and correct, but re-reads and re-renders on every navigation. |
| `"use cache: private"` | **Chosen.** Reads cookies legally, cached client-side for 30s, never shared. |

```tsx
export async function CartBadge() {
  "use cache: private";
  cacheLife({ stale: 30 });
  cacheTag("cart");

  const { itemCount } = await getCart();   // reads cookies() — legal here
  …
}
```

`stale: 30` is not arbitrary: the docs require **at least 30 seconds for
per-link prefetching** to include the content, and 5 minutes for App Shell
inclusion (wrong for a cart — a 5-minute-stale cart count is a bug).

### The Suspense boundary is mandatory

A private cache function is excluded from static-shell generation by
definition. Without a boundary, the header — and therefore every route that
renders it — fails the build with `blocking-prerender-dynamic`.

```tsx
<Suspense fallback={<CartBadgeSkeleton />}>
  <CartBadge />
</Suspense>
```

The fallback is a 36×36 box matching the real badge, so the header does not
shift when it streams in.

---

## 3. Measured consequence: the whole app left full-static

Adding one `use cache: private` component to the global header changed every
App Router route in the build output:

```
BEFORE                          AFTER
○ /                             ◐ /
○ /about                        ◐ /about
○ /categories          15m 1d   ◐ /categories           15m 1d
○ /shop                15m 1d   ◐ /shop                 15m 1d
○ /products/aurora…    15m 1d   ◐ /products/aurora…     15m 1d

○ Static                        ◐ Partial Prerender
```

**Every route lost `○` and became `◐`.** Nothing in those pages changed — the
cart badge lives in the root layout, so each one now has a request-time hole.

This is not a regression; it is PPR working. The static shell is still
prerendered and served instantly, and only the 36px badge streams per request.
But it is worth knowing before putting per-user data in global chrome: you are
trading whole-app static output for one dynamic element. If the badge were
moved into the cart page alone, the other routes would go back to `○`.

---

## 4. `cacheTag` scoping

Tags are the handles invalidation uses, and their granularity decides how much
work a write throws away.

| Function | Tag | Blast radius of an invalidation |
| --- | --- | --- |
| `getCategories()` | `categories` | all category data |
| `listProducts()` | `products` | catalogue listings |
| `getProductBySlug(s)` | `products`, `product:${s}` | one product, or all |
| `CartBadge` | `cart` | the current user's badge |
| `ReviewSection(slug)` | `reviews:${slug}` | **one product's reviews only** |

The review tag is per product on purpose. Posting a review on the mouse calls
`updateTag("reviews:glide-ergonomic-mouse")`; a blanket `"reviews"` tag would
discard every product's cached reviews on every write.

**Verified:** after posting a review on `glide-ergonomic-mouse`, the Aurora
product page still showed its own 2 seeded reviews (Priya, Daniel) and its own
`4.5 ★ · 2` stats — untouched.

---

## 5. `updateTag` vs `revalidateTag` — the v16 distinction

```ts
updateTag(tag)                 // immediate expiry. Server Actions ONLY.
revalidateTag(tag, 'max')      // stale-while-revalidate.
revalidateTag(tag)             // DEPRECATED in v16 — now takes a profile.
```

| | `updateTag` | `revalidateTag(tag, 'max')` |
| --- | --- | --- |
| Next read | blocks for fresh data | serves stale once, refreshes behind |
| Read-your-own-writes | ✅ | ❌ |
| Callable from | Server Actions only | Actions + Route Handlers |

Every mutation here uses **`updateTag`**, because both features demand
read-your-own-writes: click "Add to cart" and the badge must show the new count
*now*, not on the next navigation. `revalidateTag` would be right for something
like a nightly catalogue import, where a few seconds of staleness is invisible.

**Verified in a browser:**

| Action | Badge before | Badge after |
| --- | --- | --- |
| Add Aurora | `Cart, empty` | `Cart, 1 item` |
| Add Aurora again | `1` | `2` (one line, quantity 2 — not two lines) |
| Increase qty on `/cart` | `2` | `3`, subtotal `$747.00` |

And for reviews: submitting moved the list from 0 → 1 entries with the stats
badge updating to `5.0 ★ · 1`, in the same render.

---

## 6. `cacheLife` profiles in play

| Scope | Profile | Reasoning |
| --- | --- | --- |
| Catalogue | `"catalog"` (custom: stale 5m, revalidate 15m, expire 1d) | changes rarely, staleness harmless |
| Cart badge | `{ stale: 30 }` | minimum for prefetch; must feel current |
| Reviews | `"max"` | only a write changes it, and that write invalidates by tag — time-based expiry would be pointless recomputation |

`cacheLife("max")` paired with a precise `cacheTag` is the strongest
combination available: never expire on a timer, invalidate exactly when the
data actually changes.

---

## 7. Rules worth memorising

- `cookies()` / `headers()` / `searchParams` inside `"use cache"` →
  `next-request-in-use-cache`. Use `"use cache: private"`, or read outside and
  pass the value as an argument.
- `connection()` is **prohibited** inside *both* `"use cache"` and
  `"use cache: private"` — it is connection-specific and cannot be cached.
- `Date.now()` / `new Date()` / `Math.random()` / `crypto.randomUUID()` during
  prerender → `blocking-prerender-current-time` / `-random`. (Inside a **Server
  Action** they are fine; an action only ever runs at request time, which is why
  `crypto.randomUUID()` for review ids is legal.)
- Arguments to a cached function form its cache key, so they must be
  serialisable. `listProducts(filters)` works because `filters` is a plain
  object.
- Custom cache handlers cannot be configured for `"use cache: private"`.

---

## 8. Verified

- `npm run build` — ✅ clean; every app route now `◐`, documented above
- Cart badge streams inside Suspense; `httpOnly` cookie invisible to JS — ✅
- `updateTag("cart")` read-your-own-writes — ✅ browser-verified
- Per-product review tag isolation — ✅ browser-verified
- `npm run typecheck` / `lint` / `format:check` — ✅ clean

---

## Related

- **[Topic 4](04-server-and-client-components.md):** the boundary these caches
  sit behind.
- **[Topic 6](06-data-fetching-and-mutations.md):** the Server Actions that
  call `updateTag`.
