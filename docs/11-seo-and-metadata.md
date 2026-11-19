# Topic 11 — SEO & Metadata

Generated sitemap and robots, OG image generation with `next/og`, JSON-LD
structured data, and canonical URLs — plus two Satori quirks that only show up
when you actually look at the rendered PNG.

---

## 1. Generated `robots.txt` and `sitemap.xml`

Both are **code**, not static files, because both need `siteConfig.url` — a
hardcoded host would be wrong in every environment except production.

```
/robots.txt   ○ static    User-Agent / Allow / Disallow + Sitemap line
/sitemap.xml  ƒ dynamic   22 entries, application/xml
```

22 = 5 static routes + 5 categories + 12 products, generated from the
catalogue so a new product appears the moment it exists. A hand-maintained XML
file is guaranteed to drift.

**Verified excluded** (0 occurrences each): `/cart`, `/account`, `/signin`,
`/classic`, `/api`. Per-user and non-canonical URLs do not belong in a
sitemap — a sitemap asserts "these are worth indexing".

### robots.txt controls crawling, not indexing

A disallowed URL can still appear in results if other sites link to it — and
because it is disallowed, the crawler never reads the `noindex` meta that
would have removed it. Hence belt-and-braces: those routes are blocked from
crawling **and** carry `robots: { index: false }` in their own metadata.

### The import that matters

`sitemap.ts` imports `lib/queries`, **not** the `use cache` repository. A
metadata route is not a React render, so Cache Components directives do not
apply — the router-neutral query layer extracted in Topic 3 is what makes this
work without duplicating the catalogue logic a third time.

### Type gotcha

```ts
// ❌ widens changeFrequency to `string`, fails MetadataRoute.Sitemap
[...].map((e) => ({ ...e, lastModified: buildDate }))
```

Spreading through `.map()` loses the literal union. Set `lastModified` inline
instead.

`lastModified` is a single build-time value, not `new Date()` per entry —
telling crawlers every page changed on every build is noise, and they learn to
ignore the field.

---

## 2. OG image generation with `next/og`

`opengraph-image.tsx` renders JSX to a PNG via Satori. Two files here: a
site-wide card and a per-product one.

```tsx
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
```

**Verified:** root `200 image/png 63 KB`; per-product `200 image/png 744 KB`
(it embeds the real product photo), with Next wiring the hashed URL into the
page's `og:image` meta automatically.

### v16 BREAKING: `params` is a Promise

```tsx
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
```

In v15 this was a plain object. The dangerous part is the failure mode: v15
code (`params.slug`) does not throw — it yields `undefined`, so **every**
product silently renders the fallback card. Same change applies to
`twitter-image`, `icon`, `apple-icon`, and the `id` argument of
`generateImageMetadata`.

`generateStaticParams` is exported here too. Without it the PNG is generated on
first request — and the first request is usually a social crawler with a short
timeout.

### Two Satori quirks found by looking at the output

Both produced a **clean build with no errors** and a visibly wrong image.

**1. Fonts are resolved per glyph.** The build logged:

```
Failed to load dynamic font for ★ . Status: 400
Failed to load dynamic font for ◆ . Status: 400
```

Satori fetches a font per glyph from Google Fonts; no match means the glyph
renders as *nothing*. The rating line would have shipped with a gap. Fixed by
using ASCII (`Rated 4.5 / 5`) — self-hosting a font covering the glyph would
also work, but that is a lot of bytes for one decorative character.
(Interestingly `·` resolves fine, so it is not simply "ASCII only".)

**2. `<br />` is ignored inside text.** The first render produced
`Modern tech,thoughtfully chosen.` on one overflowing line, comma jammed
against the next word. Explicit flex children are the reliable way to break a
line.

Other constraints worth knowing: no Tailwind classes (inline `style` only),
flexbox only — a parent with multiple children **must** declare
`display: "flex"` or Satori throws — and no `oklch()`, so the design tokens
cannot be reused directly.

