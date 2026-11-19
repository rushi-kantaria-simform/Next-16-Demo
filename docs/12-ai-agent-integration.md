# Topic 12 — AI & Agent Integration (v16)

This topic is not what the title suggests. In Next.js 16, "AI integration"
means **the framework's support for AI coding agents working on your
codebase** — not building AI features into your app. It is the subject of
`02-guides/ai-agents.md` and the `agentRules` / `agentFeedback` /
`agentUpgrade` config keys.

Scope chosen: v16 agent tooling only. No model calls, no API key.

---

## 1. The feature this project was already using

Next 16.2+ ships **version-matched documentation** at
`node_modules/next/dist/docs/`, mirroring the structure of the docs site.
`agentRules` (on by default) writes a managed block into `AGENTS.md` pointing
agents at it.

That block is the highest-leverage thing in this topic, and this project is
the evidence. Every topic here was built by reading those bundled docs first,
and each of the following contradicted a confident initial assumption:

| Assumption | Reality in v16 | Caught in |
| --- | --- | --- |
| `optimizePackageImports` is top-level | under `experimental`, and a no-op for `lucide-react` | 1 |
| `dynamicParams = false` fixes soft 404s | rejected outright under `cacheComponents` | 1 |
| `server-only` works in `getStaticProps` | hard build error in the Pages Router | 3 |
| `priority` on `<Image>` is current | deprecated → `preload`, and wrong for grids anyway | 8 |
| `@custom-variant` ≡ `@variant` | different directives | 7 |
| `params` is an object in OG image files | a **Promise**; v15 code yields `undefined` silently | 11 |
| nonce-based CSP is just best practice | incompatible with PPR | 10 |

Training data for any model predates v16. The bundled docs do not.

Worth noting the docs state a measured result: bundled documentation scored a
**100% pass rate** in Vercel's agent evals versus up to 79% for Skill-based
retrieval. Always-available context beat on-demand lookup.

---

## 2. Configuration

```ts
agentRules: true,                 // top-level, on by default — set explicitly
logging: { browserToTerminal: "warn" },

experimental: {
  agentUpgrade: "security",       // default; see below
  exposeTestingApiInProductionBuild: process.env.EXPOSE_TESTING_API === "1",
  // agentFeedback deliberately NOT enabled
},
```

**`logging.browserToTerminal`** forwards browser console output to the
`next dev` terminal. Without it a client-side error exists only in devtools —
invisible to anything reading terminal output, whether an agent or CI.
`'warn'` (warnings + errors) rather than `true` (everything), because
forwarding every `console.log` drowns the signal.

**`agentUpgrade: "security"`** is the default and kept on purpose. It speaks
up only for real security advisories; `'latest'` nags about every minor, which
trains you to dismiss the prompt — worse than no prompt. It never upgrades
anything by itself.

**`agentFeedback` is NOT enabled.** It authorises an agent to prepare
anonymised Next.js issue reports and open a review form in your browser before
its final response. Experimental, off by default, requires telemetry, does not
run in CI. Opening browser windows as a side effect of a build is an opt-in
the project owner should make knowingly.

### `AGENTS.md`

Next rewrites only the content between its own markers and preserves the rest,
so project-specific guidance lives safely below the managed block. Ours now
carries the architecture rules, the non-obvious constraints that bite
(status codes fixed once streaming starts; never `await searchParams` in a
page function; `middleware.ts` is `proxy.ts`), and a "before you call it done"
section.

The last point matters most: **a passing `tsc` does not mean a passing
build.** Most of the genuinely interesting failures in this project —
blocking prerenders, incompatible config, Satori font resolution — surface
only during `next build`.

---

## 3. The MCP server — documented, not installed

`next-devtools-mcp` connects an agent to the running dev server. Through
`nextjs_call` it reaches the tools Next exposes at `/_next/mcp`:

| Tool | Does |
| --- | --- |
| `get_errors` | current error state with source-mapped stacks |
| `get_routes` | all routes, grouped by router type |
| `get_compilation_issues` | module-graph errors without a browser session |
| `compile_route` | compile one route without an HTTP request |
| `get_server_action_by_id` | map an action ID back to its source file |
| `get_logs` | path to the dev log (browser + server) |
| `get_page_metadata` | what contributed to the current render |
| `get_request_insights` | request timelines, needs `experimental.requestInsights` |

The compilation tools are the point: an agent can check whether code compiles
**without running `next build`**, which on this project is a 4–5 second round
trip every time.

