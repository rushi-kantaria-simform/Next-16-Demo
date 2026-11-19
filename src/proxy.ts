import { NextResponse, type NextRequest } from "next/server";

import { parseSession, SESSION_COOKIE } from "@/features/auth/schema";

/**
 * PROXY — the v16 replacement for `middleware.ts`.
 *
 * `middleware.ts` is deprecated in Next 16 and renamed to `proxy.ts`. Same
 * position in the request lifecycle, new name and a new default runtime.
 * Codemod: `npx @next/codemod@canary middleware-to-proxy .`
 *
 * Location matters: it sits beside `app/` and `pages/`, so in this project
 * that is `src/proxy.ts`, NOT the repository root. The export may be named
 * `proxy` or be the default export.
 *
 * RUNTIME: Node.js, stable since v15.5 and the default in v16. That is a real
 * change from the Edge-only middleware era — Node APIs and database clients
 * work here now.
 *
 * STILL NOT ALLOWED: `"use cache"` and `"use server"` directives, and `fetch`
 * here ignores `cache`, `next.revalidate` and `next.tags`. Proxy runs before
 * the rendering pipeline, so none of the caching machinery exists yet.
 *
 * WHAT RUNS HERE vs next.config.ts:
 *   next.config.ts headers()/redirects()  static rules, no per-request logic,
 *                                         cheaper — prefer when sufficient
 *   proxy.ts                              needs the request: cookies, path,
 *                                         method, per-request values
 */

/** Routes requiring any signed-in session. */
const PROTECTED_PREFIXES = ["/account"] as const;

/** Routes additionally requiring the admin role. */
const ADMIN_PREFIXES = ["/account/admin"] as const;

const matches = (pathname: string, prefixes: readonly string[]) =>
  prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Forward request-scoped values to the rendering layer. These are REQUEST
  // headers (visible to `await headers()` in a Server Component), distinct
  // from response headers sent to the browser.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  if (matches(pathname, PROTECTED_PREFIXES)) {
    // Same parser the pages use — one definition of "valid session", so the
    // two layers can never disagree.
    const session = parseSession(request.cookies.get(SESSION_COOKIE)?.value);

    if (!session) {
      /**
       * Redirect at the proxy layer rather than inside the page.
       *
       * This is the fix for the problem Topic 2 ran into: `redirect()` during
       * render happens AFTER the PPR shell is flushed, so it degrades to a
       * 200 with a client-side redirect. Proxy runs before any rendering, so
       * this is a real 307 with a real `Location` header.
       */
      const signIn = new URL("/signin", request.url);
      // Round-trip the original destination so sign-in can return the user.
      signIn.searchParams.set("from", pathname);
      return NextResponse.redirect(signIn);
    }

    /**
     * Role check here as well as in the page, for the STATUS CODE.
     *
     * `forbidden()` in a page renders the right UI but cannot set a 403:
     * under PPR the shell is already flushed, so the response is committed as
     * 200 (measured — the same root cause as `notFound()` in Topic 1 and
     * `redirect()` in Topic 2). Next injects `noindex` to compensate, but a
     * monitoring tool, an API client or a security scanner sees success.
     *
     * Proxy runs before any rendering, so it can still set a real 403.
     *
     * This does NOT replace the page-level check. A path prefix is easy to
     * get subtly wrong — a new route outside the matcher, a rewrite, a
     * trailing-slash variant — so the page remains the authoritative
     * boundary that guarantees data never renders. The proxy is the layer
     * that gets the HTTP semantics right.
     */
    if (matches(pathname, ADMIN_PREFIXES) && session.role !== "admin") {
      return new NextResponse("Forbidden", {
        status: 403,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          // Belt and braces: never index a 403 body.
          "x-robots-tag": "noindex",
        },
      });
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  /**
   * Per-request response headers.
   *
   * Static security headers live in next.config.ts instead — they need no
   * request context and the config path is cheaper. Only headers that
   * genuinely vary per request belong here.
   */
  response.headers.set("x-pathname", pathname);

  return response;
}

export const config = {
  /**
   * Without a matcher this runs on EVERY request, including each static
   * asset, image and prefetch — real overhead for no benefit.
   *
   * The negative lookahead excludes Next internals and common static files.
   * `_next/static` and `_next/image` especially: they are immutable assets
   * that never need inspecting.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)",
  ],
};
