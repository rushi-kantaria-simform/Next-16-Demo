# Topic 7 — Styling & UI

Tailwind v4's CSS-first API, a class-based dark mode with no flash, and CSS
Modules living alongside utilities. One genuine bug found along the way.

---

## 1. Bug: the scaffolded Turbopack rule silently breaks CSS Modules

The highest-value finding in this topic, and it is invisible until you add your
first `.module.css`.

`create-next-app` generates this in `next.config.ts`:

```ts
turbopack: {
  rules: {
    "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
  },
},
```

That glob matches `size-guide.module.css` too. The file goes through the
Tailwind loader instead of Next's CSS Modules pipeline, so the imported
`styles` object comes back **empty** — every `styles.foo` is `undefined`, every
`className` renders as `""`, and the component loses all styling with **no
error, no warning, and a passing build**.

Bisected against a production build:

| Config | Tailwind | CSS Modules |
| --- | --- | --- |
| rule as scaffolded | ✅ `position: sticky` | ❌ class = `""`, padding `0px` |
| rule removed | ❌ `position: static` | ✅ `lVj4LG_table`, padding `10px 16px` |
| **rule + `condition`** | ✅ | ✅ |

The fix uses Turbopack's documented boolean condition syntax:

```ts
"*.css": {
  condition: { not: { path: "*.module.css" } },
  loaders: ["@tailwindcss/turbopack"],
  as: "*.css",
},
```

A negative-lookbehind RegExp is the obvious alternative and does not work —
Turbopack matches with Rust's `regex` crate, which has no lookbehind.

---

## 2. Dark mode without a flash

### Redefining the `dark:` variant

Tailwind's built-in `dark:` is a `prefers-color-scheme` media query, which a
user cannot override. Pointing it at a class instead:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Two directives that look alike and are **not** aliases:

| Directive | Does |
| --- | --- |
| `@custom-variant` | **defines** a variant |
| `@variant` | **applies** one inside a rule |

`:where()` holds specificity at 0, so `.dark` never out-ranks a utility.

### The token structure

There is deliberately **no** `@media (prefers-color-scheme: dark)` block left.
The inline script always resolves to an explicit `light` or `dark` class, so a
media query could only fight with it. One source of truth:

```css
:root { color-scheme: light;  --surface: oklch(1 0 0);     … }
.dark { color-scheme: dark;   --surface: oklch(0.17 …);    … }
```

`color-scheme` is the part people miss — without it, scrollbars and native form
controls stay stubbornly light inside a dark page.

### Why not a cookie?

A cookie is the right answer for the cart badge. It is the wrong answer here.

Reading one means `await cookies()` in the **root layout**, and the root layout
cannot sit inside `<Suspense>` — it *is* the shell. Under `cacheComponents`
that makes every route request-rendered and destroys the static shell app-wide.
The cart badge gets away with it because it has its own Suspense boundary;
`<html className>` has nowhere to put one.

### Why not `useEffect`?

An effect runs after hydration: light paints, then snaps dark. That is the
flash-of-incorrect-theme everyone recognises.

So: a **synchronous, render-blocking inline script in `<head>`**. It runs
before first paint, the HTML stays fully static, and `suppressHydrationWarning`
on `<html>` acknowledges the mismatch it creates on purpose.

**Verified in a browser:**

| Check | Result |
| --- | --- |
| Initial (nothing stored) | `class="… light"`, "System" checked |
| Click Dark | `class="… dark"`, `colorScheme: dark`, `localStorage=dark` |
| **Reload** | `dark` present immediately — **no flash** |
| Script location | in `<head>`, blocking (no `defer`/`async`) |

### `useSyncExternalStore`, not `useState` + `useEffect`

The toggle reads localStorage. The obvious implementation trips
`react-hooks/set-state-in-effect`, and the rule is right: it renders once with
the wrong value and immediately again with the right one.

`useSyncExternalStore` is built for exactly this. Its separate
`getServerSnapshot` makes server and first client render agree *by
construction*, and subscribing to a `storage` event syncs other tabs for free.

```ts
const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
```

Design detail: **"system" is the absence of a stored value**, not a stored
`"system"`. That keeps the inline script trivial — a stored value is an
explicit override, nothing stored means defer to the OS.

---

## 3. Custom utilities with `@utility`

`@utility` is v4's replacement for v3's `addUtilities` plugin API. Unlike a
plain CSS class, it joins Tailwind's cascade layer and composes with every
variant (`hover:`, `md:`, `dark:`, `@container`).

Both examples are things Tailwind does **not** ship — reimplementing
`line-clamp` would demonstrate nothing.

**Static** — used on the shop nav:

```css
@utility scrollbar-none {
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
}
```

**Functional** — reads its numeric suffix, so every size works without
enumeration:

```css
@utility grid-fit-* {
  display: grid;
  grid-template-columns: repeat(
    auto-fit, minmax(min(--spacing(--value(integer)), 100%), 1fr)
  );
}
```

`grid-fit-64` replaced `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` on the home
categories — column count now follows available width with **no breakpoints at
all**. Verified: computed `grid-template-columns: 300.5px 300.5px`.

> **Gotcha that cost me a test:** Tailwind only emits a utility it has *seen*
> in scanned source. My first verification injected `clamp-3` via JS and found
> nothing generated — correct behaviour, bad test. Class names built
> dynamically (`` `grid-fit-${n}` ``) never get generated.

---

## 4. CSS Modules alongside Tailwind

Tailwind covers the ~95% that is composition. A CSS Module earns its place for:

- complex selectors (`tbody tr:nth-child(odd)`, sibling combinators)
- multi-step keyframes
- styling markup you do not control

`size-guide.module.css` uses all of the above, and critically still reads from
the **same `@theme` tokens** (`var(--color-line)`), so it stays on the design
system instead of drifting into hardcoded hexes.

### Container queries

```css
.wrapper { container-type: inline-size; }

@container (min-width: 30rem) {
  .table th, .table td { padding: 0.625rem 1rem; }
}
```

`@container` responds to the **parent's** width, not the viewport's. That is
the distinction that matters for a component rendered in both a wide detail
page and a narrow modal — a `md:` breakpoint reads the viewport and gets the
modal case wrong every time.

Verified: `container-type: inline-size`, `th` padding `10px 16px`, zebra
striping all applied once the Turbopack rule was fixed.

---

## 5. Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Not decoration — vestibular disorders make large transforms genuinely
unpleasant. `0.01ms` rather than `none` so `transitionend` / `animationend`
listeners still fire and nothing hangs waiting for them.

---

## 6. Verified

- CSS Modules + Tailwind coexisting — ✅ after the `condition` fix
- Dark mode toggle, persistence, no-flash reload — ✅ browser-verified
- `scrollbar-none` → `scrollbar-width: none` — ✅
- `grid-fit-64` → `auto-fit` columns — ✅
- Container query → `container-type: inline-size` — ✅
- `build` / `typecheck` / `lint` / `format:check` — ✅ clean
- 16/16 routes still 200 — ✅

---

## Related

- **[Topic 8 — Performance](08-performance.md):** what this CSS and JS costs.
- **[Topic 9 — Turbopack](09-turbopack.md):** the loader pipeline the bug lived in.
