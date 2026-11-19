<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!--
  Everything BELOW this point is project-authored.

  Next.js rewrites only the content between its own markers above and
  preserves the rest of this file, so this section is safe from `next dev`.
-->

## What this project is

A Next.js 16 storefront built as a working reference, one curriculum topic at
a time. Each topic adds a real feature to the same app rather than an isolated
demo. Write-ups live in `docs/NN-*.md` and are the fastest way to understand a
decision — they record what was measured, not just what was built.

## Verify against the bundled docs, not from memory

The managed block above is not boilerplate. Checking
`node_modules/next/dist/docs/` first is what caught each of these, every one of
which contradicted a confident initial assumption:

| Assumption | Reality in v16 |
| --- | --- |
| `optimizePackageImports` is a top-level config key | lives under `experimental` (and is a no-op for `lucide-react`) |
| `dynamicParams = false` fixes soft 404s | rejected outright when `cacheComponents` is on |
| `priority` on `<Image>` is current | deprecated → `preload`, and wrong for grids regardless |
| `params` is a plain object in OG image files | a **Promise**; v15 code yields `undefined` silently |
| `@custom-variant` and `@variant` are aliases | different directives — one defines, one applies |
| `server-only` modules work in `getStaticProps` | hard build error in the Pages Router |

Useful entry points:

- `01-app/02-guides/upgrading/version-16.md` — breaking changes
- `01-app/03-api-reference/05-config/01-next-config-js/` — one file per valid
  config key. `ls` it before using a key you have not verified.
- `01-app/03-api-reference/03-file-conventions/` — file conventions

## Architecture rules

- **`src/app/` is a routing table, not a code directory.** Anything that is
  not a route belongs in `features/`, `components/`, `lib/` or `config/`.
- **Data access is layered on purpose:**
  - `features/catalog/lib/queries.ts` — pure, router-neutral. Both routers
    import it.
  - `features/*/server/*.ts` — `import "server-only"` plus `use cache`.
    App Router only; importing it from `pages/` is a build error.
- **Pages compose, they do not fetch directly.** Call a repository.
- **Never widen a server module's reach to fix an import error.** The error is
  usually correct about the boundary.

## Non-obvious constraints that will bite

- **`cacheComponents` is on.** Reading `cookies()`, `headers()`,
  `searchParams` or doing an uncached `fetch` is a BUILD ERROR unless it is
  inside `<Suspense>` or behind `"use cache"`.
- **Never `await searchParams` in a page function.** Pass the Promise down to
  a child inside `<Suspense>`, or the whole route goes dynamic and the static
  shell is lost.
- **`Date.now()` / `Math.random()` break prerendering** — but are fine inside
  a Server Action, which only ever runs at request time.
- **Status codes cannot change once streaming starts.** `notFound()`,
  `redirect()`, `forbidden()` and `unauthorized()` called during a PPR render
  produce a `200`. If the status matters, act in `src/proxy.ts`, which runs
  before rendering.
- **`middleware.ts` does not exist here.** It is `src/proxy.ts` in v16.
- **`typedRoutes` is on.** Runtime-built URLs go through `dynamicRoute()` in
  `src/lib/routes.ts` — `grep dynamicRoute` finds every unchecked URL.
- **Tailwind v4 has no config file.** Tokens live in `src/app/globals.css`
  under `@theme`. Tailwind only emits utilities it has *seen* in source, so
  dynamically built class names are never generated.

## Before you call it done

```bash
npm run check     # typecheck + lint + format:check
npm run build     # the real arbiter — typecheck alone misses prerender errors
```

A passing `tsc` does not mean a passing build. Most of the genuinely
interesting failures in this project — blocking prerenders, incompatible
config, Satori font resolution — only surface during `next build`.

For anything user-visible, verify it in a browser. Several bugs here built
cleanly, type-checked, and were still wrong: a "Full details" link that did
nothing, an OG image with an invisible glyph, a `<br />` that never broke.
