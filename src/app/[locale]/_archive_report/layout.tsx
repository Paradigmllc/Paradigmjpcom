import type { Metadata, ResolvingMetadata } from "next"
import type { ReactNode } from "react"

/**
 * /[locale]/report/* layout — SEO noindex 強制 (Layer 2 / 4層防御の一部)
 *
 * 永久ルール (Appexxme CLAUDE.md s10-5 / Paradigm-HP s10-6 共通・2026-05-03):
 *   /report/ は 1 顧客 1 URL の個別生成ページ = SEO インデックス禁止
 *
 * 4 層 noindex 防御:
 *   Layer 1: HTTP Header X-Robots-Tag       — proxy.ts
 *   Layer 2: HTML <meta name="robots">      — この layout (Metadata API)
 *   Layer 3: robots.txt Disallow            — src/app/robots.ts
 *   Layer 4: canonical 自己参照を出さない    — alternates.canonical 未設定
 *
 * Layer 2 だけでも noindex,nofollow,noarchive,nosnippet,noimageindex を全部出す。
 * 子 page.tsx (use client) は Metadata API を export できないため、layout で固定。
 */
export async function generateMetadata(
  _props: { params: Promise<{ locale: string }> },
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  return {
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        "max-snippet": 0,
        "max-image-preview": "none",
        "max-video-preview": 0,
      },
    },
    // Layer 4: 自己 canonical を出さない (alternates.canonical 不設定)
    // Open Graph / Twitter は個別ページに任せる
  }
}

export default function ReportLayout({ children }: { children: ReactNode }) {
  return children
}
