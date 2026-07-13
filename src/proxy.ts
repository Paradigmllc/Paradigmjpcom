import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getBlogLocaleRedirect,
  getEnglishLegacyOfferRedirect,
  getJapaneseLegacyOfferRedirect,
  isNonIndexablePath,
} from "@/lib/marketing-routing";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const pathname = request.nextUrl.pathname;

  // Keep the public status host independent from optional internal dashboards.
  if (host.startsWith("status.")) {
    return NextResponse.redirect(new URL("/api/ready", "https://paradigmjp.com"), 308);
  }

  if (hostname === "demo.paradigmjp.com" || hostname === "demo.localhost") {
    if (pathname.startsWith("/api/demo-preview/")) return NextResponse.next();

    const legacyDemoPath = pathname.match(/^\/(?:ja|en)\/demo(\/.*)?$/);
    if (legacyDemoPath) {
      const locale = pathname.split("/")[1] === "en" ? "en" : "ja";
      return NextResponse.redirect(new URL(`/${locale}${legacyDemoPath[1] ?? ""}${request.nextUrl.search}`, request.url), 308);
    }

    const visibleDemoPath = pathname.match(/^\/(ja|en)\/([^/]+)(\/.*)?$/);
    if (visibleDemoPath) {
      const [, locale, slug, suffix = ""] = visibleDemoPath;
      const rewrite = request.nextUrl.clone();
      rewrite.pathname = `/${locale}/demo/${slug}${suffix}`;
      return NextResponse.rewrite(rewrite);
    }

    return NextResponse.rewrite(new URL("/not-found", request.url));
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

  const blogLocaleRedirect = getBlogLocaleRedirect(request.nextUrl)
  if (blogLocaleRedirect) {
    return NextResponse.redirect(blogLocaleRedirect, 308)
  }

  const englishLegacyOfferRedirect = getEnglishLegacyOfferRedirect(request.nextUrl)
  if (englishLegacyOfferRedirect) {
    return NextResponse.redirect(englishLegacyOfferRedirect, 308)
  }

  const japaneseLegacyOfferRedirect = getJapaneseLegacyOfferRedirect(request.nextUrl)
  if (japaneseLegacyOfferRedirect) {
    return NextResponse.redirect(japaneseLegacyOfferRedirect, 308)
  }

  // Legacy Sales OS paths → Twenty CRM SSOT
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
