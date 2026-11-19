"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Core Web Vitals reporting.
 *
 * `useReportWebVitals` comes from `next/web-vitals` — NOT `next/navigation`,
 * and it works identically in both routers (the Pages Router calls it from
 * `_app.tsx`).
 *
 * The callback fires once per metric, as each becomes available: TTFB and FCP
 * early, LCP after the largest element settles, CLS and INP only when the page
 * is hidden or unloaded. It is not a single batched report.
 *
 * Rendering `null` is the point — this is a behavioural component. It exists
 * in the tree solely so a hook can run, and the sole reason it has to be a
 * Client Component is that hooks do not exist on the server.
 *
 * In production this would POST to an analytics endpoint. Doing that here
 * would mean inventing a backend, so it logs instead, gated to development so
 * real users never pay for console noise.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "development") return;

    // `rating` is Google's own bucketing — "good" | "needs-improvement" |
    // "poor" — so there is no need to hardcode threshold numbers that drift.
    const style =
      metric.rating === "good"
        ? "color:#10b981"
        : metric.rating === "poor"
          ? "color:#ef4444"
          : "color:#f59e0b";

    console.log(
      `%c[web-vital] ${metric.name} ${Math.round(metric.value)}${
        metric.name === "CLS" ? "" : "ms"
      } (${metric.rating})`,
      style,
    );
  });

  return null;
}
