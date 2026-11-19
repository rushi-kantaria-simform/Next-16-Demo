import { Head, Html, Main, NextScript } from "next/document";

/**
 * Custom Document — the Pages Router equivalent of the App Router's root
 * layout, but far more limited.
 *
 * It renders ONLY on the server, once per page. React hooks, event handlers
 * and `useEffect` do not work here, and it never re-renders on navigation.
 * That is why `_app.tsx` exists for anything interactive or stateful.
 *
 * The four imports are mandatory and each has a job:
 *   <Html>       replaces <html>; this is where `lang` belongs
 *   <Head>       document-wide <head> tags. NOT `next/head` — that is the
 *                per-page component and the two are not interchangeable.
 *                Nothing page-specific goes here; it would leak onto every page.
 *   <Main>       where the page itself is injected
 *   <NextScript> Next's runtime bundle. Omit it and the app never hydrates.
 *
 * Note what is NOT here: fonts. `next/font` is called in `_app.tsx` instead,
 * because the generated className has to reach a component that re-renders.
 *
 * App Router routes never see this file — they use `app/layout.tsx`. Both
 * render an <html> element, and they do not conflict because a given URL is
 * served by exactly one router.
 */
export default function Document() {
  return (
    <Html lang="en" className="h-full">
      <Head />
      <body className="flex min-h-full flex-col">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
