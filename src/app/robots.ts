import type { MetadataRoute } from "next"

/**
 * robots.ts — クローラー制御 (2026-04-30 SEO/GEO 抜本対策強化 / 2026-05-03 noindex 強化)
 *
 * 永久ルール (CLAUDE.md s10-6 AE-PHP-3 / Appexxme s10-5):
 *   - /api/ 全部 disallow (sensitive endpoints)
 *   - /admin/ 全部 disallow (Payload admin UI)
 *   - /report/ 全部 disallow (個別生成 1顧客1URL・SEO禁止)
 *   - /p/ 全部 disallow (旧 proposal slug shim)
 *   - draft 状態のページは noindex (?draft=true パラメータ)
 *   - GEO crawler (GPTBot/PerplexityBot/ClaudeBot) も /report/ /p/ は禁止
 *   - sitemap.xml への明示的 link
 *
 * 4 層 noindex 防御 (永久ルール):
 *   Layer 1: HTTP Header (X-Robots-Tag) — proxy.ts
 *   Layer 2: HTML <meta name="robots"> — /[locale]/report/[slug]/layout.tsx
 *   Layer 3: robots.txt (この file)
 *   Layer 4: canonical 自己参照を出さない — page.tsx で metadata.alternates.canonical 不設定
 */
const REPORT_DISALLOW = [
  "/report/",        // root 配下 (locale なし入口)
  "/*/report/",      // /:locale/report/* (12 ロケール対応)
  "/p/",             // 旧 proposal shim (root)
  "/*/p/",           // /:locale/p/* (12 ロケール対応)
]

const INTERNAL_DISALLOW = [
  "/_archive",
  "/demo/",
  "/keystatic/",
  "/*/_archive",
  "/*/admin/",
  "/*/cms/",
  "/*/d/",
  "/*/demo/",
  "/*/docs/admin/",
  "/*/sales",
  "/*/studio",
  "/*/themes-showcase",
]

const PUBLIC_CONTENT_API_ALLOW = [
  "/api/v1/content",
  "/api/v1/investor-briefs",
  "/api/v1/investor-scenarios",
]

export default function robots(): MetadataRoute.Robots {
  const baseDisallow = [
    "/api/",
    "/admin/",
    "/_next/",
    "/private/",
    "/*?draft=true",
    ...REPORT_DISALLOW,
    ...INTERNAL_DISALLOW,
  ]

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", ...PUBLIC_CONTENT_API_ALLOW],
        disallow: baseDisallow,
      },
      // ─── GEO (AI 検索) クローラー優遇 ───
      // 引用されることが SEO 価値 → 明示的に許可しブロックは最小限
      // ただし /report/ /p/ は 1顧客1URL = 個人情報相当なので AI bot にも禁止
      { userAgent: "GPTBot", allow: ["/", ...PUBLIC_CONTENT_API_ALLOW], disallow: ["/api/", "/admin/", ...REPORT_DISALLOW, ...INTERNAL_DISALLOW] },
      { userAgent: "OAI-SearchBot", allow: ["/", ...PUBLIC_CONTENT_API_ALLOW], disallow: ["/api/", "/admin/", ...REPORT_DISALLOW, ...INTERNAL_DISALLOW] },
      { userAgent: "ChatGPT-User", allow: ["/", ...PUBLIC_CONTENT_API_ALLOW], disallow: ["/api/", "/admin/", ...REPORT_DISALLOW, ...INTERNAL_DISALLOW] },
      { userAgent: "PerplexityBot", allow: ["/", ...PUBLIC_CONTENT_API_ALLOW], disallow: ["/api/", "/admin/", ...REPORT_DISALLOW, ...INTERNAL_DISALLOW] },
      { userAgent: "ClaudeBot", allow: ["/", ...PUBLIC_CONTENT_API_ALLOW], disallow: ["/api/", "/admin/", ...REPORT_DISALLOW, ...INTERNAL_DISALLOW] },
      { userAgent: "Google-Extended", allow: ["/", ...PUBLIC_CONTENT_API_ALLOW], disallow: ["/api/", "/admin/", ...REPORT_DISALLOW, ...INTERNAL_DISALLOW] },
    ],
    sitemap: "https://paradigmjp.com/sitemap.xml",
    host: "https://paradigmjp.com",
  }
}
