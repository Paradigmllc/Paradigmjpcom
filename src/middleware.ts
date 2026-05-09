/**
 * src/middleware.ts — locale-aware /report/ /p/ redirect + noindex + next-intl routing
 *
 * 役割:
 *   1. /report/[slug] (locale-less) を cms_content_blocks.region から正しい locale へ 308 redirect
 *      (B33 Phase 2 — 2026-05-07: ja 固定 fallback だった旧 page.tsx shim を middleware に昇格)
 *   2. /p/[slug] や /:locale/p/[slug] を /report/ 配下に 308 redirect
 *   3. /report/* /p/* 配下に X-Robots-Tag header を強制 (4 層 noindex 防御の Layer 1)
 *      2026-05-03 永久ルール: 1顧客1URLの個別生成ページは SEO 完全禁止
 *   4. それ以外は next-intl の locale routing に委譲
 *
 * matcher exclusion:
 *   - api / admin / _next / _vercel / 任意の拡張子付きファイル
 *   - icon / apple-icon / opengraph-image / sitemap.xml / robots.txt /
 *     manifest.webmanifest 等の File Convention assets
 */

import { NextRequest, NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { regionToLocale, isValidRegion, type SalesRegion } from "@paradigmllc/blocks"

const intlMiddleware = createMiddleware(routing)

const VALID_LOCALES = new Set(routing.locales)

// /report/* /p/* matcher (locale prefix の有無両対応)
// 例: /report/abc, /ja/report/abc, /p/abc, /en/p/abc
const NOINDEX_PATTERN = /^\/(?:[a-z]{2}\/)?(?:report|p)(?:\/|$)/i

// X-Robots-Tag: SEO 完全禁止の最強構成
const NOINDEX_VALUE = "noindex, nofollow, noarchive, nosnippet, noimageindex"

// ─── B33 Phase 2 (2026-05-07): edge-safe region lookup ─────────────────
// middleware は edge runtime 想定. @supabase/supabase-js は edge bundle が
// 重いため Supabase REST API を fetch 直叩きで使う.
//
// /report/[slug] や /p/[slug] (locale-less) を受け取った時、cms_content_blocks
// の region 列を引いて、@paradigmllc/blocks の regionToLocale() で正しい
// locale prefix へ redirect する.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

async function resolveLocaleFromSlug(
  slug: string,
  fallbackLocale: string,
): Promise<string> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return fallbackLocale
  try {
    const url = `${SUPABASE_URL}/rest/v1/cms_content_blocks?slug=eq.${encodeURIComponent(slug)}&select=region&limit=1`
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: "application/json",
      },
      // region は変わらないので 60s ISR-style cache 許容 (middleware の高頻度呼び出しに備える)
      next: { revalidate: 60 },
    })
    if (!res.ok) return fallbackLocale
    const rows = (await res.json()) as Array<{ region: string | null }>
    if (rows.length === 0 || !rows[0].region) return fallbackLocale
    if (!isValidRegion(rows[0].region)) return fallbackLocale
    return regionToLocale(rows[0].region as SalesRegion)
  } catch {
    return fallbackLocale
  }
}

// ─── B36 #19 (2026-05-09): /sales/* gate (Basic Auth + noindex) ─────
// MVP 監視 UI を public web から隠す. SEO indexing 漏洩防止 + 内部のみアクセス可.
// Phase 1 = Basic Auth (Coolify env: MVP_BASIC_AUTH_USER / MVP_BASIC_AUTH_PASS).
// Phase 2 (将来): Authentik OIDC 昇格.
const SALES_PATH_PATTERN = /^\/sales(?:\/|$)/i

function checkBasicAuth(request: NextRequest): NextResponse | null {
  const expectedUser = process.env.MVP_BASIC_AUTH_USER
  const expectedPass = process.env.MVP_BASIC_AUTH_PASS
  if (!expectedUser || !expectedPass) {
    // env 未設定 = 全 reject (fail-closed・SEO 事故防止)
    return new NextResponse("MVP gate not configured", {
      status: 503,
      headers: { "X-Robots-Tag": NOINDEX_VALUE },
    })
  }
  const authHeader = request.headers.get("authorization") ?? ""
  if (authHeader.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice(6))
    const idx = decoded.indexOf(":")
    if (idx > 0) {
      const user = decoded.slice(0, idx)
      const pass = decoded.slice(idx + 1)
      if (user === expectedUser && pass === expectedPass) {
        return null // pass-through
      }
    }
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Paradigm MVP", charset="UTF-8"',
      "X-Robots-Tag": NOINDEX_VALUE,
    },
  })
}

export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // ─── /sales/* gate (B36 #19) ────────────────────────────────────────
  if (SALES_PATH_PATTERN.test(pathname)) {
    const gate = checkBasicAuth(request)
    if (gate) return gate
    // pass-through: noindex 強制 + next-intl skip (sales is not localized content)
    const res = NextResponse.next()
    res.headers.set("X-Robots-Tag", NOINDEX_VALUE)
    return res
  }

  // ─── /report/[slug] (locale-less) → /[locale]/report/[slug] (B33 Phase 2) ───
  // cms_content_blocks.region を lookup → regionToLocale() で正しい locale prefix へ.
  // DB lookup 失敗時は ja fallback (既存挙動維持・UX 優先).
  const rootReport = pathname.match(/^\/report\/([^/]+)$/i)
  if (rootReport) {
    const [, slug] = rootReport
    const locale = await resolveLocaleFromSlug(slug, routing.defaultLocale)
    const dest = `/${locale}/report/${slug}${search}`
    const res = NextResponse.redirect(new URL(dest, request.url), 308)
    res.headers.set("X-Robots-Tag", NOINDEX_VALUE)
    return res
  }

  // ─── /p/ → /report/ unification (308 permanent) ─────────────────────────
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

  // Pattern B: /p/:slug (locale-less) → /:locale/report/:slug
  // B33 Phase 2: region lookup で正しい locale を解決 (旧版は defaultLocale ハードコード)
  const rootP = pathname.match(/^\/p\/([^/]+)$/i)
  if (rootP) {
    const [, slug] = rootP
    const locale = await resolveLocaleFromSlug(slug, routing.defaultLocale)
    const dest = `/${locale}/report/${slug}${search}`
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
    //   File Convention 自動生成 endpoint
    "/((?!api|admin|_next|_vercel|icon|apple-icon|opengraph-image|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|favicon|.*\\..*).*)",
  ],
}
