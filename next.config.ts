import type { NextConfig } from "next";

/**
 * Next.js 16 configuration.
 *
 * Every option here is a top-level key in v16 — `experimental.cacheComponents`,
 * `experimental.ppr` and `experimental.dynamicIO` were all promoted/removed in
 * the v16 release, so nothing below lives under `experimental` anymore.
 */
/**
 * Which bundler is this build using?
 *
 * Turbopack is the default in v16; `--webpack` opts out. Detecting that from
 * `process.argv` does NOT work, and the failure is subtle: next.config.ts is
 * evaluated TWICE — once in the CLI process, where argv is
 * `[node, next, build, --webpack]`, and again inside a jest-worker child where
 * argv is just `[node, processChild.js]`. The worker therefore sees no flag,
 * re-enables the Turbopack-only options, and the build still fails.
 *
 * `process.env.TURBOPACK` is set to "auto" by the CLI and inherited by child
 * processes, so it reports the same answer in both.
 */
const USING_TURBOPACK = Boolean(process.env.TURBOPACK);

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  /**
   * The headline v16 feature. Turns on Partial Prerendering by default and
   * unlocks the `use cache` directive, `cacheLife()` and `cacheTag()`.
   *
   * The trade-off: reading request-time data (`cookies()`, `headers()`,
   * `searchParams`, an uncached `fetch`) is now a BUILD ERROR unless it is
   * either wrapped in <Suspense> or placed behind `use cache`.
   * See docs/01-project-setup-and-architecture.md for the full rule.
   */
  cacheComponents: true,

  /**
   * Requires `cacheComponents`. Changes <Link> prefetching from "whole route"
   * to "App Shell only" — the static shell plus session data. URL-dependent
   * content (searchParams) is opted out unless you ask for `prefetch={true}`.
   */
  partialPrefetching: true,

  /**
   * Generates a union of every real route in the app and type-checks
   * `<Link href>` / `router.push()` against it. A typo in a URL becomes a
   * compile error instead of a 404 in production.
   */
  typedRoutes: true,

  reactStrictMode: true,

  /** Don't advertise the framework/version to every visitor. */
  poweredByHeader: false,

  /**
   * AI CODING AGENT SUPPORT (v16).
   *
   * `agentRules` is ON BY DEFAULT and set explicitly here to document it.
   * When `next dev` detects a coding agent it writes a managed block into
   * AGENTS.md pointing at `node_modules/next/dist/docs/` — the
   * version-matched docs bundled with the installed Next.
   *
   * That block is the single highest-leverage feature in this topic. Every
   * topic in this project was built by reading those bundled docs first,
   * which is how the build caught that `optimizePackageImports` lives under
   * `experimental`, that `dynamicParams` is rejected under `cacheComponents`,
   * and that `params` became a Promise in OG image files. Training data for
   * any model predates v16; the bundled docs do not.
   *
   * Next rewrites ONLY the content between its markers and preserves the rest
   * of the file, so project-specific guidance can live safely alongside it.
   */
  agentRules: true,

  /**
   * Forward browser console output to the `next dev` terminal.
   *
   * Without this, a client-side error lives only in devtools — invisible to
   * anything reading terminal output, whether that is an agent or CI. With
   * it, the logs an agent already reads carry the client-side failures it is
   * being asked to fix.
   *
   * `'warn'` (warnings + errors) rather than `true` (everything): forwarding
   * every `console.log` drowns the signal.
   */
  logging: {
    browserToTerminal: "warn",
  },

  /**
   * React Compiler — TOP-LEVEL in v16 (promoted out of `experimental`).
   *
   * It auto-memoises components and hooks, so most hand-written `useMemo`,
   * `useCallback` and `React.memo` become unnecessary. Requires the
   * `babel-plugin-react-compiler` dev dependency to be installed; without it
   * the build fails.
   *
   * Left off during Topics 1–6 deliberately so its effect could be measured
   * against a known baseline — see docs/08-performance.md.
   */
  reactCompiler: true,

  turbopack: {
    rules: {
      /**
       * Hand the Tailwind loader every stylesheet EXCEPT CSS Modules.
       *
       * The `condition` is not optional polish — it fixes a real bug. The rule
       * create-next-app generates is a bare `"*.css"`, and that glob also
       * matches `*.module.css`. Routing a CSS Module through the Tailwind
       * loader bypasses Next's CSS Modules pipeline, so the imported `styles`
       * object comes back EMPTY: every `styles.foo` is undefined, every
       * className renders as "", and the component silently loses all styling.
       *
       * Verified by bisection against a production build:
       *   rule as scaffolded -> Tailwind OK, CSS Modules broken (empty classes)
       *   rule removed       -> CSS Modules OK, Tailwind broken (no utilities)
       *   rule + condition    -> both work
       *
       * `{ not: { path: "*.module.css" } }` uses Turbopack's documented
       * boolean condition syntax. A negative-lookbehind RegExp would be the
       * obvious alternative, but Turbopack matches with Rust's `regex` crate,
       * which has no lookbehind.
       */
      "*.css": {
        condition: {
          not: { path: "*.module.css" },
        },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  experimental: {
    /**
     * Upgrade reminder policy for `next upgrade --agent`, shown during
     * `next dev` / `next build`.
     *
     * `'security'` is the default and is kept deliberately: it only speaks up
     * for actual security advisories. `'latest'` nags about every minor —
     * noise that trains you to ignore the prompt, which is worse than no
     * prompt. Other values: `false`, `'experimental-future'`.
     *
     * It never upgrades anything on its own; it only controls reminders.
     */
    agentUpgrade: "security",

    /**
     * Exposes the testing API needed by `instant()` from `@next/playwright`
     * against a PRODUCTION build. Enabled only when EXPOSE_TESTING_API=1, so
     * real production builds never ship it.
     *
     * `next dev` enables the testing API automatically, so this is purely for
     * running the instant-navigation suite against `next build`.
     *
     * Must be set at BUILD time — setting it for `next start` alone does not
     * add the API to an already-built app.
     */
    exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1",

    /**
     * NOT enabled: `agentFeedback`.
     *
     * It authorises an agent to prepare anonymised Next.js issue reports and
     * open a review form in your browser before its final response. It is
     * experimental, off by default, requires Next telemetry, and does not run
     * in CI. Opening browser windows as a side effect of a build is an opt-in
     * the project owner should make knowingly, so it is documented here
     * rather than switched on.
     */

    /**
     * Required for `forbidden()` and `unauthorized()` plus their
     * `forbidden.tsx` / `unauthorized.tsx` file conventions. Without this flag
     * the functions throw at runtime instead of rendering their boundary.
     */
    authInterrupts: true,

    /**
     * Turbopack-only options, gated so `--webpack` still works.
     *
     * Setting these unconditionally breaks the escape hatch outright:
     *
     *   $ next build --webpack
     *   Error: `experimental.turbopackRustReactCompiler` is only supported
     *   with Turbopack. Please remove the option or run Next.js with Turbopack.
     *
     * The build fails in 0.6s without compiling anything. That matters because
     * `--webpack` is the documented fallback for platforms with no Turbopack
     * native binding (FreeBSD, OpenBSD) and for webpack-only loader features.
     * A config that cannot fall back is a config with no escape hatch.
     */
    ...(USING_TURBOPACK
      ? {
          /**
           * Run the React Compiler through Turbopack's native Rust
           * implementation instead of shelling out to Babel. Same transform,
           * no JS toolchain in the hot path.
           */
          turbopackRustReactCompiler: true,

          /**
           * Defer compiling `next/dynamic` chunks until the browser actually
           * requests them. Dev-only; production compiles everything anyway.
           */
          turbopackLazyDynamicImports: true,
        }
      : {}),
  },

  images: {
    // Allow-list for remote images. `remotePatterns` is required — Next will
    // refuse to optimise a host that is not listed here.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  /**
   * Named cache profiles usable as `cacheLife("catalog")`. These sit alongside
   * the built-ins (`seconds`, `minutes`, `hours`, `days`, `max`, `default`).
   *
   *  stale      — how long the client may serve a cached value without asking
   *  revalidate — how long before the server refreshes it in the background
   *  expire     — hard ceiling; past this a request must block and refetch
   */
  cacheLife: {
    catalog: {
      stale: 60 * 5, // 5 minutes
      revalidate: 60 * 15, // 15 minutes
      expire: 60 * 60 * 24, // 1 day
    },
    pricing: {
      stale: 30,
      revalidate: 60,
      expire: 60 * 10,
    },
  },

  // Note: no `optimizePackageImports` here. It lives under `experimental`, and
  // `lucide-react` (plus date-fns, lodash-es and others) is on Next's
  // optimized-by-default list already — setting it would be a no-op.

  /**
   * Config-level redirects run BEFORE rendering, which makes them cheaper than
   * a page that calls `redirect()`. Use them for static rules; use a page (see
   * app/legacy/[...path]/page.tsx) when the target depends on a lookup.
   *
   * `permanent: true` sends 308, `false` sends 307. Getting this wrong is
   * costly: a 308 is cached by browsers and crawlers more or less forever.
   */
  async redirects() {
    return [
      {
        source: "/old-shop",
        destination: "/products",
        permanent: true, // 308
      },
      {
        // `:slug` captures one segment and is interpolated into the target.
        source: "/item/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
      {
        // `:path*` captures zero or more segments.
        source: "/collections/:path*",
        destination: "/shop/:path*",
        permanent: false, // 307 — still deciding on this URL shape
      },
    ];
  },

  /**
   * Rewrites proxy internally: the URL in the address bar does not change.
   * This exposes a tidy public path for the API without moving the handler.
   */
  async rewrites() {
    return [
      {
        source: "/feed/products.json",
        destination: "/api/products",
      },
    ];
  },

  /**
   * Security headers.
   *
   * These are STATIC, so they belong in config rather than proxy.ts: no
   * request context is needed and the config path is cheaper.
   */
  async headers() {
    return [
      {
        // Every route, including static assets.
        source: "/:path*",
        headers: [
          {
            /**
             * CSP WITHOUT A NONCE — a deliberate choice, not a shortcut.
             *
             * The strict pattern is a per-request nonce generated in proxy.ts.
             * It is incompatible with this app:
             *
             *   "Partial Prerendering (PPR) is incompatible with nonce-based
             *    CSP since static shell scripts won't have access to the
             *    nonce" — content-security-policy.md
             *
             * A nonce must be unique per response, so every page must render
             * per request: static optimisation off, ISR off, no CDN caching.
             * This project is PPR end to end (every route builds as `◐`), so
             * adopting nonces would mean discarding the entire caching
             * architecture of Topics 1–9 for one header.
             *
             * The documented alternative for non-nonce apps keeps
             * `'unsafe-inline'` for scripts. Honest trade-off: that is weaker
             * than a nonce against injected inline scripts. It is required
             * because Next's own bootstrap and RSC-payload scripts are inline
             * and vary per page, so they cannot be hashed ahead of time.
             *
             * `'unsafe-eval'` is dev-only — React's dev tooling needs it; it
             * must never ship to production.
             */
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              // picsum.photos is the catalogue image host; blob:/data: are
              // needed by next/image.
              "img-src 'self' blob: data: https://picsum.photos https://images.unsplash.com",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              // Stronger than X-Frame-Options and the modern equivalent.
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          {
            // Two years, and eligible for the browser preload list.
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Legacy clickjacking defence. `frame-ancestors` above supersedes
            // it, but old browsers only understand this one.
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            // Stops browsers guessing a MIME type and executing an upload as
            // script.
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Send the full URL same-origin, origin only cross-origin — so
            // internal paths never leak to third parties.
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            // Deny powerful APIs this storefront never uses.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },

  typescript: {
    // Never ship a build that does not type-check.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
