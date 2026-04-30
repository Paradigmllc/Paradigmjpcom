/**
 * lib/proposal-templates.ts — Template matching + pattern application logic
 *
 * 役割: 業種データから ProposalTemplate を解決し、PagePattern (DB 管理の
 *       業種×訴求軸オーバーライド) を当てる純関数群。
 * 入力: category / dbTpl / patterns / ProspectMatchContext
 * 出力: ProposalTemplate (resolved)
 *
 * 2026-05-01 audit fix: AE-PHP-1 準拠のため types + data を
 *                      proposal-templates-data.ts に分離。
 */

// Re-export types + data for backward compatibility (consumers continue
// importing from "@/lib/proposal-templates" without code changes).
export type {
  DemoTabContent,
  DemoTab,
  ProposalTemplate,
} from "./proposal-templates-data"
export { PROPOSAL_TEMPLATES } from "./proposal-templates-data"

import { PROPOSAL_TEMPLATES, type ProposalTemplate, type DemoTab } from "./proposal-templates-data"

export function matchTemplate(category?: string): ProposalTemplate {
  if (!category) return PROPOSAL_TEMPLATES.find(t => t.id === "general")!
  const cat = category.toLowerCase()
  for (const { id, pattern } of INDUSTRY_PATTERNS) {
    if (pattern.test(cat)) return PROPOSAL_TEMPLATES.find(t => t.id === id)!
  }
  return PROPOSAL_TEMPLATES.find(t => t.id === "general")!
}

// ─── DBテンプレート → ProposalTemplate変換 ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbTemplateToProposal(dbTpl: Record<string, any>): ProposalTemplate {
  return {
    id: dbTpl.template_key || dbTpl.id,
    name: dbTpl.name || "テンプレート",
    industry: dbTpl.industry || "全業種",
    accent: dbTpl.accent_color || dbTpl.accent || "#00D48B",
    accent2: dbTpl.accent2 || dbTpl.accent_color || "#00B377",
    gradient: dbTpl.gradient || "linear-gradient(140deg, #070B0F 0%, #0A1219 30%, #0A0E12 100%)",
    copy_tone: dbTpl.copy_tone || "balanced",
    cta_text: dbTpl.cta_text || "無料で相談する（15分）",
    cta_url: dbTpl.cta_url || "https://cal.appexx.me",
    demo_tabs: dbTpl.demo_tabs || [
      { key: "home", label: "ホーム" },
      { key: "reviews", label: "レビュー管理" },
      { key: "menu", label: "サービス" },
    ],
    stats: dbTpl.stats || [],
    testimonials: dbTpl.testimonials || [],
    loss_context: dbTpl.loss_context || "",
    badge_features: dbTpl.badge_features || [],
    section_order: dbTpl.section_order || ["hook", "diagnostic", "reciprocity", "prospect", "bandwagon", "cta"],
    hook_headline: dbTpl.hook_headline,
    hook_sub: dbTpl.hook_sub,
    pain_headline: dbTpl.pain_headline,
    pain_desc: dbTpl.pain_desc,
    reciprocity_headline: dbTpl.reciprocity_headline,
    bandwagon_headline: dbTpl.bandwagon_headline,
    cta_subtitle: dbTpl.cta_subtitle,
    trust_points: dbTpl.trust_points,
  }
}

// ─── DB優先テンプレート取得（DB → ハードコードfallback） ─────
export function matchTemplateWithDB(
  category?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbTemplate?: Record<string, any> | null
): ProposalTemplate {
  // DBテンプレートがあればそれを優先
  if (dbTemplate && (dbTemplate.template_key || dbTemplate.accent_color)) {
    return dbTemplateToProposal(dbTemplate)
  }
  // ハードコードfallback
  return matchTemplate(category)
}

// ═══════════════════════════════════════════════════════════════
// 条件分岐パターンマッチングエンジン
// ═══════════════════════════════════════════════════════════════

