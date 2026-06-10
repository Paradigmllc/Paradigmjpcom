/**
 * Report section configuration per variant.
 * Each variant defines which sections to show, their order, and custom props.
 */

import type { DiagnosticReportData } from "@/lib/sales/diagnostic"

export type ReportSectionId =
  | "hero"
  | "stats"
  | "executive_summary"
  | "dark_surface"
  | "benchmark"
  | "findings"
  | "loss_chart"
  | "screenshot"
  | "pain_points"
  | "source_coverage"
  | "timeline"
  | "evidence"
  | "faq"
  | "cta"
  | "meo_map"
  | "meo_reviews"
  | "security_scorecard"
  | "security_timeline"
  | "security_vuln_matrix"
  | "japan_market"
  | "japan_checklist"
  | "japan_roadmap"
  | "video_sample"
  | "video_flow"
  | "subsidy_table"
  | "outreach_funnel"
  | "outreach_test"
  | "five_second_audit"
  | "annotated_screenshot"
  | "competitor_comparison"
  | "market_presence"
  | "before_after"
  | "mobile_comparison"
  | "savior_positioning"
  | "solution_proposal"

export interface SectionConfig {
  id: ReportSectionId
  required?: boolean // Always show even if data is empty
}

export interface VariantLayout {
  variant: string
  label: string
  description: string
  sections: SectionConfig[]
  theme: {
    primary: string     // Primary accent color
    surface: string     // Background surface color
    text: string        // Primary text color
    muted: string       // Muted text color
    border: string      // Border color
  }
  hideGenericSections?: ReportSectionId[] // Sections to hide from the default template
}

// ─── Default layout (website_diagnostic) ───
const DEFAULT_LAYOUT: VariantLayout = {
  variant: "website_diagnostic",
  label: "Web制作診断",
  description: "速度・OGP・技術スタックを軸にしたデータドリブン改善提案",
  sections: [
    { id: "hero" },
    // Phase 1: 共感と問題可視化
    { id: "five_second_audit", required: true },          // 訪問者が5秒で体験する問題
    { id: "annotated_screenshot", required: true },        // 実サイト＋問題点マーカー
    // Phase 2: 競合差（問題認識後だから効く）
    { id: "competitor_comparison", required: true },       // 競合はもう対策済み
    // Phase 2.5: 市場データ
    { id: "market_presence" },
    // Phase 3: 解決可視化
    { id: "stats" },
    { id: "before_after", required: true },                // Before/After
    { id: "mobile_comparison", required: true },            // モバイル比較
    // Phase 4: 救世主
    { id: "savior_positioning", required: true },          // 問題↔解決対比
    // Phase 5: 詳細
    { id: "executive_summary" },
    { id: "dark_surface" },
    { id: "benchmark" },
    { id: "findings" },
    { id: "loss_chart" },
    { id: "screenshot" },
    { id: "pain_points" },
    { id: "source_coverage" },
    { id: "timeline" },
    { id: "evidence" },
    { id: "solution_proposal", required: true },
    { id: "faq" },
    { id: "cta" },
  ],
  theme: {
    primary: "#7c5cff",
    surface: "#fbfaf7",
    text: "text-zinc-950",
    muted: "text-zinc-500",
    border: "border-zinc-200",
  },
  hideGenericSections: [],
}

// ─── MEO layout ───
const MEO_LAYOUT: VariantLayout = {
  variant: "meo",
  label: "MEO・マップ最適化診断",
  description: "Googleマップ表示順位・口コミ・写真・営業時間の総合診断",
  sections: [
    { id: "hero" },
    { id: "stats" },
    { id: "meo_map", required: true },       // ★ マップ埋込＋順位表示
    { id: "meo_reviews", required: true },    // ★ 口コミ分析
    { id: "executive_summary" },
    { id: "findings" },
    { id: "benchmark" },
    { id: "pain_points" },
    { id: "source_coverage" },
    { id: "evidence" },
    { id: "faq" },
    { id: "cta" },
  ],
  theme: {
    primary: "#2d9b4e",
    surface: "#f7fbf8",
    text: "text-zinc-950",
    muted: "text-zinc-500",
    border: "border-emerald-200",
  },
  hideGenericSections: ["dark_surface", "loss_chart", "timeline", "screenshot"],
}

// ─── Security layout ───
const SECURITY_LAYOUT: VariantLayout = {
  variant: "security",
  label: "信頼・セキュリティ診断",
  description: "SSL証明書・脆弱性・セキュリティヘッダーの包括的監査",
  sections: [
    { id: "hero" },
    { id: "security_scorecard", required: true }, // ★ セキュリティスコアカード
    { id: "security_timeline", required: true },   // ★ SSL証明書履歴タイムライン
    { id: "security_vuln_matrix", required: true }, // ★ 脆弱性マトリクス
    { id: "stats" },
    { id: "findings" },
    { id: "loss_chart" },
    { id: "executive_summary" },
    { id: "pain_points" },
    { id: "evidence" },
    { id: "faq" },
    { id: "cta" },
  ],
  theme: {
    primary: "#dc2626",
    surface: "#fef7f7",
    text: "text-zinc-950",
    muted: "text-zinc-500",
    border: "border-rose-200",
  },
  hideGenericSections: ["dark_surface", "benchmark", "source_coverage", "timeline"],
}

