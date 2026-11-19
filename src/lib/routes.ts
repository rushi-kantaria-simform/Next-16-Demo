import type { Route } from "next";

/**
 * The one sanctioned escape hatch from `typedRoutes`.
 *
 * `typedRoutes: true` type-checks every `<Link href>` and `router.push()`
 * against a generated union of real routes, which is worth having. But it can
 * only verify string LITERALS, and two legitimate cases produce strings it
 * cannot see:
 *
 * 1. URLs assembled at runtime — `${pathname}?${searchParams}` in the filter
 *    and pagination controls. The value is unknowable at compile time by
 *    definition.
 *
 * 2. The bare path of an optional catch-all. `/shop/[[...filters]]` generates
 *    the type `` `/shop/${OptionalCatchAllSlug<T>}` ``, which demands a
 *    trailing segment — so `"/shop"` is rejected even though the route matches
 *    it at runtime (that is the entire point of the double brackets). This is
 *    a genuine gap in the generated types, not a mistake in our routing.
 *
 * Keeping the assertion in one named function means `grep dynamicRoute` finds
 * every unchecked URL in the codebase. Casting inline at each call site would
 * scatter `as Route` around and quietly disable the feature we turned on.
 */
export function dynamicRoute(href: string): Route {
  return href as Route;
}
