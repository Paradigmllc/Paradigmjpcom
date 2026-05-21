/**
 * AnnouncementBar — サイト最上部の告知バー (CMS 編集可能・Settings.announcement 由来)
 *
 * 2026-05-21 管理画面拡張で追加。admin が Settings > お知らせバー で文言・リンク・
 * 配色を編集し enabled で表示制御する。enabled=false (既定) のときは
 * ConditionalSiteChrome 側で描画されないため本コンポーネントは表示されない。
 *
 * 設計: fixed top-0 z-[60] (header より上)。表示時は SiteHeader を top-9 に
 *   ずらして重なりを避ける (ConditionalSiteChrome が announcementActive を渡す)。
 *   非表示が既定なので通常レイアウトには影響しない。
 *
 * AE-PHP-2: visible string は props 経由 (CMS)。ハードコード無し。
 */

import { Link } from "@/i18n/routing"

export interface AnnouncementBarProps {
  message: string
  linkLabel?: string | null
  linkHref?: string | null
  variant?: "ink" | "accent" | "tech"
}

const VARIANT_CLASS: Record<NonNullable<AnnouncementBarProps["variant"]>, string> = {
  ink: "bg-paradigm-ink text-paradigm-paper",
  accent: "bg-paradigm-accent text-white",
  tech: "bg-paradigm-tech text-white",
}

export default function AnnouncementBar({ message, linkLabel, linkHref, variant = "ink" }: AnnouncementBarProps) {
  return (
    <div
      className={`fixed top-0 inset-x-0 z-[60] h-9 flex items-center justify-center px-4 text-[12px] tracking-wide ${VARIANT_CLASS[variant]}`}
      role="region"
      aria-label="お知らせ"
    >
      <p className="truncate">
        {message}
        {linkLabel && linkHref && (
          <Link href={linkHref} className="ml-3 underline underline-offset-2 hover:opacity-80 whitespace-nowrap">
            {linkLabel}
          </Link>
        )}
      </p>
    </div>
  )
}
