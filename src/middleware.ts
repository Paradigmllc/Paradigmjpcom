/**
 * src/middleware.ts — next-intl + /p/→/report/ pre-redirect + /report/ noindex header
 *
 * 役割:
 *   1. /p/[slug] や /:locale/p/[slug] を /report/ 配下に 308 redirect
 *      (next.config.ts の redirects() は middleware 後に評価されるため、
 *       先にここで処理しないと next-intl が /p/foo に locale prefix を付ける)
 *   2. /report/* /p/* 配下に X-Robots-Tag header を強制 (4 層 noindex 防御の Layer 1)
 *      2026-05-03 永久ルール: 1顧客1URLの個別生成ページは SEO 完全禁止
 *   3. それ以外は next-intl の locale routing に委譲
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

// /report/* /p/* matcher (locale prefix の有無両対応)
// 例: /report/abc, /ja/report/abc, /p/abc, /en/p/abc
const NOINDEX_PATTERN = /^\/(?:[a-z]{2}\/)?(?:report|p)(?:\/|$)/i

// X-Robots-Tag: SEO 完全禁止の最強構成
// noindex (検索結果に出さない) / nofollow (link を辿らない) /
// noarchive (キャッシュ表示禁止) / nosnippet (スニペット禁止) /
// noimageindex (画像 index 禁止)
const NOINDEX_VALUE = "noindex, nofollow, noarchive, nosnippet, noimageindex"

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
      const res = NextResponse.redirect(new URL(dest, request.url), 308)
      res.headers.set("X-Robots-Tag", NOINDEX_VALUE)
      return res
    }
  }

  // Pattern B: /p/:slug (locale-less) → /:defaultLocale/report/:slug
  const rootP = pathname.match(/^\/p\/([^/]+)$/i)
  if (rootP) {
    const [, slug] = rootP
    const dest = `/${routing.defaultLocale}/report/${slug}${search}`
    const res = NextResponse.redirect(new URL(dest, request.url), 308)
    res.headers.set("X-Robots-Tag", NOINDEX_VALUE)
    return res
  }

  // ─── 通常 routing は next-intl に委譲 ────────────────────────────────
  const response = intlMiddleware(request)

  // /report/* /p/* 配下は X-Robots-Tag を強制 (Layer 1)
  if (NOINDEX_PATTERN.test(pathname)) {
    response.headers.set("X-Robots-Tag", NOINDEX_VALUE)
  }

  return response
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
