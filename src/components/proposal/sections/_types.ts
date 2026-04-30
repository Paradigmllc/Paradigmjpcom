/**
 * proposal/sections/_types.ts — section component の共通 props
 *
 * 永久ルール: section component は (data, locale, theme, t) のみで動作する純関数。
 * 業種知識・region 知識を持たない。manifest が決めた variant + theme を受けて
 * 「与えられたデータをその見せ方で render する」役割に専念する。
 */
import type { ProspectData } from "@/app/[locale]/p/[slug]/AllInOneClient"
import type { ProposalLayoutManifest } from "@/lib/proposal/manifest"
import type { ProposalTheme } from "@/lib/proposal/theme"
import type { ProposalT } from "@/lib/proposal/i18n"

export interface SectionProps {
  /** prospect (リード) データ */
  data: ProspectData
  /** UI 言語 */
  locale: ProposalLayoutManifest["locale"]
  /** 訴求角度 */
  pitchAngle: ProposalLayoutManifest["pitch_angle"]
  /** テーマ (CSS 変数経由でアクセスも可) */
  theme: ProposalTheme
  /** 翻訳関数 */
  t: ProposalT
  /** このセクションのバリアント (manifest.section_variants[id]) */
  variant?: string
  /** CTA クリックなどのコールバック */
  onCtaClick?: () => void
}
