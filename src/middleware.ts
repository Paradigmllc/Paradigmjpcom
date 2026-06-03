/**
 * src/middleware.ts — locale routing + noindex header for archived report URLs
 *
 * 役割:
 *   1. next-intl の locale routing (12-locale)
 *   2. /report/* /p/* 配下に X-Robots-Tag header を強制 (4 層 noindex 防御の Layer 1)
 *      2026-05-12: 診断レポートが archive されたため、これらの route は 404 になるが、
 *      Google が古い URL を再 crawl した時にも noindex が確実に出るよう header だけは維持。
 *
 * 2026-05-12: 診断レポート関連 (/report /p) は archived — middleware 内の
 *   - `resolveLocaleFromSlug` (Supabase lookup) + redirect ロジックを撤去
 *   - `@paradigmllc/blocks` の regionToLocale import を撤去
 *   ゼロからの再設計後、新 URL 構造に応じて redirect logic を再構築する。
 *
 * 2026-05-12 (前): MVP セクション (`/sales/*`) は archived (`src/app/_archive_sales/`)
 *   → Basic Auth gate も撤去済。将来 unarchive する際は B36 #19 を復活させる。
 *
 * matcher exclusion:
 *   - api / admin / _next / _vercel / 任意の拡張子付きファイル
 *   - icon / apple-icon / opengraph-image / sitemap.xml / robots.txt /
 *     manifest.webmanifest 等の File Convention assets
 */

import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"

const intlMiddleware = createMiddleware(routing)

// /report/* /p/* /diagnostic/* matcher (locale prefix の有無両対応)
// 例: /report/abc, /ja/report/izakaya-en, /p/abc, /ja/diagnostic/abc (legacy)
// 2026-05-13 (Sprint 13 URL refactor): canonical = /report/[slug] (事業者名 URL-safe)
// /diagnostic/* は archive 済だが古い indexed URL の safety net として pattern には残す.
const NOINDEX_PATTERN = /^\/(?:[a-z]{2}\/)?(?:report|p|diagnostic)(?:\/|$)/i

// X-Robots-Tag: SEO 完全禁止の最強構成
const NOINDEX_VALUE = "noindex, nofollow, noarchive, nosnippet, noimageindex"
const STUDIO_HOSTS = new Set(["studio.paradigmjp.com", "openmontage.paradigmjp.com"])
const LOCALE_PATH_PATTERN = /^\/[a-z]{2}(?:\/|$)/i

function resolveHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = forwardedHost || request.headers.get("host") || ""
  return host.split(",")[0]?.split(":")[0]?.trim().toLowerCase() ?? ""
}

function rewriteStudioSubdomain(request: NextRequest): NextResponse | null {
  const hostname = resolveHostname(request)
  if (!STUDIO_HOSTS.has(hostname)) return null

  const url = request.nextUrl.clone()
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = "/ja/studio"
    return NextResponse.rewrite(url)
  }
  if (url.pathname === "/studio") {
    url.pathname = "/ja/studio"
    return NextResponse.rewrite(url)
  }
  if (!LOCALE_PATH_PATTERN.test(url.pathname)) {
    url.pathname = `/ja${url.pathname}`
    return NextResponse.rewrite(url)
  }

  return null
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const studioRewrite = rewriteStudioSubdomain(request)
  if (studioRewrite) return studioRewrite

  // ─── 通常 routing は next-intl に委譲 ────────────────────────────────
  const response = intlMiddleware(request)

  // /report/* /p/* 配下は X-Robots-Tag を強制 (Layer 1・archive 後の safety net)
  if (NOINDEX_PATTERN.test(pathname)) {
    response.headers.set("X-Robots-Tag", NOINDEX_VALUE)
  }

  return response
}

export const config = {
  matcher: [
    // matcher 除外:
    //   api / admin / _next / _vercel / 拡張子付きファイル ( .png .ico .svg 等)
    //   File Convention 自動生成 endpoint
    "/((?!api|admin|_next|_vercel|icon|apple-icon|opengraph-image|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|favicon|.*\\..*).*)",
  ],
}
