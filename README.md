# Nexus Store — a Next.js 16 reference storefront

A production-shaped e-commerce storefront built to learn **Next.js 16** one
topic at a time. Each topic adds a real feature to the same app rather than an
isolated demo, so every piece has to coexist with the others the way it would
in production.

Every topic has a write-up in [`docs/`](docs/) recording what was
**measured**, not just what was built. That includes the bugs found along the
way and the places where v16 contradicts what most tutorials (and most AI
models) still assume.

![Next.js](https://img.shields.io/badge/Next.js-16.4.6-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19.3-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss&logoColor=white)
![Node](https://img.shields.io/badge/Node-%E2%89%A520.9-5fa04e?logo=nodedotjs&logoColor=white)

---

## Highlights

- **Partial Prerendering on every route.** `cacheComponents` is on, so each
  page ships a static shell with dynamic parts streamed in. Uses
  `"use cache"`, `"use cache: private"`, custom `cacheLife` profiles and
  `cacheTag` / `updateTag`.
- **Both routers in one app.** The App Router storefront plus a Pages Router
  copy under `/classic` (SSG, SSR, ISR), built as a migration scenario.
- **Real mutations.** A cookie-backed cart and a validated review form, using
  Server Actions, `useActionState` and `useOptimistic`.
- **`proxy.ts`**, the v16 replacement for `middleware.ts`, enforcing layered
  authorisation with real `307` / `403` status codes.
- **Security headers.** CSP, HSTS and Permissions-Policy, with each trade-off
  written down.
- **SEO.** Generated sitemap and robots, per-product OG images with
  `next/og`, JSON-LD and canonical URLs.
- **Modern tooling.** Turbopack (the v16 default), React Compiler,
  `typedRoutes`, Tailwind v4 CSS-first config and Zod-validated environment
  variables.
- **Instant-navigation tests.** Playwright with `@next/playwright`'s
  `instant()`, run against a production build.

## Tech stack

| Layer     | Choice                                                    |
| --------- | --------------------------------------------------------- |
| Framework | Next.js 16.4.6 (App Router + Pages Router), Turbopack     |
| UI        | React 19.3, React Compiler, Tailwind CSS v4, lucide-react |
| Language  | TypeScript 5 (`strict`), Zod v4                           |
| Testing   | Playwright + `@next/playwright`                           |
| Quality   | ESLint 9, Prettier (with Tailwind class sorting)          |

## Curriculum

| #   | Topic                                                                      | What it adds to the store                                                                               |
| --- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 01  | [Project Setup & Architecture](docs/01-project-setup-and-architecture.md)  | Folder structure, validated env vars, `cacheComponents`, a cached data layer                            |
| 02  | [Routing (App Router)](docs/02-routing-app-router.md)                      | Route groups, catch-all segments, quick-view modal (parallel + intercepting routes), `searchParams` filtering |
| 03  | [Pages Router](docs/03-pages-router.md)                                    | `/classic/*` running alongside the App Router: SSG, SSR, ISR, API routes                                |
| 04  | [Server & Client Components](docs/04-server-and-client-components.md)      | Cart and reviews UI with only four `"use client"` files, verified against the client bundle             |
| 05  | [Cache Components & Caching](docs/05-cache-components.md)                  | A `"use cache: private"` cart badge, `cacheTag` scoping, `updateTag` vs `revalidateTag`                 |
| 06  | [Data Fetching & Mutations](docs/06-data-fetching-and-mutations.md)        | Cookie cart and review form with Server Actions and optimistic UI                                       |
| 07  | [Styling & UI](docs/07-styling-and-ui.md)                                  | Tailwind v4 `@theme` tokens, flash-free dark mode, CSS Modules alongside utilities                      |
| 08  | [Performance](docs/08-performance.md)                                      | React Compiler A/B test, `next/image` `preload`, `next/dynamic`, Web Vitals                             |
| 09  | [Turbopack](docs/09-turbopack.md)                                          | Turbopack vs webpack benchmarks, filesystem cache, a working `--webpack` fallback                       |
| 10  | [Proxy, Security & Middleware](docs/10-proxy-security-middleware.md)       | `proxy.ts`, layered auth with real status codes, CSP and security headers                               |
| 11  | [SEO & Metadata](docs/11-seo-and-metadata.md)                              | Sitemap, robots, OG images, JSON-LD, canonical URLs                                                     |
| 12  | [AI & Agent Integration](docs/12-ai-agent-integration.md)                  | `AGENTS.md` with bundled version-matched docs, `instant()` tests, agent-readable errors                 |
| 13  | Hands-On Implementation                                                    | 🚧 Up next                                                                                              |

## Getting started

**Prerequisites:** Node.js **20.9 or later** (Next.js 16 dropped Node 18) and
npm.

```bash
git clone https://github.com/rushi-kantaria-simform/Next-16-Demo.git
cd Next-16-Demo
npm install
cp .env.example .env.local
npm run dev
```

Then open <http://localhost:3000>.

> [!IMPORTANT]
> Copying `.env.example` to `.env.local` is required. `NEXT_PUBLIC_SITE_URL`
> has no default, and [`src/lib/env.ts`](src/lib/env.ts) validates every
> variable at startup and throws if one is missing or malformed.

To run a production build locally:

```bash
npm run build
npm run start
```

### Environment variables

| Variable               | Default            | Purpose                                                                                |
| ---------------------- | ------------------ | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | _(required)_       | Canonical origin for `metadataBase`, the sitemap, robots and OG image URLs             |
| `CATALOG_SOURCE`       | `memory`           | Where catalogue data comes from. Only `memory` (the in-repo seed data) exists for now  |
| `CATALOG_LATENCY_MS`   | `0` (`300` in the example) | Artificial read latency so Suspense and streaming are visible in development  |

`NEXT_PUBLIC_*` values are inlined into the browser bundle, so never put a
secret in one.

## Scripts

| Command                   | What it does                                                         |
| ------------------------- | -------------------------------------------------------------------- |
| `npm run dev`             | Dev server (Turbopack is the default, no flag needed)                |
| `npm run build`           | Production build                                                     |
| `npm run start`           | Serve the production build                                           |
| `npm run check`           | Typecheck, lint and format check in one go                           |
| `npm run typecheck`       | `tsc --noEmit`                                                       |
| `npm run lint`            | ESLint (`next lint` was removed in v16). `lint:fix` to auto-fix      |
| `npm run format`          | Prettier with Tailwind class sorting. `format:check` to verify only  |
| `npm run typegen`         | Generate route types with `next typegen`                             |
| `npm run test:e2e`        | Production build with the testing API, then the Playwright suite    |
| `npm run clean`           | Delete `.next`                                                       |

## Things to try

With the dev server running:

| Go to                                                                | What it shows                                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [`/products?category=audio&sort=price-asc`](http://localhost:3000/products?category=audio&sort=price-asc) | `searchParams` filtering inside `<Suspense>`, without losing the static shell     |
| [`/shop/audio/sort-price-asc`](http://localhost:3000/shop/audio/sort-price-asc) | The same filters as SEO-friendly path segments (optional catch-all route)         |
| Click a product card on `/products`                                  | Quick-view modal from parallel + intercepting routes. Reload for the full page     |
| [`/products/aurora-over-ear-headphones`](http://localhost:3000/products/aurora-over-ear-headphones) | Product page with add-to-cart, a review form and JSON-LD                          |
| [`/cart`](http://localhost:3000/cart)                                | Cookie-backed cart with optimistic updates                                        |
| [`/account/admin`](http://localhost:3000/account/admin)              | `307` to `/signin` when signed out, `403` as a customer, allowed as an admin       |
| [`/classic`](http://localhost:3000/classic)                          | The same catalogue served by the Pages Router                                     |
| [`/feed/products.json`](http://localhost:3000/feed/products.json)    | A rewrite onto the `/api/products` route handler                                  |
| [`/old-shop`](http://localhost:3000/old-shop)                        | A config-level `308` redirect                                                     |
| [`/sitemap.xml`](http://localhost:3000/sitemap.xml), [`/robots.txt`](http://localhost:3000/robots.txt) | Both generated from the catalogue, so they cannot drift                           |

## Project structure

```text
src/
├── app/                 Routing only: a file here is a URL
│   ├── (marketing)/     /  and  /about
│   ├── (shop)/          /products, /categories, /shop, /cart
│   ├── @modal/          Parallel slot for the product quick-view
│   ├── account/         Protected routes, forbidden.tsx, unauthorized.tsx
│   ├── api/             Route handlers
│   └── …                sitemap.ts, robots.ts, opengraph-image.tsx
├── pages/               Pages Router: /classic/* and /api/classic-products
├── features/            Domain modules: catalog, cart, reviews, auth
│   └── <feature>/
│       ├── components/
│       ├── lib/         Pure, router-neutral logic
│       └── server/      "server-only" + "use cache", App Router only
├── components/          Shared UI and layout components
├── config/              Site config and navigation
├── lib/                 Env validation, typed-route helpers, utilities
└── proxy.ts             The v16 replacement for middleware.ts
docs/                    One write-up per curriculum topic
e2e/                     Playwright instant-navigation suite
```

## Architecture in brief

- **`src/app/` is a routing table, not a code directory.** Anything that is
  not a route lives in `features/`, `components/`, `lib/` or `config/`.
- **Data access is layered on purpose:**
  - `features/catalog/lib/queries.ts` is pure and router-neutral. The App
    Router, the Pages Router and `sitemap.ts` all import it.
  - `features/*/server/*.ts` use `import "server-only"` plus `"use cache"`.
    They are App Router only; importing one from `pages/` is a build error.
- **Pages compose; they do not fetch directly.** They call a repository.
- **Request-time data stays out of the static shell.** With `cacheComponents`
  on, reading `cookies()`, `headers()` or `searchParams` outside `<Suspense>`
  or `"use cache"` is a build error.
- **Status codes are decided in `proxy.ts`.** Once a PPR response starts
  streaming its status is fixed, so `notFound()` or `redirect()` during render
  produce a `200`. The proxy runs before rendering and can still send a real
  `307` or `403`.

[Topic 1](docs/01-project-setup-and-architecture.md) and
[AGENTS.md](AGENTS.md) cover the reasoning in full.

## Testing

```bash
npx playwright install chromium   # first run only
npm run test:e2e
```

The suite builds the app with `EXPOSE_TESTING_API=1`, serves it with
`next start` on port 3999, and uses `instant()` to check what each page's
static shell contains. For example, a product's name and price must be in the
shell, while its reviews and the cookie-dependent cart lines must not.

It runs against a production build on purpose: `next dev` does not prerender
the way a build does, and the static shell is exactly what is under test.

Before calling a change done, run both:

```bash
npm run check   # typecheck + lint + format check
npm run build   # the real arbiter: tsc alone misses prerender errors
```

## Working with AI coding agents

[`AGENTS.md`](AGENTS.md) is the entry point for any coding agent, and is worth
reading as a human too. `next dev` keeps a managed block at the top that points
agents at the version-matched docs bundled in `node_modules/next/dist/docs/`.
Below it are the project's rules and a table of confident v16 assumptions that
turned out to be wrong. [Topic 12](docs/12-ai-agent-integration.md) explains
the setup.

## Known limitations

This is a learning reference, not a store to deploy. These shortcuts are
deliberate and documented:

- **Auth is a role switcher, not authentication.** The session is an unsigned
  JSON cookie, so anyone can forge the admin role. It exists to show _where_
  authorisation is enforced.
  ([Topic 10](docs/10-proxy-security-middleware.md#7-honest-limitation-the-session-is-not-real))
- **Reviews are stored in memory.** They reset on restart and are not shared
  between server instances. The cart is cookie-backed and does not have this
  problem.
  ([Topic 6](docs/06-data-fetching-and-mutations.md#8-honest-limitation-the-review-store))
- **The CSP allows `'unsafe-inline'` scripts.** Nonce-based CSP is
  incompatible with Partial Prerendering, which every route here uses.
  ([Topic 10](docs/10-proxy-security-middleware.md#5-csp-nonces-are-incompatible-with-this-architecture))
- **`npm audit` reports high-severity advisories.** They all trace back to
  one `picomatch` ReDoS in the ESLint dev toolchain. No patched release exists,
  npm's suggested fix downgrades to v14 tooling, and none of it reaches
  production.
  ([Topic 1](docs/01-project-setup-and-architecture.md#known-issue-14-high-severity-npm-advisories))
