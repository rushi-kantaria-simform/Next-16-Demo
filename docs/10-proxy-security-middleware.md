# Topic 10 — Proxy, Security & Middleware

The v16 `middleware.ts` → `proxy.ts` rename, layered authorisation, and a CSP
decision that this project's architecture forced.

---

## 1. `middleware.ts` is deprecated — it is `proxy.ts` now

| | v15 | v16 |
| --- | --- | --- |
| File | `middleware.ts` | **`proxy.ts`** |
| Export | `middleware` / default | `proxy` / default |
| Runtime | Edge | **Node.js** (default since v16) |

Codemod: `npx @next/codemod@canary middleware-to-proxy .`

Location matters: it sits beside `app/` and `pages/`, so with a `src/` dir it
is **`src/proxy.ts`**, not the repo root. Build output confirms it loaded —
`ƒ Proxy (Middleware)` (the label still says Middleware).

**The Node runtime is the significant change.** Database clients, Node APIs
and real crypto all work now. Still off-limits: `"use cache"` and
`"use server"` directives, and `fetch` here ignores `cache` /
`next.revalidate` / `next.tags` — proxy runs before the rendering pipeline, so
none of that machinery exists yet.

### The matcher is not optional

Without one, proxy runs on **every** request — each static asset, image and
prefetch. The pattern here excludes Next internals and static file extensions:

```ts
matcher: [
  "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)",
]
```

---

## 2. Proxy fixes the status-code problem the last three topics kept hitting

This is the third appearance of one root cause, and proxy is the answer to it.

| Topic | Called during render | Status you get | Status you want |
| --- | --- | --- | --- |
| 1 | `notFound()` | 200 cold / 404 warm | 404 |
| 2 | `permanentRedirect()` | 200 + client-side redirect | 308 |
| 10 | `forbidden()` / `unauthorized()` | **200** | 403 / 401 |

Under PPR the static shell is flushed before the dynamic segment runs, which
commits the status line. Anything that wants to *change* the status has to act
before rendering starts — and that is exactly where proxy sits.

Measured before adding the proxy role check:

```
customer -> /account/admin   200   (forbidden UI rendered, wrong status)
tampered cookie -> /account  200   (401 UI rendered, wrong status)
```

After:

```
no session -> /account         307 -> /signin?from=%2Faccount
customer   -> /account         200
customer   -> /account/admin   403
admin      -> /account/admin   200
tampered   -> /account         307 -> /signin?from=%2Faccount
```

> **The UI was always correct.** Browser-verified: a customer on
> `/account/admin` sees only the 403 page — no admin content, no admin
> username. Only the HTTP status was wrong. That distinction matters: it was
> never a data leak, it was a monitoring, API-client and security-scanner
> problem.

---

## 3. Layered authorisation — and why both layers exist

```
proxy.ts   coarse, pre-render   correct status codes, cheap rejection
page       fine, authoritative  guarantees data never renders
```

Neither is sufficient alone:

- **Proxy alone is not a boundary.** It matches on a path *pattern*, and
  patterns are easy to get subtly wrong — a new route outside the matcher, a
  rewrite, a trailing-slash variant. Miss one and the page renders unguarded.
- **Page alone gets the status wrong**, per the table above.

So the admin check is deliberately duplicated. To stop the two drifting, both
import the **same parser**:

```
features/auth/schema.ts     zod schema + parseSession()   ← no server-only
features/auth/server/session.ts   cookies() wrapper        ← server-only
```

`schema.ts` deliberately omits `import "server-only"` — proxy is not a React
Server Component, and marking it would make it unimportable there, exactly as
it did for the Pages Router in Topic 3. Nothing secret lives in it: a schema
and a pure function.

**Verified:** a forged `{"user":"x","role":"superuser"}` cookie is rejected by
the schema at both layers and treated as signed-out → 307 to `/signin`.

---

## 4. 401 vs 403 — a distinction worth keeping

| | `unauthorized()` | `forbidden()` |
| --- | --- | --- |
| Status | 401 | 403 |
| Means | "I don't know who you are" | "I know, and no" |
| Boundary file | `unauthorized.tsx` | `forbidden.tsx` |
| Offers sign-in? | **yes** — it fixes the problem | **no** — it cannot |

