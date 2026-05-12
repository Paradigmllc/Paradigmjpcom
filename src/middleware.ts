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

// /report/* /p/* matcher (locale prefix の有無両対応)
// 例: /report/abc, /ja/report/abc, /p/abc, /en/p/abc
// 2026-05-12: route は archive 済 (404 になる) だが、Google の古い indexed URL が
// 残っていた場合に noindex を確実に返すため header だけは保持。
const NOINDEX_PATTERN = /^\/(?:[a-z]{2}\/)?(?:report|p)(?:\/|$)/i

// X-Robots-Tag: SEO 完全禁止の最強構成
const NOINDEX_VALUE = "noindex, nofollow, noarchive, nosnippet, noimageindex"

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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
