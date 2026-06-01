export const VIDEO_TARGET_SEGMENTS = [
  "agency_white_label",
  "saas_marketing",
  "ec_brand",
  "local_smb",
  "youtube_creator",
  "jaas_bundle",
  "gtm_engineering",
] as const

export type VideoTargetSegment = (typeof VIDEO_TARGET_SEGMENTS)[number]

export const VIDEO_OFFER_ANGLES = [
  "lost_revenue",
  "competitor_momentum",
  "market_window",
  "production_cost",
  "japan_entry_gap",
  "local_trust_gap",
] as const

export type VideoOfferAngle = (typeof VIDEO_OFFER_ANGLES)[number]

export interface VideoLossInputs {
  monthlyRejectedProjects?: number
  averageProjectValueUsd?: number
  monthlyVideoBudgetUsd?: number
  currentVideosPerMonth?: number
  competitorVideosPerMonth?: number
  grossMarginPercent?: number
}

export interface VideoLossSimulation {
  currency: "USD"
  monthly_loss_usd: number
  annual_loss_usd: number
  confidence: "operator_estimate"
  formula: string
  assumptions: string[]
  customer_safe_summary_ja: string
  customer_safe_summary_en: string
  verification_status: "estimate_only"
  customer_copy_allowed: boolean
}

export interface VideoClaimGuard {
  requires_primary_source_verification: true
  blocked_claim_types: string[]
  allowed_without_source: string[]
  customer_copy_policy_ja: string
  customer_copy_policy_en: string
  dify_instruction_ja: string
  dify_instruction_en: string
  verified_sources: Array<{ claim: string; primary_source_url: string }>
}

export const VIDEO_SEGMENT_LABELS: Record<VideoTargetSegment, string> = {
  agency_white_label: "代理店ホワイトラベル",
  saas_marketing: "SaaSマーケティング",
  ec_brand: "ECブランド",
  local_smb: "ローカルSMB",
  youtube_creator: "YouTube / クリエイター",
  jaas_bundle: "日本参入パッケージ",
  gtm_engineering: "GTMエンジニアリング",
}

export const VIDEO_OFFER_ANGLE_LABELS: Record<VideoOfferAngle, string> = {
  lost_revenue: "失っている収益",
  competitor_momentum: "競合が先に動いている",
  market_window: "市場の窓が閉じる",
  production_cost: "制作コスト削減",
  japan_entry_gap: "日本参入ギャップ",
  local_trust_gap: "地域信頼ギャップ",
}

const SEGMENT_DEFAULTS: Record<VideoTargetSegment, Required<VideoLossInputs>> = {
  agency_white_label: {
    monthlyRejectedProjects: 2,
    averageProjectValueUsd: 5000,
    monthlyVideoBudgetUsd: 2500,
    currentVideosPerMonth: 1,
    competitorVideosPerMonth: 6,
    grossMarginPercent: 55,
  },
  saas_marketing: {
    monthlyRejectedProjects: 3,
    averageProjectValueUsd: 3500,
    monthlyVideoBudgetUsd: 3000,
    currentVideosPerMonth: 2,
    competitorVideosPerMonth: 8,
    grossMarginPercent: 70,
  },
  ec_brand: {
    monthlyRejectedProjects: 4,
    averageProjectValueUsd: 1800,
    monthlyVideoBudgetUsd: 2800,
    currentVideosPerMonth: 2,
    competitorVideosPerMonth: 10,
    grossMarginPercent: 45,
  },
  local_smb: {
    monthlyRejectedProjects: 3,
    averageProjectValueUsd: 900,
    monthlyVideoBudgetUsd: 900,
    currentVideosPerMonth: 0,
    competitorVideosPerMonth: 4,
    grossMarginPercent: 50,
  },
  youtube_creator: {
    monthlyRejectedProjects: 2,
    averageProjectValueUsd: 1200,
    monthlyVideoBudgetUsd: 1400,
    currentVideosPerMonth: 4,
    competitorVideosPerMonth: 12,
    grossMarginPercent: 60,
  },
  jaas_bundle: {
    monthlyRejectedProjects: 2,
    averageProjectValueUsd: 6500,
    monthlyVideoBudgetUsd: 3200,
    currentVideosPerMonth: 1,
    competitorVideosPerMonth: 6,
    grossMarginPercent: 55,
  },
  gtm_engineering: {
    monthlyRejectedProjects: 2,
    averageProjectValueUsd: 8000,
    monthlyVideoBudgetUsd: 3800,
    currentVideosPerMonth: 1,
    competitorVideosPerMonth: 7,
    grossMarginPercent: 65,
  },
}

export const VIDEO_PIPELINE_STAGES = [
  { id: "brief", label: "企画ブリーフ作成", owner: "Dify / DeepSeek", gate: "企業カルテと訴求軸がそろっている" },
  { id: "storyboard", label: "絵コンテ・字幕・CTA", owner: "Sales OS", gate: "未検証の断定を入れず、推定値は推定と明記する" },
  { id: "asset_prompts", label: "ComfyUI素材指示", owner: "n8n -> ComfyUI", gate: "ブランド・業界・用途に合う素材だけ生成する" },
  { id: "gpu_route", label: "Vast.ai GPU割当", owner: "n8n -> Vast.ai", gate: "動画サブスクや重いComfyUI生成だけGPUを起動する" },
  { id: "render", label: "HyperFrames / Remotionレンダー", owner: "Renderer", gate: "営業動画は軽量レンダーを優先する" },
  { id: "review", label: "Slack / Appsmith確認", owner: "Human", gate: "初回納品・契約前・危険表現は人間確認へ戻す" },
  { id: "delivery", label: "R2配信・Twenty記録", owner: "Sales OS", gate: "URLと納品ステータスをSSOTへ保存する" },
] as const