// ─── Japan Entry layout ───
const JAPAN_ENTRY_LAYOUT: VariantLayout = {
  variant: "japan_entry",
  label: "日本市場参入診断",
  description: "法規制・決済・消費者信頼の日本市場適合性分析",
  sections: [
    { id: "hero" },
    { id: "japan_market", required: true },      // ★ 市場規模・競合分析
    { id: "japan_checklist", required: true },    // ★ 法規制チェックリスト
    { id: "japan_roadmap", required: true },      // ★ 参入ロードマップ
    { id: "stats" },
    { id: "executive_summary" },
    { id: "findings" },
    { id: "benchmark" },
    { id: "pain_points" },
    { id: "evidence" },
    { id: "faq" },
    { id: "cta" },
  ],
  theme: {
    primary: "#1e40af",
    surface: "#f7f9fe",
    text: "text-zinc-950",
    muted: "text-zinc-500",
    border: "border-blue-200",
  },
  hideGenericSections: ["dark_surface", "loss_chart", "screenshot", "source_coverage", "timeline"],
}

// ─── Video layout ───
const VIDEO_LAYOUT: VariantLayout = {
  variant: "video_subscription",
  label: "動画成長診断",
  description: "動画制作・配信・エンゲージメント最適化",
  sections: [
    { id: "hero" },
    { id: "video_sample", required: true },     // ★ 動画サンプル埋込
    { id: "video_flow", required: true },        // ★ 制作フロー図
    { id: "stats" },
    { id: "findings" },
    { id: "executive_summary" },
    { id: "pain_points" },
    { id: "source_coverage" },
    { id: "evidence" },
    { id: "faq" },
    { id: "cta" },
  ],
  theme: {
    primary: "#7c3aed",
    surface: "#faf7fe",
    text: "text-zinc-950",
    muted: "text-zinc-500",
    border: "border-violet-200",
  },
  hideGenericSections: ["dark_surface", "benchmark", "loss_chart", "screenshot", "timeline"],
}

// ─── Subsidy layout ───
const SUBSIDY_LAYOUT: VariantLayout = {
  variant: "subsidy",
  label: "補助金活用診断",
  description: "活用可能な補助金・助成金のマッチングと申請計画",
  sections: [
    { id: "hero" },
    { id: "subsidy_table", required: true },     // ★ 補助金マッチング表
    { id: "stats" },
    { id: "executive_summary" },
    { id: "findings" },
    { id: "pain_points" },
    { id: "evidence" },
    { id: "faq" },
    { id: "cta" },
  ],
  theme: {
    primary: "#0d9488",
    surface: "#f6fcfb",
    text: "text-zinc-950",
    muted: "text-zinc-500",
    border: "border-teal-200",
  },
  hideGenericSections: ["dark_surface", "benchmark", "loss_chart", "screenshot", "source_coverage", "timeline"],
}

// ─── Outreach layout ───
const OUTREACH_LAYOUT: VariantLayout = {
  variant: "outreach",
  label: "営業自動化診断",
  description: "フォーム検出・送信テスト・コンバージョン分析",
  sections: [
    { id: "hero" },
    { id: "outreach_funnel", required: true },   // ★ コンバージョンファネル
    { id: "outreach_test", required: true },      // ★ 送信テスト結果
    { id: "stats" },
    { id: "executive_summary" },
    { id: "findings" },
    { id: "pain_points" },
    { id: "evidence" },
    { id: "faq" },
    { id: "cta" },
  ],
  theme: {
    primary: "#ea580c",
    surface: "#fffaf7",
    text: "text-zinc-950",
    muted: "text-zinc-500",
    border: "border-orange-200",
  },
  hideGenericSections: ["dark_surface", "benchmark", "loss_chart", "screenshot", "source_coverage", "timeline"],
}

// ─── DX/AI Package layout ───
const DX_AI_LAYOUT: VariantLayout = {
  variant: "dx_ai_package",
  label: "DX・AI導入診断",
  description: "AI/DX導入の自動化余地・コスト削減・具体的な第一歩を提案",
  sections: [
    { id: "hero" },
    { id: "stats" },
    { id: "executive_summary" },
    { id: "findings" },
    { id: "benchmark" },
    { id: "pain_points" },
    { id: "source_coverage" },
    { id: "evidence" },
    { id: "faq" },
    { id: "cta" },
  ],
  theme: {
    primary: "#7c5cff",
    surface: "#faf7fe",
    text: "text-zinc-950",
    muted: "text-zinc-500",
    border: "border-violet-200",
  },
  hideGenericSections: ["dark_surface", "loss_chart", "screenshot", "timeline"],
}

// ─── Layout registry ───
export const VARIANT_LAYOUTS: Record<string, VariantLayout> = {
  website_diagnostic: DEFAULT_LAYOUT,
  meo: MEO_LAYOUT,
  security: SECURITY_LAYOUT,
  japan_entry: JAPAN_ENTRY_LAYOUT,
  video_subscription: VIDEO_LAYOUT,
  subsidy: SUBSIDY_LAYOUT,
  outreach: OUTREACH_LAYOUT,
  dx_ai_package: DX_AI_LAYOUT,
}

export function getVariantLayout(variant: string): VariantLayout {
  return VARIANT_LAYOUTS[variant] ?? DEFAULT_LAYOUT
}
