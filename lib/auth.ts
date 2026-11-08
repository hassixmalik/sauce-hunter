// Shared by proxy.ts and the login route. Web Crypto only, so it runs anywhere.

export const COOKIE = "sh_session";
export const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export function credentials() {
  const user = process.env.BASIC_AUTH_USER, pass = process.env.BASIC_AUTH_PASS;
  return user && pass ? { user, pass } : null;
}

/** Session token = sha256 of the credentials. Changing the password logs everyone out. */
export async function sessionToken(user: string, pass: string) {
  const data = new TextEncoder().encode(`sauce-hunter:${user}:${pass}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export function checkLogin(user: string, pass: string) {
  const c = credentials();
  return !!c && same(user, c.user) && same(pass, c.pass);
}

/** True if the request has a valid session cookie or Basic Auth header (for curl / Claude). */
export async function isAuthed(cookie: string | undefined, authHeader: string | null) {
  const c = credentials();
  if (!c) return false;
  if (cookie && same(cookie, await sessionToken(c.user, c.pass))) return true;
  if (authHeader?.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(authHeader.slice(6)).split(":");
      return checkLogin(u, rest.join(":"));
    } catch { return false; }
  }
  return false;
}

/** Only allow same-site relative redirects after login. */
export const safeNext = (n: unknown) => (typeof n === "string" && /^\/(?!\/)/.test(n) ? n : "/");
