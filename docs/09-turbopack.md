# Topic 9 — Turbopack (v16 Default)

Turbopack is the default bundler in v16 — no `--turbopack` flag, no opt-in.
This topic measures it, configures it, and finds the two places it bites.

---

## 1. Measured: Turbopack vs webpack, same code

| | webpack (`--webpack`) | Turbopack cold | Turbopack warm |
| --- | --- | --- | --- |
| Compile | 7.3s | **3.7s** | **195ms** |
| Wall (incl. typecheck + 55 pages) | 20.36s | 10.69s | 6.27s |
| Client chunks | 1206.8 KB / **12 files** | 1250.4 KB / **40 files** | — |

Three things worth separating out:

**Cold compile is ~2× faster**, wall ~1.9×. Wall gains are smaller because
typecheck and static generation are not the bundler's work.

**Warm compile is ~37× faster than webpack** (195ms vs 7.3s) thanks to the
filesystem cache — see below.

**Turbopack emits more, smaller chunks**: 40 files vs 12, for 43.6 KB more in
total. That is not a regression. Finer granularity means a change invalidates
less of a returning visitor's cache, and the browser parallelises more
requests. Total bytes is the wrong metric to optimise alone.

---

## 2. The filesystem cache does the heavy lifting

Enabled by default in v16 (`turbopackFileSystemCacheForDev` since 16.1,
`…ForBuild` since 16.3). Measured on this project:

| Build | Compile |
| --- | --- |
| Cold (after `rm -rf .next`) | 4.0s |
| Warm #1 | 276ms |
| Warm #2 | 188ms |

**~21× faster**, for 51 MB on disk at `.next/cache/turbopack`.

The practical consequence: `rm -rf .next` is an expensive habit. It throws away
a cache worth ~20× on every subsequent build, and most of the time the cache is
not what is broken.

---

## 3. Config

```ts
turbopack: {
  rules: {
    "*.css": {
      condition: { not: { path: "*.module.css" } },
      loaders: ["@tailwindcss/turbopack"],
      as: "*.css",
    },
  },
},
```

Valid top-level keys: `rules`, `resolveAlias`, `resolveExtensions`, `root`,
`debugIds`. Nothing is needed for CSS, modern JS or JSX/TSX — those are
built in via Lightning CSS and SWC.

Glob semantics worth knowing: rules match on **file name** unless the pattern
contains a `/`, in which case they match the full project-relative path.
Turbopack uses a modified Rust `globset`.

### The `condition` fixes a real bug

The scaffolded rule is a bare `"*.css"`, which also matches `*.module.css` and
**silently breaks every CSS Module** — empty class names, no error, passing
build. Full bisection in
[Topic 7](07-styling-and-ui.md#1-bug-the-scaffolded-turbopack-rule-silently-breaks-css-modules).

A negative-lookbehind RegExp is the instinctive fix and does not work:
Turbopack matches with Rust's `regex` crate, which has no lookbehind. The
documented `{ not: … }` boolean condition is the right tool.

---

## 4. Turbopack-only options — and the escape hatch they break

```ts
experimental: {
  ...(USING_TURBOPACK ? {
    turbopackRustReactCompiler: true,   // Rust React Compiler, not Babel
    turbopackLazyDynamicImports: true,  // dev-only: compile dynamic chunks on demand
  } : {}),
}
```

Set unconditionally, these make `--webpack` **impossible**:

```
$ next build --webpack
Error: `experimental.turbopackRustReactCompiler` is only supported with
Turbopack. Please remove the option or run Next.js with Turbopack.
```

It fails in 0.6s without compiling anything. That matters because `--webpack`
is the documented fallback for platforms with no Turbopack native binding
(FreeBSD, OpenBSD) and for webpack-only loader features. **A config that cannot
fall back has no escape hatch.**

### Detecting the bundler: `process.argv` does not work

The obvious gate fails, and the failure is subtle:

```ts
const USING_WEBPACK = process.argv.includes("--webpack");   // ❌ broken
```

`next.config.ts` is evaluated **twice**. Probed directly:

```
CLI process:    ["node", "next", "build", "--webpack"]
worker process: ["node", ".../jest-worker/processChild.js"]
```

The worker sees no flag, re-enables the Turbopack options, and the build still
fails. Environment variables *do* propagate to child processes:

```ts
const USING_TURBOPACK = Boolean(process.env.TURBOPACK);   // ✅ "auto" with Turbopack, unset with --webpack
```

Verified: `next build --webpack` now completes in 7.3s instead of erroring.

---

## 5. Other `experimental.turbopack*` keys

| Key | Status | Verdict |
| --- | --- | --- |
| `turbopackFileSystemCacheForDev` / `…ForBuild` | stable, **on by default** | leave alone — this is the 21× |
| `turbopackRustReactCompiler` | experimental (16.3+) | **on** — needs `reactCompiler: true` |
| `turbopackLazyDynamicImports` | experimental (16.4+) | **on** — dev-only win |
| `turbopackChunking` | experimental | leave default; heuristics are well tuned |
| `turbopackGc` | experimental (16.4+) | niche — long-running dev sessions |
| `turbopackMemoryEviction` | experimental (16.3+) | `'auto'` default is sensible |
| `turbopackPluginRuntimeStrategy` | experimental (16.4+) | default `childProcesses` is safe |

---

## 6. Remaining limitations

| Limitation | Workaround |
| --- | --- |
| `sassOptions.functions` unsupported | `--webpack` |
| Loader `emitFile`, `importModule`, `loadModule` unsupported | `--webpack`, or move file generation out of the loader |
| Loader `fs` access partial (`readFile` only) | — |
| No native binding on FreeBSD / OpenBSD | `--webpack` or WASM (feature-limited) |
| Monorepo symlinks outside the root | set `turbopack.root` |

None applied to this project — Turbopack handled Tailwind v4, CSS Modules, the
React Compiler, both routers and 55 pages without a fallback.

---

## 7. Bundle inspection

There is **no built-in Turbopack bundle analyzer** in v16, and
`@next/bundle-analyzer` is webpack-oriented. What worked here was inspecting
the output directly:

```bash
du -sb .next/static/chunks            # total bytes
ls .next/static/chunks/*.js | wc -l   # granularity
grep -rl "<distinctive string>" .next/static/chunks/   # did X ship to the client?
```

That grep is genuinely useful, not a workaround — it is how Topic 4 proved the
catalogue reaches 0 of 38 client chunks, and how Topic 8 confirmed the
`next/dynamic` split landed in its own 4 KB chunk.

---

## 8. Verified

- webpack vs Turbopack, same code — ✅ numbers above
- Cold vs warm filesystem cache — ✅ 4.0s → 188ms
- `condition` fix for CSS Modules — ✅ both pipelines work
- `--webpack` restored by env-based gating — ✅ 7.3s build
- `build` / `typecheck` / `lint` / `format:check` — ✅ clean
- 16/16 routes 200 — ✅

---

## Related

- **[Topic 7](07-styling-and-ui.md):** the CSS Modules bug in full.
- **[Topic 8](08-performance.md):** React Compiler A/B, image strategy, splitting.
