/**
 * Blocking inline script that sets the theme class before first paint.
 *
 * WHY NOT A COOKIE?
 * Reading a theme cookie would mean `await cookies()` in the ROOT layout, and
 * the root layout cannot sit inside <Suspense> — it *is* the shell. Under
 * `cacheComponents` that makes the entire app request-rendered, destroying the
 * static shell for every route. A cookie is the right call for the cart badge
 * (it has a Suspense boundary of its own); it is the wrong call for the
 * `<html>` element.
 *
 * WHY NOT useEffect?
 * An effect runs after hydration. The user would see a light flash, then the
 * page snaps dark — the "flash of incorrect theme" everyone recognises.
 *
 * So: a synchronous, render-blocking script in <head>. It executes before the
 * browser paints, so the correct class is on <html> from the very first frame,
 * and the HTML itself stays fully static and cacheable.
 *
 * `suppressHydrationWarning` on <html> is required, because this script mutates
 * the class attribute before React hydrates and React would otherwise flag the
 * server/client mismatch it deliberately created.
 */

const STORAGE_KEY = "nexus-theme";

/**
 * Kept as a string, minified by hand. It runs before any bundle loads, so it
 * cannot reference imports — everything it needs is inlined.
 *
 * Wrapped in try/catch because `localStorage` throws outright in Safari's
 * private mode and when cookies are blocked. A theme preference is never worth
 * a blank page, so failure falls through to the OS setting.
 */
const script = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  STORAGE_KEY,
)});var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.add(d?"dark":"light");document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){document.documentElement.classList.add("light");}})();`;

export function ThemeScript() {
  return (
    <script
      // Safe: `script` is a module-level constant with no interpolated user
      // input. This is the one legitimate use of dangerouslySetInnerHTML —
      // a <script> child would be escaped by React and never execute.
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}

export { STORAGE_KEY as THEME_STORAGE_KEY };
