import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getEnglishLegacyOfferRedirect,
  getInternationalMarketingRedirect,
  isNonIndexablePath,
} from "@/lib/marketing-routing";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Keep the public status host independent from optional internal dashboards.
  if (host.startsWith("status.")) {
    return NextResponse.redirect(new URL("/api/ready", "https://paradigmjp.com"), 308);
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
  // Only on the main domain (not subdomains like twenty, demo, status, etc.)
  if (pathname === "/" && (host === "paradigmjp.com" || host === "www.paradigmjp.com" || host.startsWith("localhost"))) {
    const acceptLang = request.headers.get("accept-language") || ""
    const preferred = acceptLang.toLowerCase()
    if (preferred.includes("ja") || preferred.includes("jp")) {
      return NextResponse.redirect(new URL("/ja", request.url))
    }
    return NextResponse.redirect(new URL("/en", request.url))
  }

  const englishLegacyOfferRedirect = getEnglishLegacyOfferRedirect(request.nextUrl)
  if (englishLegacyOfferRedirect) {
    return NextResponse.redirect(englishLegacyOfferRedirect, 308)
  }

  const internationalMarketingRedirect = getInternationalMarketingRedirect(request.nextUrl)
  if (internationalMarketingRedirect) {
    return NextResponse.redirect(internationalMarketingRedirect, 308)
  }

  // Sales OS dashboard → Twenty SSOT
  if (pathname.match(/^\/(?:ja|en)\/admin\/sales/) || pathname.match(/^\/(?:ja|en)\/sales$/)) {
    return NextResponse.redirect(new URL("https://twenty.paradigmjp.com"));
  }

  const response = NextResponse.next();
  if (isNonIndexablePath(pathname) || request.nextUrl.searchParams.get("draft") === "true") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  matcher: "/((?!_next|static|favicon).*)",
};
