import type { ComponentType } from "react"
import type {
  VideoAvatarStyle,
  VideoCaptionStyle,
  VideoProductionGenre,
  VideoQualityTier,
  VideoStoryFramework,
  VideoVoiceStyle,
} from "@/lib/sales/video-production"
import type { VideoOfferAngle, VideoTargetSegment } from "@/lib/sales/video-strategy"
import type { VideoJobStatus } from "@/lib/sales/video-pipeline"
import { statusTone } from "./SalesCommandPanels"

export const SEGMENT_LABELS: Record<VideoTargetSegment, string> = {
  agency_white_label: "代理店ホワイトラベル",
  saas_marketing: "SaaSマーケティング",
  ec_brand: "ECブランド",
  local_smb: "ローカルSMB",
  youtube_creator: "YouTube / クリエイター",
  jaas_bundle: "日本進出パッケージ",
  gtm_engineering: "GTMエンジニアリング",
}

export const ANGLE_LABELS: Record<VideoOfferAngle, string> = {
  lost_revenue: "失っている売上",
  competitor_momentum: "競合の先行",
  market_window: "市場機会の期限",
  production_cost: "制作コスト削減",
  japan_entry_gap: "日本進出ギャップ",
  local_trust_gap: "地域信頼ギャップ",
}

export const GENRE_LABELS: Record<VideoProductionGenre, string> = {
  executive_diagnostic: "経営診断レポート",
  product_demo: "プロダクトデモ",
  case_study: "導入事例",
  ugc_ad: "UGC広告風",
  shorts_reel: "ショート動画",
  webinar_cutdown: "ウェビナー切り抜き",
  explainer_animation: "解説アニメーション",
  avatar_pitch: "AIアバター営業",
  testimonial_style: "お客様の声風",
  local_service_ad: "地域サービス広告",
  japan_entry_pitch: "日本進出ピッチ",
  subscription_series: "月次納品シリーズ",
}

export const VOICE_LABELS: Record<VideoVoiceStyle, string> = {
  calm_consultant: "落ち着いたコンサル声",
  energetic_founder: "熱量ある創業者声",
  premium_narrator: "高級感ナレーター",
  friendly_local: "親しみある地域声",
  bilingual_ja_en: "日英バイリンガル",
  no_voice_music_caption: "音楽 + 字幕のみ",
}

export const AVATAR_LABELS: Record<VideoAvatarStyle, string> = {
  none: "アバターなし",
  subtle_presenter: "控えめな案内役",
  executive_advisor: "経営アドバイザー",
  founder_operator: "現場責任者",
  studio_avatar: "スタジオアバター",
  brand_character: "ブランドキャラクター",
}

export const CAPTION_LABELS: Record<VideoCaptionStyle, string> = {
  burned_in_bilingual: "焼き込み二言語字幕",
  clean_lower_third: "下部テロップ",
  karaoke_highlight: "カラオケ強調字幕",
  srt_vtt_only: "SRT / VTTのみ",
  social_safe_area: "SNS安全領域対応",
}

export const STORY_LABELS: Record<VideoStoryFramework, string> = {
  problem_agitate_solve: "問題提起 -> 損失 -> 解決",
  before_after_bridge: "Before / After / Bridge",
  aida: "AIDA",
  case_study_arc: "事例ストーリー",
  myth_truth_proof: "誤解 -> 真実 -> 根拠",
  three_act_demo: "3幕デモ",
}

export const QUALITY_LABELS: Record<VideoQualityTier, string> = {
  draft: "下書き",
  professional: "プロ納品",
  premium: "プレミアム",
}

const STATUS_LABELS: Record<VideoJobStatus, string> = {
  draft: "ブリーフ",
  queued: "待機中",
  routing: "投入中",
  waiting_render: "レンダー待ち",
  rendering: "レンダー中",
  review_required: "承認待ち",
  completed: "完了",
  failed: "失敗",
  cancelled: "取消",
}

export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

function readyTone(ready: boolean) {
  return ready ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: T) => void
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-medium text-zinc-600">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
    </label>
  )
}

export function PipelineCard({
  name,
  ready,
  note,
  icon: Icon,
}: {
  name: string
  ready: boolean
  note: string
  icon: ComponentType<{ className?: string; "aria-hidden"?: true }>
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 text-zinc-500" aria-hidden />
          <div className="truncate text-sm font-semibold text-zinc-950">{name}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${readyTone(ready)}`}>
          {ready ? "接続済み" : "要設定"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-600">{note}</p>
    </div>
  )
}

export function JobBadge({ status }: { status: VideoJobStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] ${statusTone(status)}`}>{STATUS_LABELS[status]}</span>
}
