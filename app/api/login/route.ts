import { NextResponse } from "next/server";
import { COOKIE, MAX_AGE, checkLogin, credentials, safeNext, sessionToken } from "@/lib/auth";

/** Plain HTML form post: works without JavaScript. */
export async function POST(req: Request) {
  const form = await req.formData();
  const user = String(form.get("user") ?? ""), pass = String(form.get("pass") ?? "");
  const next = safeNext(form.get("next"));
  const base = new URL(req.url);

  if (!checkLogin(user, pass)) {
    const url = new URL("/login", base);
    url.searchParams.set("error", "1");
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  }
  const c = credentials()!;
  const res = NextResponse.redirect(new URL(next, base), 303);
  res.cookies.set(COOKIE, await sessionToken(c.user, c.pass), {
    httpOnly: true, secure: base.protocol === "https:", sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
  return res;
}

/** Log out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
