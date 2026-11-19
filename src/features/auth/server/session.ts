import "server-only";

import { cookies } from "next/headers";

import { parseSession, SESSION_COOKIE, type Session } from "../schema";

/**
 * Demo session layer.
 *
 * HONEST LIMITATION — do not copy this into production. The cookie stores a
 * plain JSON role with no signature, so anyone can forge
 * `{"user":"x","role":"admin"}` and hand themselves admin. A real
 * implementation signs or encrypts the payload (JWT, iron-session) or stores
 * only an opaque id pointing at server-side session state.
 *
 * It exists because Topic 10 is about WHERE authorisation is enforced — proxy
 * vs page vs Server Action — and that structure is identical whichever session
 * mechanism sits underneath. Swapping this file for a real one changes nothing
 * above it.
 *
 * The schema and parser live in ../schema.ts so `proxy.ts` can share them;
 * only the `cookies()` access is server-only.
 */

export type { Session };
export { SESSION_COOKIE };

/** Read and validate the session, or null. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  // A tampered cookie is treated as signed-out rather than crashing the
  // render — fail closed.
  return parseSession(store.get(SESSION_COOKIE)?.value);
}

export async function createSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
