"use server";

import { redirect } from "next/navigation";

import { dynamicRoute } from "@/lib/routes";
import { createSession, destroySession } from "./session";

/**
 * Sign-in / sign-out Server Actions.
 *
 * No password check — this is a role switcher for demonstrating authorisation
 * boundaries, not an authentication system. See the note in session.ts.
 *
 * What IS faithful: the session cookie is written by a Server Action, because
 * `cookies().set()` is only legal in an action or a route handler. Calling it
 * during render throws, since response headers are already streaming.
 */
export async function signIn(formData: FormData): Promise<void> {
  const role = formData.get("role") === "admin" ? "admin" : "customer";
  const from = formData.get("from");

  await createSession({
    user: role === "admin" ? "Avery (admin)" : "Sam (customer)",
    role,
  });

  /**
   * `redirect()` inside a Server Action sends a 303 and is reliable — unlike
   * `redirect()` during a PPR render, which degrades to a 200 with a
   * client-side redirect (Topic 2). An action runs before any shell is
   * flushed, so it still controls the response.
   *
   * Only internal paths are honoured: `from` arrives from a query string, so
   * accepting it unchecked would be an open-redirect — an attacker could link
   * to /signin?from=https://evil.example and have our own domain bounce the
   * user there post-login.
   */
  const target =
    typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
      ? from
      : "/account";

  // `target` is computed at runtime, so `typedRoutes` cannot verify it —
  // the same case `dynamicRoute()` was introduced for in Topic 2. The
  // validation above is what actually makes it safe.
  redirect(dynamicRoute(target));
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/signin");
}
