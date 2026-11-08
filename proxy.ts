import { NextResponse, type NextRequest } from "next/server";

// One shared password for everything except the cron routes (they use CRON_SECRET).
export function proxy(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER, pass = process.env.BASIC_AUTH_PASS;
  if (!user || !pass) {
    // Fail closed in production so the page is never public by mistake.
    if (process.env.NODE_ENV === "production") return new NextResponse("Set BASIC_AUTH_USER and BASIC_AUTH_PASS", { status: 500 });
    return NextResponse.next();
  }
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const [u, ...rest] = atob(header.slice(6)).split(":");
      if (u === user && rest.join(":") === pass) return NextResponse.next();
    } catch { /* bad header */ }
  }
  return new NextResponse("Auth required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="sauce-hunter"' } });
}

export const config = {
  matcher: ["/((?!api/cron/|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
