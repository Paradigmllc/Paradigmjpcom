import { labelForIndustry, themeForIndustry } from "./render-quality"
import type { Industry } from "./types"
import {
  type VideoClaimGuard,
  type VideoLossSimulation,
  type VideoOfferAngle,
  type VideoTargetSegment,
} from "./video-strategy"

export const VIDEO_PRODUCTION_GENRES = [
  "executive_diagnostic",
  "product_demo",
  "case_study",
  "ugc_ad",
  "shorts_reel",
  "webinar_cutdown",
  "explainer_animation",
  "avatar_pitch",
  "testimonial_style",
  "local_service_ad",
  "japan_entry_pitch",
  "subscription_series",
] as const

export const VIDEO_VOICE_STYLES = [
  "calm_consultant",
  "energetic_founder",
  "premium_narrator",
  "friendly_local",
  "bilingual_ja_en",
  "no_voice_music_caption",
] as const

export const VIDEO_AVATAR_STYLES = [
  "none",
  "subtle_presenter",
  "executive_advisor",
  "founder_operator",
  "studio_avatar",
  "brand_character",
] as const

export const VIDEO_CAPTION_STYLES = [
  "burned_in_bilingual",
  "clean_lower_third",
  "karaoke_highlight",
  "srt_vtt_only",
  "social_safe_area",
] as const

export const VIDEO_STORY_FRAMEWORKS = [
  "problem_agitate_solve",
  "before_after_bridge",
  "aida",
  "case_study_arc",
  "myth_truth_proof",
  "three_act_demo",
] as const

export const VIDEO_QUALITY_TIERS = ["draft", "professional", "premium"] as const

export type VideoProductionGenre = (typeof VIDEO_PRODUCTION_GENRES)[number]
export type VideoVoiceStyle = (typeof VIDEO_VOICE_STYLES)[number]
export type VideoAvatarStyle = (typeof VIDEO_AVATAR_STYLES)[number]
export type VideoCaptionStyle = (typeof VIDEO_CAPTION_STYLES)[number]
export type VideoStoryFramework = (typeof VIDEO_STORY_FRAMEWORKS)[number]
export type VideoQualityTier = (typeof VIDEO_QUALITY_TIERS)[number]

export interface VideoProductionProfileInput {
  productionGenre?: unknown
  voiceStyle?: unknown
  avatarStyle?: unknown
  captionStyle?: unknown
  storyFramework?: unknown
  qualityTier?: unknown
}

export interface VideoProductionProfile {
  productionGenre: VideoProductionGenre
  voiceStyle: VideoVoiceStyle
  avatarStyle: VideoAvatarStyle
  captionStyle: VideoCaptionStyle
  storyFramework: VideoStoryFramework
  qualityTier: VideoQualityTier
}

export const VIDEO_PRODUCTION_GENRE_LABELS: Record<VideoProductionGenre, string> = {
  executive_diagnostic: "経営診断レポート",
  product_demo: "プロダクトデモ",
  case_study: "導入事例",
  ugc_ad: "UGC広告風",
  shorts_reel: "ショート動画",
  webinar_cutdown: "ウェビナー切り抜き",
  explainer_animation: "解説アニメーション",
  avatar_pitch: "アバター営業",
  testimonial_style: "お客様の声風",
  local_service_ad: "地域サービス広告",
  japan_entry_pitch: "日本進出ピッチ",
  subscription_series: "月額納品シリーズ",
}

export const VIDEO_VOICE_STYLE_LABELS: Record<VideoVoiceStyle, string> = {
  calm_consultant: "落ち着いたコンサル声",
  energetic_founder: "熱量ある創業者声",
  premium_narrator: "高級感あるナレーター",
  friendly_local: "親しみある地域向け",
  bilingual_ja_en: "日英バイリンガル",
  no_voice_music_caption: "音楽 + 字幕のみ",
}

export const VIDEO_AVATAR_STYLE_LABELS: Record<VideoAvatarStyle, string> = {
  none: "アバターなし",
  subtle_presenter: "控えめな案内役",
  executive_advisor: "経営アドバイザー",
  founder_operator: "実務責任者",
  studio_avatar: "スタジオ登壇者",
  brand_character: "ブランドキャラクター",
}

