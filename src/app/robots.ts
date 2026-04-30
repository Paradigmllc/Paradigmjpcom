import type { MetadataRoute } from "next"

/**
 * robots.ts — クローラー制御 (2026-04-30 SEO/GEO 抜本対策強化)
 *
 * 永久ルール (CLAUDE.md s10-6 AE-PHP-3):
 *   - /api/ 全部 disallow (sensitive endpoints)
 *   - /admin/ 全部 disallow (Payload admin UI)
 *   - draft 状態のページは noindex (?draft=true パラメータ)
 *   - GEO crawler (GPTBot/PerplexityBot/ClaudeBot) は許可 (LLM 引用最適化のため)
 *   - sitemap.xml への明示的 link
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/_next/",
          "/private/",
          "/*?draft=true",
        ],
      },
      // ─── GEO (AI 検索) クローラー優遇 ───
      // 引用されることが SEO 価値 → 明示的に許可しブロックは最小限
      { userAgent: "GPTBot", allow: "/", disallow: ["/api/", "/admin/"] },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: ["/api/", "/admin/"] },
      { userAgent: "PerplexityBot", allow: "/", disallow: ["/api/", "/admin/"] },
      { userAgent: "ClaudeBot", allow: "/", disallow: ["/api/", "/admin/"] },
      { userAgent: "Google-Extended", allow: "/", disallow: ["/api/", "/admin/"] },
    ],
    sitemap: "https://paradigmjp.com/sitemap.xml",
    host: "https://paradigmjp.com",
  }
}
