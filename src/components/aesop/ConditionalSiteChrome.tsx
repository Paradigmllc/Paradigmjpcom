"use client"

/**
 * ConditionalSiteChrome — single source of truth for "should this page render
 * the paradigmjp.com site chrome (header / footer / cookie / scroll-progress /
 * back-to-top / chatbot) or render as a standalone LP?"
 *
 * 設計 (2026-05-10 ユーザー指示):
 *   "paradigmjp.com/[]/report/企業名 で公開するが、LP形式なのでヘッダー
 *    フッターなどは踏襲なくてOK"
 *
 * 適用範囲:
 *   - LP-only (chrome 全消し): /{locale}/report/* — 顧客向け診断レポート (B36 MVP)
 *   - LP-only (chrome 全消し): /p/* — レガシー営業提案ページ (旧 ProposalRenderer)
 *   - 通常 site chrome: それ以外の全ページ
 *
 * AE-2 / AE-4 準拠: chrome の表示判定は本ファイル 1 箇所に集約.
 * 各 chrome component (SiteHeader / DifyChatbot 等) で個別に pathname check
 * していた duplicate logic は段階的に本 wrapper に統合する.
 *
 * Why client component? `usePathname()` は client 限定. layout 側は server
 * component のまま、props で server-side fetched settings を渡す.
 */

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import ScrollProgress from "./ScrollProgress"
import LuxuryLoader from "./LuxuryLoader"
import SiteHeader from "./SiteHeader"
import SiteFooter from "./SiteFooter"
import CookieConsent from "./CookieConsent"
import BackToTop from "./BackToTop"
import PageTransition from "./PageTransition"
import SiteWrapper from "@/components/SiteWrapper"
import DifyChatbot from "@/components/DifyChatbot"

/**
 * SiteFooter prop shape を最小限ミラー (PayloadCMS Settings global から渡される
 * 編集可能 fields). 真のソースは `SiteFooter.tsx::FooterProps`. ここで再宣言
 * しているのは layout boundary を server→client に渡すための middle-man にすぎず、
 * shape は SiteFooter 側に追従させる.
 */
type SiteFooterSettings = {
  contactEmail?: string | null
  social?: {
    twitter?: string | null
    instagram?: string | null
    facebook?: string | null
    linkedin?: string | null
    line?: string | null
  }
}

interface Props {
  children: ReactNode
  locale: string
  footerSettings: SiteFooterSettings
}

/**
 * LP-only paths — chrome を一切描画しない.
 * - `/{locale}/report/{slug}` : B36 MVP 診断レポート公開ページ
 * - `/p/*`                    : 旧 ProposalRenderer 経由の営業提案ページ
 *
 * 判定は `pathname.includes()` ではなく `match()` で precision を上げ、
 * 例えば将来 `/about/report-format` のような同名 segment が混入しても誤爆しない.
 */
function isLpRoute(pathname: string): boolean {
  // /{2-letter-locale}/report/{anything} に厳密一致
  if (/^\/[a-z]{2}\/report\//.test(pathname)) return true
  // /p/{anything} (legacy proposal pages)
  if (/^\/p\//.test(pathname)) return true
  return false
}

export default function ConditionalSiteChrome({ children, locale, footerSettings }: Props) {
  const pathname = usePathname()

  if (isLpRoute(pathname)) {
    // LP モード: chrome 一切なし・i18n / theme provider は親 layout に残るので
    // ここでは children のみ返す. report page 側で独自 LP UI を組む.
    return <>{children}</>
  }

  // 通常 site chrome
  return (
    <>
      <div className="relative z-10">
        <ScrollProgress />
        <LuxuryLoader />
        <SiteHeader />
        <SiteWrapper>
          <PageTransition>{children}</PageTransition>
        </SiteWrapper>
        <SiteFooter settings={footerSettings} />
        <CookieConsent />
        <BackToTop />
      </div>
      {/* DifyChatbot は ja/en のみ最適化（残10ロケールは en にフォールバック） */}
      <DifyChatbot locale={(locale === "ja" ? "ja" : "en") as "ja" | "en"} />
    </>
  )
}