export const VIDEO_CAPTION_STYLE_LABELS: Record<VideoCaptionStyle, string> = {
  burned_in_bilingual: "焼き込み二言語字幕",
  clean_lower_third: "下部テロップ",
  karaoke_highlight: "強調ハイライト字幕",
  srt_vtt_only: "SRT/VTT納品のみ",
  social_safe_area: "SNS安全領域対応",
}

export const VIDEO_STORY_FRAMEWORK_LABELS: Record<VideoStoryFramework, string> = {
  problem_agitate_solve: "問題提起 -> 損失 -> 解決",
  before_after_bridge: "Before / After / Bridge",
  aida: "AIDA",
  case_study_arc: "事例ストーリー",
  myth_truth_proof: "誤解 -> 真実 -> 根拠",
  three_act_demo: "3幕デモ",
}

export const VIDEO_QUALITY_TIER_LABELS: Record<VideoQualityTier, string> = {
  draft: "下書き",
  professional: "プロ納品",
  premium: "プレミアム",
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && (values as readonly string[]).includes(value)
}

export function normalizeVideoProductionProfile(input: VideoProductionProfileInput = {}): VideoProductionProfile {
  return {
    productionGenre: isOneOf(input.productionGenre, VIDEO_PRODUCTION_GENRES)
      ? input.productionGenre
      : "executive_diagnostic",
    voiceStyle: isOneOf(input.voiceStyle, VIDEO_VOICE_STYLES) ? input.voiceStyle : "calm_consultant",
    avatarStyle: isOneOf(input.avatarStyle, VIDEO_AVATAR_STYLES) ? input.avatarStyle : "none",
    captionStyle: isOneOf(input.captionStyle, VIDEO_CAPTION_STYLES) ? input.captionStyle : "clean_lower_third",
    storyFramework: isOneOf(input.storyFramework, VIDEO_STORY_FRAMEWORKS)
      ? input.storyFramework
      : "problem_agitate_solve",
    qualityTier: isOneOf(input.qualityTier, VIDEO_QUALITY_TIERS) ? input.qualityTier : "professional",
  }
}

export function platformSpec(platform: string): { ratio: string; durationSec: number; useCase: string } {
  if (platform === "shorts_9_16") return { ratio: "9:16", durationSec: 35, useCase: "SNSショート" }
  if (platform === "youtube_16_9") return { ratio: "16:9", durationSec: 90, useCase: "YouTube / LP埋め込み" }
  if (platform === "linkedin_1_1") return { ratio: "1:1", durationSec: 45, useCase: "LinkedIn / 投稿" }
  if (platform === "customer_subscription") return { ratio: "9:16 + 16:9", durationSec: 45, useCase: "動画サブスク納品" }
  return { ratio: "16:9", durationSec: 60, useCase: platform === "report_page" ? "診断レポート埋め込み" : "営業資料埋め込み" }
}

export function buildR2AssetPrefix(input: {
  locale: string
  companySlug?: string | null
  domain?: string | null
  jobType: string
  productionGenre: VideoProductionGenre
  createdAt?: Date
}): string {
  const source = input.companySlug || input.domain || "company"
  const companyKey = source.toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "")
  const date = input.createdAt ?? new Date()
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `sales-videos/${input.locale}/${companyKey || "company"}/${yyyy}-${mm}/${input.jobType}/${input.productionGenre}/`
}

export function buildVideoAssetManifest(input: {
  r2Bucket: string | null
  r2AssetPrefix: string
  platform: string
  profile: VideoProductionProfile
}): Record<string, unknown> {
  const spec = platformSpec(input.platform)
  return {
    version: "video-asset-manifest-v1",
    storage: "cloudflare_r2",
    bucket: input.r2Bucket,
    prefix: input.r2AssetPrefix,
    required_outputs: [
      "master.mp4",
      "poster.webp",
      "thumbnail.webp",
      "transcript.txt",
      "captions.srt",
      "captions.vtt",
      "source-manifest.json",
      "render-metadata.json",
    ],
    formats: [
      { id: "master", ratio: spec.ratio, duration_sec: spec.durationSec },
      { id: "review_proxy", ratio: spec.ratio, duration_sec: spec.durationSec, bitrate: "low" },
    ],
    production_profile: input.profile,
  }
}

