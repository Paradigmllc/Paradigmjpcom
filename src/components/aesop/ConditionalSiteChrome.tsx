"use client";

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
 *   - LP-only (chrome 全消し): /{locale}/demo/* — 独立した顧客向けフルサイトデモ
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

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import ScrollProgress from "./ScrollProgress";
import LuxuryLoader from "./LuxuryLoader";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import AnnouncementBar from "./AnnouncementBar";
import CookieConsent from "./CookieConsent";
import BackToTop from "./BackToTop";
import PageTransition from "./PageTransition";
import SiteWrapper from "@/components/SiteWrapper";
import DifyChatbot from "@/components/DifyChatbot";
import { localeContentVariant } from "@/lib/locale-map";
import type { HeaderNav, FooterNav } from "@/lib/navigation";

/**
 * SiteFooter prop shape を最小限ミラー (PayloadCMS Settings global から渡される
 * 編集可能 fields). 真のソースは `SiteFooter.tsx::FooterProps`. ここで再宣言
 * しているのは layout boundary を server→client に渡すための middle-man にすぎず、
 * shape は SiteFooter 側に追従させる.
 */
type SiteFooterSettings = {
  contactEmail?: string | null;
  company?: {
    legalName?: string | null;
    representativeName?: string | null;
    registrationNumber?: string | null;
    address?: string | null;
  };
  social?: {
    twitter?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    linkedin?: string | null;
    line?: string | null;
  };
};

/** CMS Settings.announcement 由来の告知バー設定 */
type AnnouncementSettings = {
  enabled: boolean;
  message?: string | null;
  linkLabel?: string | null;
  linkHref?: string | null;
  variant?: "ink" | "accent" | "tech";
};

interface Props {
  children: ReactNode;
  locale: string;
  forceStandalone?: boolean;
  footerSettings: SiteFooterSettings;
  /** PayloadCMS Header global 由来ナビ (null=既定ナビ) */
  headerNav?: HeaderNav | null;
  /** PayloadCMS Footer global 由来ナビ (null=既定フッター) */
  footerNav?: FooterNav | null;
  /** PayloadCMS Settings.announcement 由来の告知バー */
  announcement?: AnnouncementSettings;
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
  if (/^\/[a-z]{2}\/report\//.test(pathname)) return true;
  if (/^\/[a-z]{2}\/opportunity\//.test(pathname)) return true;
  if (/^\/[a-z]{2}\/d\//.test(pathname)) return true;
  if (/^\/[a-z]{2}\/demo\//.test(pathname)) return true;
  if (/^\/[a-z]{2}\/admin(\/|$)/.test(pathname)) return true;
  // /p/{anything} (legacy proposal pages)
  if (/^\/p\//.test(pathname)) return true;
  return false;
}

export default function ConditionalSiteChrome({
  children,
  locale,
  forceStandalone = false,
  footerSettings,
  headerNav,
  footerNav,
  announcement,
}: Props) {
  const pathname = usePathname();

  // Public demo URLs are shortened to /{locale}/{slug} on demo.paradigmjp.com,
  // so the hostname is the only reliable signal after the reverse proxy.
  const [isDemoHostname, setIsDemoHostname] = useState(forceStandalone);
  useEffect(() => {
    setIsDemoHostname(window.location.hostname === "demo.paradigmjp.com");
  }, []);

  if (isLpRoute(pathname) || isDemoHostname) {
    // LP モード: chrome 一切なし・i18n / theme provider は親 layout に残るので
    // ここでは children のみ返す. report page 側で独自 LP UI を組む.
    return <>{children}</>;
  }

  const announcementActive = Boolean(
    announcement?.enabled && announcement?.message,
  );

  // 通常 site chrome
  return (
    <>
      <div className="relative z-10">
        {announcementActive && (
          <AnnouncementBar
            message={announcement!.message as string}
            linkLabel={announcement!.linkLabel}
            linkHref={announcement!.linkHref}
            variant={announcement!.variant ?? "ink"}
          />
        )}
        <ScrollProgress />
        <LuxuryLoader />
        <SiteHeader nav={headerNav} announcementActive={announcementActive} />
        <SiteWrapper>
          <PageTransition>{children}</PageTransition>
        </SiteWrapper>
        <SiteFooter settings={footerSettings} nav={footerNav} />
        <CookieConsent />
        <BackToTop />
      </div>
      {/* DifyChatbot は ja/en の 2 bot のみ存在 (Plan B 母版).
          localeContentVariant() で 12 locale を ja/en に collapse — chatbot 側の
          2-variant 制約と一致させ、将来 Dify が他 locale bot を持った時はマップ拡張で対応. */}
      <DifyChatbot locale={localeContentVariant(locale)} />
    </>
  );
}
