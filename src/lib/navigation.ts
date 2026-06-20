/**
 * lib/navigation.ts — PayloadCMS Header / Footer global の type-safe reader
 *
 * 役割: admin が編集可能なナビゲーション (Header / Footer global) を Server
 *   Component から取得する単一窓口。lib/settings.ts と同じ設計思想:
 *   - payload local API を dynamic import (client bundle に payload を含めない)
 *   - React cache() でリクエスト内重複排除
 *   - 取得失敗 / 未設定 (navItems 空) は **null を返す** → consumer 側 (SiteHeader /
 *     SiteFooter) は null のとき従来の i18n message ベース既定ナビにフォールバック。
 *     これにより CMS 未投入でも現状の挙動を完全維持し、admin が 1 行入れた瞬間に
 *     CMS 駆動へ切り替わる (非破壊・段階移行)。
 *
 * AE-PHP-7 鉄則: visible content (ナビ構造) を DB 化 + admin 編集可能にする。
 */

import { cache } from "react"
import { withPayloadReadFallback } from "./payload-availability"

export interface NavLink {
  label: string
  href: string
  openInNewTab?: boolean
  children?: NavLink[]
}

export interface HeaderNav {
  items: NavLink[]
  cta: { enabled: boolean; label: string | null; href: string } | null
  showLocaleSwitcher: boolean
  showThemeToggle: boolean
}

export interface FooterColumn {
  heading: string
  links: NavLink[]
}

export interface FooterNav {
  tagline: string | null
  studioLocation: string | null
  columns: FooterColumn[]
  socialLinks: Array<{ platform: string; url: string }>
  legalLinks: NavLink[]
  copyright: string | null
}

/** locale-aware で payload global を取得する共通ヘルパ。失敗時 null。 */
async function findGlobal<T>(slug: string, locale: string): Promise<T | null> {
  return withPayloadReadFallback<T | null>(`navigation.findGlobal(${slug})`, async () => {
    const { getPayload } = await import("payload")
    const config = (await import("@payload-config")).default
    const payload = await getPayload({ config: config as Parameters<typeof getPayload>[0]["config"] })
    const doc = await payload.findGlobal({
      slug: slug as Parameters<typeof payload.findGlobal>[0]["slug"],
      locale: locale as Parameters<typeof payload.findGlobal>[0]["locale"],
      depth: 0,
    })
    return doc as unknown as T
  }, null)
}

type RawNavItem = {
  label?: string | null
  href?: string | null
  openInNewTab?: boolean | null
  children?: RawNavItem[] | null
}

function cleanLinks(rows: RawNavItem[] | null | undefined): NavLink[] {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r): r is RawNavItem => Boolean(r?.label && r?.href))
    .map((r) => ({
      label: r.label as string,
      href: r.href as string,
      openInNewTab: Boolean(r.openInNewTab),
      children: r.children ? cleanLinks(r.children) : undefined,
    }))
}

/**
 * Header global を取得。navItems が空 / 取得失敗なら null (→ 既定ナビ使用)。
 */
export const getHeaderNav = cache(async (locale: string = "ja"): Promise<HeaderNav | null> => {
  const raw = await findGlobal<{
    navItems?: RawNavItem[] | null
    cta?: { enabled?: boolean | null; label?: string | null; href?: string | null } | null
    showLocaleSwitcher?: boolean | null
    showThemeToggle?: boolean | null
  }>("header", locale)

  const items = cleanLinks(raw?.navItems)
  if (items.length === 0) return null // 未設定 → consumer が i18n 既定を使う

  return {
    items,
    cta: raw?.cta
      ? {
          enabled: raw.cta.enabled !== false,
          label: raw.cta.label ?? null,
          href: raw.cta.href ?? "/contact",
        }
      : null,
    showLocaleSwitcher: raw?.showLocaleSwitcher !== false,
    showThemeToggle: raw?.showThemeToggle !== false,
  }
})

/**
 * Footer global を取得。columns が空 / 取得失敗なら null (→ 既定フッター使用)。
 */
export const getFooterNav = cache(async (locale: string = "ja"): Promise<FooterNav | null> => {
  const raw = await findGlobal<{
    tagline?: string | null
    studioLocation?: string | null
    columns?: Array<{ heading?: string | null; links?: RawNavItem[] | null }> | null
    socialLinks?: Array<{ platform?: string | null; url?: string | null }> | null
    legalLinks?: RawNavItem[] | null
    copyright?: string | null
  }>("footer", locale)

  const columns: FooterColumn[] = Array.isArray(raw?.columns)
    ? raw!.columns!
        .filter((c) => Boolean(c?.heading))
        .map((c) => ({ heading: c.heading as string, links: cleanLinks(c.links) }))
    : []
  if (columns.length === 0) return null // 未設定 → consumer が既定を使う

  return {
    tagline: raw?.tagline ?? null,
    studioLocation: raw?.studioLocation ?? null,
    columns,
    socialLinks: Array.isArray(raw?.socialLinks)
      ? raw!.socialLinks!
          .filter((s): s is { platform: string; url: string } => Boolean(s?.platform && s?.url))
          .map((s) => ({ platform: s.platform, url: s.url }))
      : [],
    legalLinks: cleanLinks(raw?.legalLinks),
    copyright: raw?.copyright ?? null,
  }
})
