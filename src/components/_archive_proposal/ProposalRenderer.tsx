"use client"
/**
 * ProposalRenderer.tsx — 提案ページの宣言的 composition オーケストレータ
 *
 * 永久ルール (CLAUDE.md s10-4 提案ページ 4鉄則):
 *   ① Section-per-file
 *   ② Zero hardcoded strings (i18n via messages/proposal/{locale}.json)
 *   ③ Manifest-driven composition (pitch_angle × industry × region × theme)
 *   ④ Pure section components (data + locale + variant の純関数)
 *
 * 使い方: page.tsx から <ProposalRenderer data={prospectData} /> で呼ぶ。
 *   manifest が存在しなければ pitch_angle="loss" + theme="minimal" + locale から
 *   default manifest を自動生成 (旧 AllInOneClient と同等の挙動)。
 */

import { useMemo } from "react"
import type { ProspectData } from "@/lib/proposal/prospect-data"
import {
  buildDefaultManifest,
  isValidManifest,
  type ProposalLayoutManifest,
  type PitchAngle,
} from "@/lib/proposal/manifest"
import { getTheme, themeToCssVars } from "@/lib/proposal/theme"
import { useProposalT } from "@/lib/proposal/i18n"
import { resolveSection } from "./sections/_registry"
import type { SalesRegion } from "@/lib/stores/sales-region"
import { isValidRegion } from "@/lib/stores/sales-region"

export default function ProposalRenderer({
  data,
  onCtaClick,
}: {
  data: ProspectData
  onCtaClick?: () => void
}) {
  // ─── manifest 解決 (DB > 自動生成 fallback) ───
  const manifest = useMemo<ProposalLayoutManifest>(() => {
    // 1) matched_pattern.layout_manifest が DB から来ていればそれを使う
    const dbManifest = (data.matched_pattern as Record<string, unknown> | undefined)?.layout_manifest
    if (isValidManifest(dbManifest)) return dbManifest as ProposalLayoutManifest

    // 2) matched_pattern.pitch_angle / region から自動生成
    const pp = data.matched_pattern as Record<string, unknown> | undefined
    const pitch = (pp?.pitch_angle as PitchAngle | undefined) ?? "loss"
    const rawLocale = (pp?.region as string | undefined)
      ?? (data as ProspectData & { region?: string }).region
      ?? "ja"
    const locale: SalesRegion = isValidRegion(rawLocale) ? rawLocale : "ja"
    return buildDefaultManifest({
      pitch_angle: pitch,
      locale,
      industry: (pp?.industry as string | undefined) ?? data.category,
    })
  }, [data])

  const theme = getTheme(manifest.theme)
  // accent override が manifest に指定されていれば適用
  const themeWithOverride = manifest.accent ? { ...theme, accent: manifest.accent } : theme
  const t = useProposalT(manifest.locale)

  return (
    <div style={themeToCssVars(themeWithOverride)} dir={manifest.locale === "ar" ? "rtl" : "ltr"}>
      {manifest.sections.map((sectionId, idx) => {
        const Section = resolveSection(sectionId)
        if (!Section) return null
        const variant = manifest.section_variants?.[sectionId]
        return (
          <Section
            key={`${sectionId}-${idx}`}
            data={data}
            locale={manifest.locale}
            pitchAngle={manifest.pitch_angle}
            theme={themeWithOverride}
            t={t}
            variant={variant}
            onCtaClick={onCtaClick}
          />
        )
      })}
    </div>
  )
}
