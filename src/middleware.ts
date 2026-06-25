import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // status.paradigmjp.com → infra dashboard (same Docker network)
  if (host.startsWith("status.")) {
    return NextResponse.rewrite(
      new URL(pathname + request.nextUrl.search, "http://infra-dashboard:9877")
    );
  }

  if (host.startsWith("demo.")) {
    const legacyDemoPath = pathname.match(/^\/(?:ja|en)\/demo(\/.*)?$/);
    if (legacyDemoPath) {
      return NextResponse.redirect(new URL(`/demo${legacyDemoPath[1] ?? ""}${request.nextUrl.search}`, request.url));
    }

    const astroDemoOrigin = process.env.ASTRO_DEMO_INTERNAL_ORIGIN || "http://astro-demo:4321";
    const astroPath = pathname === "/" ? "/demo" : pathname;
    return NextResponse.rewrite(new URL(astroPath + request.nextUrl.search, astroDemoOrigin));
  }

  // Root path without locale → redirect to /ja (default)
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/ja", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next|static|favicon).*)",
};