export interface PatternConditions {
  industries?: string[]     // 業種（いずれかにマッチ）
  tiers?: string[]          // ティア S/A/B/C（いずれか）
  has_email?: boolean       // メール有無
  has_website?: boolean     // HP有無
  prefectures?: string[]    // 都道府県（いずれか）
  groups?: string[]         // リードグループID（いずれか）
  score_min?: number        // match_score >= X
  score_max?: number        // match_score <= X
  products?: string[]       // primary_product（いずれか）
  countries?: string[]      // 国コード（いずれか）
}

export interface PagePattern {
  id: string
  name: string
  description?: string
  conditions: PatternConditions
  template_data: Partial<ProposalTemplate> & Record<string, unknown>
  layout_type: string
  priority: number
  is_active: boolean
}

export interface ProspectMatchContext {
  category?: string
  tier?: string
  has_email?: boolean
  has_website?: boolean
  address?: string          // 都道府県抽出用
  groups?: string[]         // 所属グループID
  match_score?: number
  primary_product?: string
  country?: string
}

// 都道府県リスト（住所から抽出用）
const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
]

function extractPrefecture(address?: string): string | null {
  if (!address) return null
  for (const pref of PREFECTURES) {
    if (address.includes(pref)) return pref
  }
  return null
}

// 単一パターンが条件にマッチするかチェック
function matchesConditions(pattern: PagePattern, ctx: ProspectMatchContext): boolean {
  const c = pattern.conditions
  if (!c || Object.keys(c).length === 0) return true // 空条件 = 常にマッチ（デフォルト）

  // 業種マッチ
  if (c.industries && c.industries.length > 0) {
    if (!ctx.category) return false
    const cat = ctx.category.toLowerCase()
    const matched = c.industries.some(ind => cat.includes(ind.toLowerCase()) || ind.toLowerCase().includes(cat))
    if (!matched) return false
  }

  // ティアマッチ
  if (c.tiers && c.tiers.length > 0) {
    if (!ctx.tier || !c.tiers.includes(ctx.tier)) return false
  }

  // メール有無
  if (c.has_email !== undefined && c.has_email !== null) {
    if (ctx.has_email !== c.has_email) return false
  }

  // HP有無
  if (c.has_website !== undefined && c.has_website !== null) {
    if (ctx.has_website !== c.has_website) return false
  }

  // 都道府県
  if (c.prefectures && c.prefectures.length > 0) {
    const pref = extractPrefecture(ctx.address)
    if (!pref || !c.prefectures.includes(pref)) return false
  }

  // グループ
  if (c.groups && c.groups.length > 0) {
    if (!ctx.groups || !ctx.groups.some(g => c.groups!.includes(g))) return false
  }

  // スコア範囲
  if (c.score_min !== undefined && (ctx.match_score === undefined || ctx.match_score < c.score_min)) return false
  if (c.score_max !== undefined && (ctx.match_score === undefined || ctx.match_score > c.score_max)) return false

  // primary_product
  if (c.products && c.products.length > 0) {
    if (!ctx.primary_product || !c.products.includes(ctx.primary_product)) return false
  }

  // 国コード
  if (c.countries && c.countries.length > 0) {
    if (!ctx.country || !c.countries.includes(ctx.country)) return false
  }

  return true
}

// パターン一覧からprospectに最適なパターンを選択
// A/Bテスト: 同一優先度のパターンが複数マッチした場合ランダムで1つ選択
export function selectPattern(patterns: PagePattern[], ctx: ProspectMatchContext): PagePattern | null {
  const sorted = [...patterns].filter(p => p.is_active).sort((a, b) => b.priority - a.priority)

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    if (!matchesConditions(p, ctx)) continue

    // 同一優先度のマッチパターンを全て集める（A/Bテスト用）
    const samePriority = [p]
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].priority !== p.priority) break
      if (matchesConditions(sorted[j], ctx)) samePriority.push(sorted[j])
    }

    // 複数ある場合はランダム選択（A/Bテスト）
    if (samePriority.length > 1) {
      return samePriority[Math.floor(Math.random() * samePriority.length)]
    }
    return p
  }

  return null
}