export function buildProfessionalStoryboard(input: {
  companyName: string
  domain: string
  locale: string
  platform: string
  jobType: string
  hook: string
  totalLoss: string
  reportUrl: string | null
  demoUrl: string | null
  lossSimulation: VideoLossSimulation
  claimGuard: VideoClaimGuard
  profile: VideoProductionProfile
}): Record<string, unknown> {
  const spec = platformSpec(input.platform)
  const isJa = input.locale === "ja"
  return {
    format: spec,
    production_profile: input.profile,
    narrative: isJa
      ? "公開データと推定値を分けて、危機感と次の一手を短く見せる営業動画。"
      : "Evidence-first video that separates verified facts from estimates and drives the next step.",
    claim_guard: input.claimGuard,
    loss_summary: input.lossSimulation,
    scenes: [
      { id: "hook", seconds: 6, text: input.hook, visual: "current site, product, review, competitive context" },
      { id: "evidence", seconds: 12, text: input.totalLoss, visual: "scorecards, proof cards, measured signals" },
      { id: "pain", seconds: 10, text: input.lossSimulation.customer_safe_summary_ja, visual: "loss simulator and friction points" },
      { id: "bridge", seconds: 14, text: input.demoUrl ? "改善後のデモを提示" : "改善後の構成案を提示", visual: "Astro demo or motion mock" },
      { id: "offer", seconds: 14, text: input.jobType === "subscription_video" ? "継続動画納品ラインを提示" : "Web/DX提案へ接続", visual: "offer stack and delivery timeline" },
      { id: "cta", seconds: 8, text: input.reportUrl ?? input.domain, visual: "report URL, booking CTA, accountable owner" },
    ],
  }
}

export function buildProfessionalProductionPlan(input: {
  companyName: string
  domain: string
  locale: string
  platform: string
  jobType: string
  renderEngine: string
  industry: Industry | null
  lossSimulation: VideoLossSimulation
  claimGuard: VideoClaimGuard
  profile: VideoProductionProfile
  r2Bucket: string | null
  r2AssetPrefix: string
  assetManifest: Record<string, unknown>
  readiness: { n8n: boolean; dify: boolean; comfyui: boolean; vast: boolean; r2: boolean }
}): Record<string, unknown> {
  const theme = themeForIndustry(input.industry)
  return {
    version: "video-pipeline-v3-pro-production-r2",
    architecture: "n8n coordinates; specialist renderers create assets; Cloudflare R2 stores deliverables",
    job_intent: input.jobType === "subscription_video" ? "recurring_delivery" : "sales_enablement",
    company: { name: input.companyName, domain: input.domain, industry: labelForIndustry(input.industry, input.locale) },
    production_profile: input.profile,
    render_chain: [
      "Dify Cloud selects template, story framework, and copy",
      "Crawlee / Playwright / Wappalyzer / diagnostic data provide source evidence",
      "ComfyUI creates optional backgrounds, b-roll, thumbnails, avatars, and image sequences",
      "Vast.ai is used only for heavy GPU batches or subscription delivery",
      "HyperFrames / Remotion / OpenMontage render final motion",
      "FFmpeg normalizes audio, captions, bitrate, and platform variants",
      "Cloudflare R2 stores master, review proxy, subtitles, thumbnails, and source manifest",
    ],
    renderer: {
      preferred: input.renderEngine,
      sales_video_default: "HyperFrames or Remotion",
      subscription_default: "OpenMontage + ComfyUI + Vast.ai + R2",
    },
    r2: {
      bucket: input.r2Bucket,
      prefix: input.r2AssetPrefix,
      manifest: input.assetManifest,
    },
    quality_bar: [
      "First screen states one clear business problem",
      "Every number is either measured, sourced, or labeled as an estimate",
      "Captions are readable on mobile and do not cover key evidence",
      "Avatar or generated visuals are brand-safe and industry-appropriate",
      "Final CTA links to report, booking, or delivery page",
      "R2 contains master, proxy, captions, thumbnail, transcript, and metadata",
    ],
    guardrails: {
      first_customer_delivery_requires_human_review: true,
      no_live_gpu_without_cost_context: true,
      no_unverified_claims: true,
      skip_renderer_if_required_api_missing: true,
      claim_guard: input.claimGuard,
    },
    loss_simulation: input.lossSimulation,
    theme: {
      accent: theme.accent,
      accentDark: theme.accentDark,
      paper: theme.paper,
    },
    readiness: input.readiness,
  }
}
