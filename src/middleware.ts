/**
 * src/middleware.ts — next-intl + custom /p/ → /report/ pre-redirect
 *
 * 役割:
 *   1. /p/[slug] や /:locale/p/[slug] を /report/ 配下に 308 redirect
 *      (next.config.ts の redirects() は middleware 後に評価されるため、
 *       先にここで処理しないと next-intl が /p/foo に locale prefix を付ける)
 *   2. それ以外は next-intl の locale routing に委譲
 *
 * matcher exclusion:
 *   - api / admin / _next / _vercel / 任意の拡張子付きファイル
 *   - icon / apple-icon / opengraph-image / sitemap.xml / robots.txt /
 *     manifest.webmanifest 等の File Convention assets (next-intl が
 *     locale prefix を付けないように)
 */

import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

const intlMiddleware = createMiddleware(routing)

const VALID_LOCALES = new Set(routing.locales)

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // ─── /p/ → /report/ unification (308 permanent) ─────────────────────────
  // CLAUDE.md s10-5 永久ルール: 顧客向けページは canonical = /[locale]/report/[slug]
  //
  // Pattern A: /:locale/p/:slug → /:locale/report/:slug
  const localeP = pathname.match(/^\/([a-z]{2})\/p\/([^/]+)$/i)
  if (localeP) {
    const [, locale, slug] = localeP
    if (VALID_LOCALES.has(locale as (typeof routing.locales)[number])) {
      const dest = `/${locale}/report/${slug}${search}`
      return NextResponse.redirect(new URL(dest, request.url), 308)
    }
  }

  // Pattern B: /p/:slug (locale-less) → /:defaultLocale/report/:slug
  const rootP = pathname.match(/^\/p\/([^/]+)$/i)
  if (rootP) {
    const [, slug] = rootP
    const dest = `/${routing.defaultLocale}/report/${slug}${search}`
    return NextResponse.redirect(new URL(dest, request.url), 308)
  }

  // ─── 通常 routing は next-intl に委譲 ────────────────────────────────
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    // matcher 除外:
    //   api / admin / _next / _vercel / 拡張子付きファイル ( .png .ico .svg 等)
    //   File Convention 自動生成 endpoint:
    //     icon / apple-icon / opengraph-image / sitemap.xml / robots.txt /
    //     manifest.webmanifest / favicon
    //   (これらは Next.js 自身が serve するため next-intl は介入してはいけない)
    "/((?!api|admin|_next|_vercel|icon|apple-icon|opengraph-image|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|favicon|.*\\..*).*)",
  ],
}
