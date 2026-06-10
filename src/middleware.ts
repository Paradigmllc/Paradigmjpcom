/**
 * src/middleware.ts — locale routing + noindex header + demo video rewrite
 */
import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

const intlMiddleware = createMiddleware(routing)

const NOINDEX_PATTERN = /^\/(?:[a-z]{2}\/)?(?:report|p|diagnostic)(?:\/|$)/i
const NOINDEX_VALUE = "noindex, nofollow, noarchive, nosnippet, noimageindex"
const KEYSTATIC_HOSTS = new Set(["keystatic.paradigmjp.com"])

function resolveHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = forwardedHost || request.headers.get("host") || ""
  return host.split(",")[0]?.split(":")[0]?.trim().toLowerCase() ?? ""
}

function rewriteKeystaticSubdomain(request: NextRequest): NextResponse | null {
  const hostname = resolveHostname(request)
  if (!KEYSTATIC_HOSTS.has(hostname)) return null
  const url = request.nextUrl.clone()
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/keystatic"
    return NextResponse.redirect(url)
  }
  if (!url.pathname.startsWith("/keystatic")) {
    url.pathname = `/keystatic${url.pathname}`
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const keystaticRewrite = rewriteKeystaticSubdomain(request)
  if (keystaticRewrite) return keystaticRewrite

  // Rewrite /report/demo/:variant/video → /report/demo-:variant/video
  // Demo pages use /demo/:variant but [slug]/video expects single-segment slugs.
  const demoVideoMatch = pathname.match(/^\/([a-z]{2})\/report\/demo\/([^/]+)\/video$/)
  if (demoVideoMatch) {
    const [, locale, variant] = demoVideoMatch
    const dest = `/${locale}/report/demo-${variant}/video`
    const url = request.nextUrl.clone()
    url.pathname = dest
    const res = NextResponse.rewrite(url)
    if (NOINDEX_PATTERN.test(pathname)) res.headers.set("X-Robots-Tag", NOINDEX_VALUE)
    return res
  }

  const response = intlMiddleware(request)

  if (NOINDEX_PATTERN.test(pathname)) {
    response.headers.set("X-Robots-Tag", NOINDEX_VALUE)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|admin|_next|_vercel|icon|apple-icon|opengraph-image|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|favicon|.*\\..*).*)",
  ],
}