Both require `experimental.authInterrupts: true`, and both inject
`<meta name="robots" content="noindex">`.

Collapsing them into one redirect-to-login produces the classic loop: a
customer hits an admin page, is sent to sign-in, signs in successfully, is sent
back, and bounces forever. `forbidden.tsx` therefore links to the account page
and the storefront — never to sign-in.

Role lives in the data, so the role check belongs where the data is read. The
proxy guards `/account/*` on session *presence*; the page decides on *role*.

---

## 5. CSP: nonces are incompatible with this architecture

The strict pattern is a per-request nonce generated in proxy. The docs rule it
out directly:

> "Partial Prerendering (PPR) is incompatible with nonce-based CSP since
> static shell scripts won't have access to the nonce"
> — content-security-policy.md

A nonce must be unique per response, so every page must render per request:
static optimisation off, ISR off, no CDN caching. **Every route in this project
builds as `◐`.** Adopting nonces would mean discarding the entire caching
architecture of Topics 1–9 for one header.

So the documented `## Without Nonces` approach is used instead — CSP set
statically in `next.config.ts`:

```
default-src 'self';
script-src 'self' 'unsafe-inline';   ← the honest cost
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https://picsum.photos …;
object-src 'none'; base-uri 'self'; form-action 'self';
frame-ancestors 'none'; upgrade-insecure-requests;
```

**`'unsafe-inline'` is weaker than a nonce against injected inline scripts.**
It is required because Next's own bootstrap and RSC-payload scripts are inline
and vary per page, so they cannot be hashed ahead of time. `'unsafe-eval'` is
added in development only — React's dev tooling needs it and it must never
ship.

That is a genuine trade-off, not a best practice. A site that needs strict CSP
more than it needs PPR should invert this decision.

### Headers, and where each belongs

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | see above |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `SAMEORIGIN` (legacy; `frame-ancestors` supersedes it) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |

All six verified present on `/`.

**Static headers belong in `next.config.ts`, not proxy.** They need no request
context and the config path is cheaper. Proxy only sets what genuinely varies
per request — here, `x-pathname`.

---

## 6. Server Action security (recap from Topic 6)

Next ships CSRF protection for actions by default: it compares `Origin`
against `Host` and rejects mismatches, caps bodies at 1 MB, encrypts action
IDs, and encrypts closure variables. Behind a proxy or CDN that rewrites
`Origin`, add `experimental.serverActions.allowedOrigins`.

None of that replaces validating input. Every action in this project parses
its `formData` through zod and re-derives prices and identity server-side,
because an action is a public POST endpoint regardless of which form normally
calls it.

### Open redirect, avoided

`/signin?from=…` round-trips the original destination. Honouring it unchecked
would let an attacker use our own domain to bounce users anywhere:

```ts
const target =
  typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
    ? from
    : "/account";
```

The `//` check is the part people miss — `//evil.example` is a
protocol-relative URL, not a local path.

---

## 7. Honest limitation: the session is not real

`features/auth/` stores an **unsigned** JSON role in a cookie. Anyone can forge
`{"user":"x","role":"admin"}` and become admin. A real implementation signs or
encrypts it (JWT, iron-session) or stores an opaque id pointing at server-side
state.

It is here because this topic is about *where* authorisation is enforced, and
that structure is identical whichever session mechanism sits underneath.
Swapping the file changes nothing above it.

The schema validation is real, though, and does its job: an unknown role is
rejected rather than trusted.

---

## 8. Verified

- Proxy loaded (`ƒ Proxy (Middleware)` in build output) — ✅
- All six security headers on `/` — ✅
- 307 / 200 / 403 / 200 auth matrix — ✅ measured above
- Forged cookie rejected at both layers — ✅
- Customer sees no admin content or username — ✅ browser-verified
- `build` / `typecheck` / `lint` / `format:check` — ✅ clean
- 24/24 routes — ✅

---

## Related

- **[Topic 11 — SEO & Metadata](11-seo-and-metadata.md)**
- **[Topic 1](01-project-setup-and-architecture.md)** and
  **[Topic 2](02-routing-app-router.md)** — the other two appearances of the
  streaming status-code constraint.
