import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  // status.paradigmjp.com → infra dashboard (same Docker network)
  if (host.startsWith("status.")) {
    return NextResponse.rewrite(
      new URL(request.nextUrl.pathname + request.nextUrl.search, "http://infra-dashboard:9877")
    );
  }

  // demo.paradigmjp.com root → demo page
  if (host.startsWith("demo.") && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/en/demo/joburg-1oi4gv", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next|api|static|favicon|_next).*)",
};
