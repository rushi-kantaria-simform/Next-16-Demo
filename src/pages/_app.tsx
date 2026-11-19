import type { AppProps } from "next/app";
import { Geist, Geist_Mono } from "next/font/google";

import { ClassicChrome } from "@/features/classic/components/classic-chrome";

/**
 * The stylesheet is shared with the App Router on purpose — both routers draw
 * from the same `@theme` tokens, so `bg-surface` means the same thing on both
 * sides. It lives under `app/` only because that is where create-next-app put
 * it; nothing about it is App-Router-specific.
 *
 * Placement is NOT optional though: in the Pages Router, global CSS can ONLY
 * be imported from `_app.tsx`. Importing it from any other page is a build
 * error. (The App Router has no such restriction.)
 */
import "@/app/globals.css";

/**
 * `next/font` is called here rather than in `_document.tsx`.
 *
 * The font loader returns a generated className that must be applied to an
 * element. `_document` renders once on the server and never re-renders, so
 * wiring it there is fragile; `_app` wraps every page render, which is what
 * the docs recommend for applying a font globally in the Pages Router.
 *
 * Same self-hosting benefit as the App Router: files are downloaded at build
 * time and served from our own origin, with no runtime request to Google.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Custom App — wraps every Pages Router page.
 *
 * This is where the Pages Router puts what the App Router expresses as nested
 * layouts: shared chrome, providers, global CSS. The structural difference
 * that matters is that `_app` is a SINGLE flat wrapper. There is no nesting,
 * so "this section has its own sub-layout" has to be hand-rolled (usually with
 * a per-page `getLayout` function), whereas `app/` gets it from the folder
 * structure for free.
 *
 * `pageProps` carries whatever `getStaticProps` / `getServerSideProps`
 * returned for the page being rendered.
 */
export default function App({ Component, pageProps }: AppProps) {
  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} flex min-h-full flex-1 flex-col`}
    >
      <ClassicChrome>
        <Component {...pageProps} />
      </ClassicChrome>
    </div>
  );
}
