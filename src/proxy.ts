import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getBlogLocaleRedirect,
  getEnglishLegacyOfferRedirect,
  getJapaneseLegacyOfferRedirect,
  isMarketingLocale,
  isNonIndexablePath,
} from "@/lib/marketing-routing";

function decodeDemoPathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    console.error("[proxy] invalid encoded demo path segment:", error);
    return value;
  }
}

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

    const legacyDemoPath = pathname.match(/^\/(?:ja|en)\/demo\/([^/]+)(\/.*)?$/);
    if (legacyDemoPath) {
      const [, slug, suffix = ""] = legacyDemoPath;
      const response = NextResponse.redirect(new URL(`/${slug}${suffix}${request.nextUrl.search}`, request.url), 308);
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      return response;
    }

    const localePrefixedPath = pathname.match(/^\/(?:ja|en)\/([^/]+)(\/.*)?$/);
    if (localePrefixedPath) {
      const [, slug, suffix = ""] = localePrefixedPath;
      const response = NextResponse.redirect(new URL(`/${slug}${suffix}${request.nextUrl.search}`, request.url), 308);
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      return response;
    }

    const visibleDemoPath = pathname.match(/^\/([^/]+)(\/.*)?$/);
    if (visibleDemoPath) {
      const [, slug, suffix = ""] = visibleDemoPath;
      if (["api", "demo", "en", "ja", "not-found"].includes(slug.toLowerCase())) {
        return NextResponse.rewrite(new URL("/not-found", request.url));
      }
      const rewrite = request.nextUrl.clone();
      rewrite.pathname = `/ja/demo/${decodeDemoPathSegment(slug)}${suffix}`;
      const response = NextResponse.rewrite(rewrite);
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      return response;
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

  // Japan Entry is an international offer; keep the domestic Japanese site on
  // its general services surface with a real HTTP redirect (not a streamed
  // meta refresh from the page component).
  if (pathname === "/ja/package") {
    return NextResponse.redirect(new URL(`/ja/services${request.nextUrl.search}`, request.url), 308)
  }

  // Investor briefs are editorially maintained in English. Redirect before
  // rendering so crawlers receive a real permanent response instead of the
  // 200 + streamed meta refresh produced by a Server Component redirect.
  const investorBriefLocalePath = pathname.match(/^\/([^/]+)(\/japan-opportunities\/invest(?:\/.*)?)$/)
  if (investorBriefLocalePath) {
    const [, locale, suffix] = investorBriefLocalePath
    if (locale !== "en" && isMarketingLocale(locale)) {
      const destination = request.nextUrl.clone()
      destination.pathname = `/en${suffix}`
      return NextResponse.redirect(destination, 308)
    }
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
  // Screenshot-to-code artifacts are untrusted review HTML.  Keep their
  // preview surface completely inert even though the application-wide CSP
  // allows the inline bootstrap required by normal Next.js pages.
  if (pathname.startsWith("/api/sales/demo-site/screenshot-to-code/preview/")) {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline' https:; img-src data: https:; font-src data: https:; script-src https://cdn.tailwindcss.com 'unsafe-inline'; connect-src 'none'; base-uri 'none'; form-action 'none'",
    );
  }
  if (isNonIndexablePath(pathname) || request.nextUrl.searchParams.get("draft") === "true") {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = {
  matcher: "/((?!_next|static|favicon).*)",
};
