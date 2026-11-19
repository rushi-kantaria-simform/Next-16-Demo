"use client";

import { useRouter } from "next/compat/router";

/**
 * A component that renders safely under BOTH routers.
 *
 * The problem it solves: `useRouter` from `next/router` throws inside an App
 * Router tree ("NextRouter was not mounted"), so a shared component cannot
 * simply import it. During an incremental migration that is a real blocker —
 * header, nav and analytics components get rendered from both halves.
 *
 * `next/compat/router` is the documented escape hatch: same hook, but it
 * returns `null` instead of throwing when no Pages router is mounted. So a
 * null check doubles as "which router am I under?".
 *
 *   router !== null  ->  Pages Router
 *   router === null  ->  App Router
 *
 * It needs "use client" to be legal in an App Router tree; the directive is a
 * no-op on the Pages Router side, where everything is already a client
 * component.
 */
export function RouterBadge() {
  const router = useRouter();
  const isPagesRouter = router !== null;

  return (
    <span
      className={
        isPagesRouter
          ? "rounded bg-content px-2 py-0.5 font-mono text-xs text-surface"
          : "rounded bg-brand-600 px-2 py-0.5 font-mono text-xs text-white"
      }
      title={
        isPagesRouter
          ? "next/compat/router returned a router — Pages Router"
          : "next/compat/router returned null — App Router"
      }
    >
      {isPagesRouter ? `pages/ · ${router.pathname}` : "app/"}
    </span>
  );
}
