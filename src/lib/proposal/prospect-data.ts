/**
 * lib/proposal/prospect-data.ts — ProspectData type (canonical)
 *
 * 役割: 提案ページが render する diagnostic prospect 1 件のデータ shape。
 *       appexx.me /api/sales-automation get_prospect レスポンスの type contract。
 *
 * 2026-05-01 audit fix: 旧 src/app/[locale]/p/[slug]/AllInOneClient.tsx (2123 行)
 *   から ProspectData 型を分離。AllInOneClient.tsx の retire を可能にする。
 *
 * Consumers:
 *   - src/components/proposal/sections/_types.ts (SectionProps.data)
 *   - src/components/proposal/ProposalRenderer.tsx (props.data)
 *   - src/app/[locale]/report/[slug]/page.tsx (state)
 */

export interface ProspectData {
  id?: string
  slug?: string
  business_name: string
  category: string
  address: string
  rating: number
  review_count: number
  unanswered_reviews: number
  unanswered_english: number
  reply_rate: number
  competitor_avg_reply_rate: number
  competitor_avg_rating: number
  page_speed_mobile: number
  page_speed_desktop: number
  has_website: boolean
  website_url: string | null
  tech_stack: string[]
  vulnerabilities: { name: string; desc: string; level: "critical" | "high" | "mid" }[]
  has_english_page: boolean
  foreign_review_ratio: number
  sample_reviews: string[]
  ai_reply_samples: { original: string; reply: string }[]
  loss_aversion_hook: string
  estimated_monthly_loss: number
  match_score: number
  primary_product: string
  demo_url?: string
  report_url?: string
  ai_analysis?: {
    summary?: string
    executive_summary?: string
    strengths?: string[]
    weaknesses?: string[]
    overall_score?: number
    total_annual_loss_jpy?: number
    estimated_recovery_jpy?: number
    copy?: {
      hook_headline?: string
      hook_sub?: string
      bandwagon_headline?: string
      reciprocity_headline?: string
      trust_points?: string[]
      cta_subtitle?: string
    }
  } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prescriptions?: Array<Record<string, any>>
  reciprocity_package?: {
    name?: string
    priceJpy?: number
    includedDeliverables?: string[]
  } | null
  review_analysis?: {
    strengths?: string[]
    weaknesses?: string[]
    suggestions?: string[]
  } | null
  competitor_analysis?: {
    competitors?: Array<{ name: string; score: number }>
  } | null
  has_sns?: boolean
  has_ads?: boolean
  phone?: string
  email?: string
  visible_sections?: Record<string, boolean> | string[]
  template_accent?: string
  template_cta_text?: string
  template_cta_url?: string
  template_copy_tone?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db_template?: Record<string, any>
  demo_html?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matched_pattern?: Record<string, any>
  // 2026-04-25: 16ツール並列診断 report_snapshot (新エンジン Sales OS v2)。
  // null なら legacy prospect (旧 full_pipeline 経由) で diagnostic セクションは非表示。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  diagnostic_report?: Record<string, any> | null
}
