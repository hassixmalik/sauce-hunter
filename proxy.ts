import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, credentials, isAuthed } from "@/lib/auth";

// Everything needs a login except the login page itself and the cron routes (they use CRON_SECRET).
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  if (!credentials()) {
    // Fail closed in production so the page is never public by mistake.
    if (process.env.NODE_ENV === "production") return new NextResponse("Set BASIC_AUTH_USER and BASIC_AUTH_PASS", { status: 500 });
    return NextResponse.next();
  }
  if (await isAuthed(req.cookies.get(COOKIE)?.value, req.headers.get("authorization"))) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "login required" }, { status: 401 });
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api/cron/|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