To enable it, add `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

> **Not created by this topic, on purpose.** Writing that file registers a
> third-party MCP server into the coding agent's own startup configuration —
> a tool the agent then loads and executes. That is a decision for the project
> owner to make explicitly, not something to be added as a side effect of a
> curriculum task. The snippet above is everything needed; it is one file.

---

## 4. `instant()` tests — and a real optimisation they found

`@next/playwright` ships an `instant()` helper that scopes assertions to the
UI available immediately on navigation. It is the only tool here that can
*verify* the architecture claim the previous eleven topics rest on: "the shell
is static, only X streams."

That claim is invisible to `tsc`, invisible to lint, and broken by moving a
single `await` above a `<Suspense>` boundary.

### Two tools, two guarantees

Two drafts got this wrong before it worked:

**Draft 1** expressed "not in the shell" as `toHaveCount(0)` inside
`instant()`. All three tests failed — not because the shells were wrong, but
because this app's dynamic sections resolve from in-memory data in
single-digit milliseconds, so the streamed HTML arrived inside Playwright's
assertion window. The assertion was racing the network: flaky, not meaningful.

**Draft 2** read the prerendered `.html` and asserted on the whole file. Also
wrong — Next writes the shell **and** the resolved streamed payload into the
same file. The streamed part is appended inside `<div hidden id="S:n">` and
swapped in by a `$RC(...)` script.

**Draft 3** splits at that marker. Deterministic, no timing:

```ts
const streamStart = html.indexOf('<div hidden id="S:');
return streamStart === -1 ? html : html.slice(0, streamStart);
```

So: `instant()` asserts shell UI reaches the browser; shell inspection asserts
the exact prerendered bytes.

### What it found

Inspecting the real shell showed `/products/[slug]` prerendering **11 skeleton
placeholders** and streaming the product itself — despite
`generateStaticParams` prerendering every slug.

Cause: `(shop)/products/loading.tsx` wraps the `[slug]` child route as well as
the listing. The listing already had its own `<Suspense>` boundaries, so
`loading.tsx` added nothing there while costing the detail page its shell.

Removing it, measured on the built output:

| `/products/[slug]` shell | with `loading.tsx` | without |
| --- | --- | --- |
| Shell size | 13,315 B | 16,452 B |
| Product name in body | ✗ (head only) | **✓** |
| `$249.00` price | ✗ | **✓** |
| Skeleton placeholders | 11 | 5 (reviews only) |
| Reviews leaked into shell | 0 | **0** ✓ |

`/products` listing: unchanged (12,345 → 12,328 B, same chrome, still no
products in the shell).

Net result: the product name and price now arrive in the static shell — a real
LCP improvement on the most-linked page type in the app — with reviews still
correctly streaming. Found by tooling, not by reading the code.

Run with `npm run test:e2e`. **7/7 pass.**

```
EXPOSE_TESTING_API=1 next build && playwright test
```

The flag must be set at BUILD time; setting it for `next start` alone does not
add the API to an already-built app. Tests run against a production build, not
`next dev` — dev does not do PPR the way a real build does, and the shell is
exactly what is under test.

---

## 5. Agent-readable errors

With `cacheComponents` on, blocking errors print labelled fixes with their
trade-offs, in the terminal and in `next build` output:

```
Ways to fix this:
  - [stream] Provide a placeholder with <Suspense fallback={...}>
  - [cache]  Cache the data access with "use cache"
  - [block]  Set `export const instant = false` to allow a blocking route
```

This project hit that menu repeatedly — in Topic 2 (`/legacy` catch-all) and
Topic 4 (intercepting route without its own `generateStaticParams`) — and the
`[block]` option is exactly what resolved the first. The dev overlay adds a
**Copy prompt** button that packages the chosen fix into a paste-ready prompt.

`next build --debug-prerender` enables server source maps and keeps checking
other routes after the first failure, instead of stopping.

---

## 6. Official Skills

Framework *knowledge* comes from the bundled docs; Skills cover multi-step
*workflows*:

| Skill | Purpose |
| --- | --- |
| `next-dev-loop` | inspect/edit/verify against a running dev server |
| `next-bundle-optimizer` | find large client bundles (v16.4) |
| `next-cache-components-adoption` | migrate an app onto Cache Components |
| `next-cache-components-optimizer` | expand a route's static shell |
| `next-partial-prefetching-adoption` | move onto Partial Prefetching |
| `next-partial-prefetching-optimizer` | tune what is prefetched per link |

```bash
npx skills add vercel/next.js --skill next-dev-loop
```

Not installed here — this project adopted Cache Components and Partial
Prefetching from Topic 1 rather than migrating onto them, so the adoption
Skills have nothing to do. `next-cache-components-optimizer` is the one worth
running next; §4 did its job manually for one route.

---

## 7. Verified

- `npm run test:e2e` — ✅ 7/7
- Shell measurements before/after — ✅ table in §4
- `build` / `typecheck` / `lint` / `format:check` — ✅ clean
- Full route regression — ✅ 24/24
- `agentRules`, `logging.browserToTerminal`, `agentUpgrade` configured — ✅
- `AGENTS.md` extended below the managed markers — ✅

---

## Related

- **[Topic 2](02-routing-app-router.md)** — `loading.tsx`, added there and
  removed here once measured.
- **[Topic 5](05-cache-components.md)** — the shell claims these tests verify.
- **[Topic 8](08-performance.md)** — the other measured-not-asserted topic.
