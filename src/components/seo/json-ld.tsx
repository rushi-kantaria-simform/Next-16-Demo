/**
 * JSON-LD structured data.
 *
 * Next has no built-in API for this — the docs' own recommendation is to
 * render a `<script type="application/ld+json">` yourself, which is what this
 * component wraps so the escaping is done once and correctly.
 *
 * Why it matters: structured data is what turns a plain search result into a
 * rich one — price, availability and rating stars under the listing. Google
 * reads JSON-LD in preference to microdata.
 *
 * This is a Server Component with no interactivity, so it ships no JS; the
 * script tag is in the prerendered HTML where crawlers will find it without
 * executing anything.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      /**
       * `dangerouslySetInnerHTML` is required: React escapes the children of
       * a <script>, which would corrupt the JSON into an unparseable blob.
       *
       * The `<` replacement is the actual security measure. Product data is
       * user-influenced (a review author, a name), and a literal `</script>`
       * inside the JSON string would terminate the tag early and let the rest
       * execute as HTML. Escaping `<` to its unicode form keeps the JSON
       * valid while making that impossible.
       */
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