---

## 3. JSON-LD structured data

Next has no built-in API; the docs' own recommendation is to render the script
tag yourself. Wrapped once in `components/seo/json-ld.tsx` so the escaping is
done correctly.

```tsx
dangerouslySetInnerHTML={{
  __html: JSON.stringify(data).replace(/</g, "\\u003c"),
}}
```

Both halves are load-bearing:

- `dangerouslySetInnerHTML` is **required** — React escapes `<script>`
  children, which would corrupt the JSON into an unparseable blob.
- The `<` replacement is the actual security control. Product data is
  user-influenced, and a literal `</script>` inside a string would terminate
  the tag early and let the rest run as HTML.

**Verified** on a product page: parses as a valid `Product` with
`offers 249.00 USD InStock` and `aggregateRating 4.7 from 1284`, and `<` is
escaped.

Every value is duplicated from what the page already renders. That is the rule
that keeps it legitimate — advertising a price or rating the page does not show
is cloaking, and gets rich results revoked.

---

## 4. Canonical URLs

```ts
alternates: { canonical: `/products/${product.slug}` }
```

Relative, so it composes with `metadataBase` from the root layout. Verified:
`<link rel="canonical" href="http://localhost:3000/products/aurora-…">`.

This matters more in this project than most, because the same product is
reachable three ways:

| URL | What it is |
| --- | --- |
| `/products/[slug]` | the canonical page |
| `/products/[slug]` (intercepted) | the quick-view modal — same URL |
| `/classic/products/[slug]` | the Pages Router twin from Topic 3 |

Without a canonical, ranking splits across duplicates instead of
consolidating.

### Do not set `openGraph.images` when you have `opengraph-image.tsx`

Setting it **overrides** the generated card with the raw product photo —
losing the name, price and rating rendered onto it. The file convention
already wires the meta tag.

---

## 5. Pages Router SEO, side by side

The Metadata API does **not** exist in `pages/`. `/classic/*` uses `next/head`,
which is also unrelated to the `Head` from `next/document` (document-wide,
`_document.tsx` only).

| | App Router | Pages Router |
| --- | --- | --- |
| API | `export const metadata` / `generateMetadata` | `<Head>` from `next/head` |
| Canonical | `alternates.canonical` | manual `<link rel="canonical">` |
| OG image | `opengraph-image.tsx` file convention | manual `<meta property="og:image">` |
| Title template | `title.template` in root layout | repeat it on every page |

`/classic/live` sets `<meta name="robots" content="noindex">` by hand —
request-specific SSR output should never be indexed.

---

## 6. `htmlLimitedBots`

A config key controlling which bots receive **blocking** (non-streamed)
metadata, so a crawler that does not wait for a stream still sees complete
tags. The default list already covers Google, Bing, Twitter and Slack — left
at the default here, since overriding it is an advanced case.

---

## 7. Verified

| Check | Result |
| --- | --- |
| `/robots.txt` | ✅ rules + sitemap line, absolute URL from config |
| `/sitemap.xml` | ✅ 200, `application/xml`, 22 entries |
| Sitemap exclusions | ✅ 0 hits for cart/account/signin/classic/api |
| Root OG image | ✅ 200, `image/png`, 1200×630 |
| Product OG image | ✅ 200, real photo + name + price + rating |
| Canonical tag | ✅ absolute, composed with `metadataBase` |
| JSON-LD | ✅ parses as `Product`, `<` escaped |
| `build` / `typecheck` / `lint` / `format:check` | ✅ clean |
| Routes | ✅ 24/24 |

---

## Related

- **[Topic 10 — Proxy, Security & Middleware](10-proxy-security-middleware.md)**
- **[Topic 3](03-pages-router.md)** — the query layer the sitemap reuses.
- **[Topic 1](01-project-setup-and-architecture.md)** — `metadataBase` and the
  conflicting-robots-tag fix.