export function isVideoTargetSegment(value: unknown): value is VideoTargetSegment {
  return typeof value === "string" && (VIDEO_TARGET_SEGMENTS as readonly string[]).includes(value)
}

export function isVideoOfferAngle(value: unknown): value is VideoOfferAngle {
  return typeof value === "string" && (VIDEO_OFFER_ANGLES as readonly string[]).includes(value)
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function defaultVideoLossInputs(segment: VideoTargetSegment): Required<VideoLossInputs> {
  return { ...SEGMENT_DEFAULTS[segment] }
}

export function buildVideoLossSimulation(input: {
  segment: VideoTargetSegment
  offerAngle: VideoOfferAngle
  inputs?: VideoLossInputs
}): VideoLossSimulation {
  const defaults = SEGMENT_DEFAULTS[input.segment]
  const merged = {
    monthlyRejectedProjects: boundedNumber(input.inputs?.monthlyRejectedProjects, defaults.monthlyRejectedProjects, 0, 100),
    averageProjectValueUsd: boundedNumber(input.inputs?.averageProjectValueUsd, defaults.averageProjectValueUsd, 0, 1_000_000),
    monthlyVideoBudgetUsd: boundedNumber(input.inputs?.monthlyVideoBudgetUsd, defaults.monthlyVideoBudgetUsd, 0, 1_000_000),
    currentVideosPerMonth: boundedNumber(input.inputs?.currentVideosPerMonth, defaults.currentVideosPerMonth, 0, 500),
    competitorVideosPerMonth: boundedNumber(input.inputs?.competitorVideosPerMonth, defaults.competitorVideosPerMonth, 0, 500),
    grossMarginPercent: boundedNumber(input.inputs?.grossMarginPercent, defaults.grossMarginPercent, 0, 100),
  }
  const rejectedProfit =
    merged.monthlyRejectedProjects * merged.averageProjectValueUsd * (merged.grossMarginPercent / 100)
  const contentGap = Math.max(0, merged.competitorVideosPerMonth - merged.currentVideosPerMonth)
  const gapPenalty = Math.round(contentGap * Math.max(merged.averageProjectValueUsd * 0.08, merged.monthlyVideoBudgetUsd * 0.25))
  const monthlyLoss = Math.round(rejectedProfit + gapPenalty)
  const annualLoss = monthlyLoss * 12
  const segmentLabel = VIDEO_SEGMENT_LABELS[input.segment]
  const angleLabel = VIDEO_OFFER_ANGLE_LABELS[input.offerAngle]

  return {
    currency: "USD",
    monthly_loss_usd: monthlyLoss,
    annual_loss_usd: annualLoss,
    confidence: "operator_estimate",
    formula:
      "monthlyRejectedProjects * averageProjectValueUsd * grossMarginPercent + contentGap * max(projectValue * 8%, monthlyVideoBudget * 25%)",
    assumptions: [
      `${segmentLabel}向けの初期仮説です。`,
      `訴求軸は「${angleLabel}」です。`,
      `月間失注 ${merged.monthlyRejectedProjects}件、平均案件単価 $${merged.averageProjectValueUsd.toLocaleString()}、粗利率 ${merged.grossMarginPercent}% として試算しています。`,
      `競合との動画本数差 ${contentGap}本/月を、信頼・比較検討での機会損失として控えめに加算しています。`,
    ],
    customer_safe_summary_ja: `公開データとヒアリング前の仮説に基づく推定では、動画導線の不足により年間約 $${annualLoss.toLocaleString()} 規模の機会損失余地があります。`,
    customer_safe_summary_en: `Based on public signals and pre-call assumptions, the video gap may represent an estimated annual opportunity loss of about $${annualLoss.toLocaleString()}.`,
    verification_status: "estimate_only",
    customer_copy_allowed: true,
  }
}

export function buildVideoClaimGuard(): VideoClaimGuard {
  return {
    requires_primary_source_verification: true,
    blocked_claim_types: ["law_effective_date", "fine_amount", "market_size", "cagr", "benchmark_multiplier"],
    allowed_without_source: [
      "operator-provided estimate",
      "company-specific observation from the generated karte",
      "measured PageSpeed or Wappalyzer result",
      "clearly labeled hypothesis",
    ],
    customer_copy_policy_ja:
      "法改正日、罰金額、市場規模、CAGR、業界平均値は一次情報URLがある場合だけ断定する。ない場合は未検証として顧客向け文面から外す。",
    customer_copy_policy_en:
      "Legal dates, penalties, market size, CAGR, and benchmark multipliers require a primary-source URL before customer-facing assertions.",
    dify_instruction_ja:
      "未検証の法改正・罰金額・市場統計・CAGR・業界平均を断定しない。使う場合はprimary_source_urlを添え、ない場合は推定・仮説としても顧客文面から外す。",
    dify_instruction_en:
      "Do not assert unverified legal, penalty, market, CAGR, or benchmark claims. Require primary_source_url, otherwise exclude from customer-facing copy.",
    verified_sources: [],
  }
}
