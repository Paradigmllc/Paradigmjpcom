/**
 * proposal/manifest.ts — 提案ページ宣言的 composition
 *
 * 永久ルール (CLAUDE.md s10-4 提案ページ 4鉄則):
 *   ③ Manifest-driven composition — JSX レベルの if/else 業種分岐禁止
 *
 * Why this exists:
 *   2117行のモノリシックを再発させないため、業種・訴求角度・地域による
 *   違いをデータ (manifest) として表現し、JSX 側は manifest を読んで
 *   render するだけにする。新業種追加 = manifest 行追加・コード触らず。
 *
 * 多次元 personalization:
 *   pitch_angle × industry × region = 720 通り (6 × 10 × 12) を DB で管理
 */
import type { SalesRegion } from "@/lib/stores/sales-region"

// ─── Pitch Angle (訴求角度・6種) ──────────────────────────────────────
// パーソナライズ営業の核心: ワンパターンでは響かないため、訴求角度ごとに
// セクション構成・コピー・トーンが根本的に変わる
export type PitchAngle =
  | "loss"        // 損失フレーム: "年間XX万円失っていませんか?" — PAIN先頭・恐怖訴求
  | "opportunity" // 機会フレーム: "これだけのトラフィックを変換できれば..." — VISION先頭・上昇訴求
  | "trust"       // 信頼フレーム: "業界実績10年のParadigm" — CASES + WHYUS主役・権威訴求
  | "urgency"     // 緊急フレーム: "規制対応 / GDPR罰金" — 期限+カウントダウン
  | "competitive" // 比較フレーム: "競合は既に..." — BENCHMARK主役・FOMO訴求
  | "compliance"  // 規制対応フレーム: "新法令適合" — 義務+リスク

export const PITCH_ANGLES: PitchAngle[] = [
  "loss", "opportunity", "trust", "urgency", "competitive", "compliance",
]

// ─── Section ID (登録済みセクションのみ) ──────────────────────────────
export type SectionId =
  | "nav"
  | "hero"
  | "kpi-cards"
  | "diagnosis"
  | "pain"           // 損失/機会損失セクション
  | "remotion-video" // パーソナライズ動画埋め込み (Hero Video Dialog)
  | "demo"           // 制作イメージ
  | "reciprocity"    // AI返信サンプル等の "give" セクション
  | "market-trend"
  | "case-studies"
  | "why-us"
  | "faq"
  | "cta"
  | "footer"

export const ALL_SECTIONS: SectionId[] = [
  "nav", "hero", "kpi-cards", "diagnosis", "pain", "remotion-video",
  "demo", "reciprocity", "market-trend", "case-studies", "why-us", "faq", "cta", "footer",
]

// ─── Theme ID ────────────────────────────────────────────────────────
export type ThemeId =
  | "minimal"   // Stripe/Linear 系: 白地・薄グレー罫線・控えめアクセント (B2B/SaaS/IT)
  | "premium"   // Apple/Airbnb 系: 大型ヒーロー・ガラス質感・gradient ブロブ (飲食/美容/ホテル)
  | "editorial" // Notion/Vercel 系: 雑誌的・タイポ強調・Bento Grid (クリエイティブ/メディア)

// ─── Section Variant (各セクション内のレイアウト亜種) ────────────────
// 例: hero に "split-image" "centered" "video-bg" などのバリエーション
export type SectionVariant = string

// ─── Layout Manifest ─────────────────────────────────────────────────
export interface ProposalLayoutManifest {
  /** バージョン (将来の breaking change 対応) */
  version: 1
  /** 訴求角度 (セクション順序の主軸) */
  pitch_angle: PitchAngle
  /** ビジュアルテーマ */
  theme: ThemeId
  /** 描画する section の順序 (この順で render される・nav/footer 自動付与) */
  sections: SectionId[]
  /** 各 section のバリアント (省略時 default) */
  section_variants?: Partial<Record<SectionId, SectionVariant>>
  /** locale (UI 言語) */
  locale: SalesRegion
  /** カスタムアクセント (theme override・hex) */
  accent?: string
  /** 業種カテゴリ (analytics 用) */
  industry?: string
}

// ─── Pitch Angle ごとのデフォルト section 順序 ───────────────────────
export const DEFAULT_SECTIONS_BY_ANGLE: Record<PitchAngle, SectionId[]> = {
  // 損失: 痛み先・即解消提示
  loss: ["nav", "hero", "kpi-cards", "pain", "remotion-video", "reciprocity", "demo", "case-studies", "cta", "footer"],
  // 機会: vision先・上昇訴求
  opportunity: ["nav", "hero", "remotion-video", "demo", "market-trend", "kpi-cards", "case-studies", "why-us", "cta", "footer"],
  // 信頼: 実績主役
  trust: ["nav", "hero", "case-studies", "why-us", "kpi-cards", "diagnosis", "demo", "cta", "footer"],
  // 緊急: 期限+CTA早期
  urgency: ["nav", "hero", "pain", "cta", "kpi-cards", "remotion-video", "demo", "footer"],
  // 比較: ベンチマーク主役
  competitive: ["nav", "hero", "kpi-cards", "market-trend", "case-studies", "demo", "cta", "footer"],
  // 規制: 義務 + リスク
  compliance: ["nav", "hero", "pain", "diagnosis", "remotion-video", "case-studies", "cta", "footer"],
}

// ─── Pitch Angle ごとのデフォルト theme ──────────────────────────────
export const DEFAULT_THEME_BY_ANGLE: Record<PitchAngle, ThemeId> = {
  loss: "minimal",         // 客観的データで訴える
  opportunity: "premium",  // 高揚感
  trust: "editorial",      // 落ち着き・読み物感
  urgency: "minimal",      // ノイズなし・行動だけ
  competitive: "editorial", // データジャーナリズム的
  compliance: "minimal",   // 真面目・誠実
}

// ─── Helper: pitch angle + region + industry から manifest 自動生成 ──
export function buildDefaultManifest(input: {
  pitch_angle: PitchAngle
  locale: SalesRegion
  industry?: string
  override?: Partial<ProposalLayoutManifest>
}): ProposalLayoutManifest {
  return {
    version: 1,
    pitch_angle: input.pitch_angle,
    theme: DEFAULT_THEME_BY_ANGLE[input.pitch_angle],
    sections: DEFAULT_SECTIONS_BY_ANGLE[input.pitch_angle],
    locale: input.locale,
    industry: input.industry,
    ...input.override,
  }
}

// ─── Manifest validator (DB から読んだ JSON を型確定する) ────────────
export function isValidManifest(obj: unknown): obj is ProposalLayoutManifest {
  if (!obj || typeof obj !== "object") return false
  const m = obj as Record<string, unknown>
  if (m.version !== 1) return false
  if (typeof m.pitch_angle !== "string" || !PITCH_ANGLES.includes(m.pitch_angle as PitchAngle)) return false
  if (typeof m.theme !== "string") return false
  if (!Array.isArray(m.sections)) return false
  if (typeof m.locale !== "string") return false
  return true
}
