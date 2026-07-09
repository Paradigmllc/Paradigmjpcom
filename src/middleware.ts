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

  // Root path without locale → detect Accept-Language and redirect to best locale
  if (pathname === "/") {
    const acceptLang = request.headers.get("accept-language") || ""
    const preferred = acceptLang.toLowerCase()
    if (preferred.includes("ja") || preferred.includes("jp")) {
      return NextResponse.redirect(new URL("/ja", request.url))
    }
    return NextResponse.redirect(new URL("/en", request.url))
  }

  // Sales OS dashboard → Twenty SSOT
  if (pathname.match(/^\/(?:ja|en)\/admin\/sales/) || pathname.match(/^\/(?:ja|en)\/sales$/)) {
    return NextResponse.redirect(new URL("https://twenty.paradigmjp.com"));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next|static|favicon).*)",
};
