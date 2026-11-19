/**
 * `template.tsx` vs `layout.tsx` — the difference in one sentence: a layout
 * persists across navigation, a template remounts on every navigation.
 *
 * Concretely, on each navigation within this group a template:
 *   - creates a NEW DOM node (so CSS entry animations replay — that is what
 *     makes the fade below work; in a layout it would run once, ever)
 *   - resets `useState` in any Client Component it wraps
 *   - re-runs `useEffect`, which is the hook for per-navigation analytics
 *
 * It does NOT remount on a search-param change — only on a segment change.
 *
 * Default to `layout.tsx`. Remounting throws away state and costs work; reach
 * for a template only when the reset is the actual goal, as with this
 * transition. Note this is still a Server Component — no "use client" needed,
 * because the replay comes from the new node, not from JavaScript.
 */
export default function MarketingTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="animate-fade-in">{children}</div>;
}