// パターンのtemplate_dataをProposalTemplateにマージ
export function applyPatternToTemplate(
  baseTemplate: ProposalTemplate,
  pattern: PagePattern
): ProposalTemplate {
  const td = pattern.template_data
  // Sanitize AI-generated arrays: ensure each item's fields are strings (prevent React "Objects are not valid as React child" crash)
  const safeStats: ProposalTemplate["stats"] | undefined = Array.isArray(td.stats)
    ? td.stats.map((s: Record<string, unknown>) => ({
        num: String(s?.num ?? ""),
        label: String(s?.label ?? ""),
        sub: String(s?.sub ?? ""),
      }))
    : undefined
  const safeTestimonials: ProposalTemplate["testimonials"] | undefined = Array.isArray(td.testimonials)
    ? td.testimonials.map((t: Record<string, unknown>) => ({
        avatar: String(t?.avatar ?? "👤"),
        name: String(t?.name ?? ""),
        biz: String(t?.biz ?? ""),
        result: String(t?.result ?? ""),
      }))
    : undefined
  return {
    ...baseTemplate,
    ...(td.accent ? { accent: String(td.accent) } : {}),
    ...(td.accent2 ? { accent2: String(td.accent2) } : {}),
    ...(td.gradient ? { gradient: String(td.gradient) } : {}),
    ...(td.copy_tone ? { copy_tone: String(td.copy_tone) } : {}),
    ...(td.cta_text ? { cta_text: String(td.cta_text) } : {}),
    ...(td.cta_url ? { cta_url: String(td.cta_url) } : {}),
    ...(td.cta_subtitle ? { cta_subtitle: String(td.cta_subtitle) } : {}),
    ...(td.hook_sub ? { hook_sub: String(td.hook_sub) } : {}),
    ...(td.pain_headline ? { pain_headline: String(td.pain_headline) } : {}),
    ...(td.pain_desc ? { pain_desc: String(td.pain_desc) } : {}),
    ...(td.reciprocity_headline ? { reciprocity_headline: String(td.reciprocity_headline) } : {}),
    ...(td.bandwagon_headline ? { bandwagon_headline: String(td.bandwagon_headline) } : {}),
    ...(td.loss_context ? { loss_context: String(td.loss_context) } : {}),
    ...(td.demo_tabs ? { demo_tabs: td.demo_tabs as DemoTab[] } : {}),
    ...(safeStats ? { stats: safeStats } : {}),
    ...(safeTestimonials ? { testimonials: safeTestimonials } : {}),
    ...(Array.isArray(td.badge_features) ? { badge_features: (td.badge_features as Record<string, unknown>[]).map((f) => ({ icon: String(f?.icon ?? ""), title: String(f?.title ?? ""), sub: String(f?.sub ?? "") })) } : {}),
    ...(td.section_order ? { section_order: td.section_order as string[] } : {}),
  }
}

// 完全マッチングフロー: DBパターン → 業種テンプレート → デフォルト
export function matchTemplateWithPatterns(
  patterns: PagePattern[],
  ctx: ProspectMatchContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbTemplate?: Record<string, any> | null
): { template: ProposalTemplate; pattern: PagePattern | null } {
  // 1. DBパターンからマッチ
  const pattern = selectPattern(patterns, ctx)

  // 2. ベーステンプレート取得（DB or ハードコード）
  const base = matchTemplateWithDB(ctx.category, dbTemplate)

  // 3. パターンのtemplate_dataでオーバーライド
  if (pattern) {
    return { template: applyPatternToTemplate(base, pattern), pattern }
  }

  return { template: base, pattern: null }
}
