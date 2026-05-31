"use client"

import {
  VIDEO_AVATAR_STYLE_LABELS,
  VIDEO_AVATAR_STYLES,
  VIDEO_CAPTION_STYLE_LABELS,
  VIDEO_CAPTION_STYLES,
  VIDEO_PRODUCTION_GENRE_LABELS,
  VIDEO_PRODUCTION_GENRES,
  VIDEO_QUALITY_TIER_LABELS,
  VIDEO_QUALITY_TIERS,
  VIDEO_STORY_FRAMEWORK_LABELS,
  VIDEO_STORY_FRAMEWORKS,
  VIDEO_VOICE_STYLE_LABELS,
  VIDEO_VOICE_STYLES,
  buildR2AssetPrefix,
  type VideoAvatarStyle,
  type VideoCaptionStyle,
  type VideoProductionGenre,
  type VideoQualityTier,
  type VideoStoryFramework,
  type VideoVoiceStyle,
} from "@/lib/sales/video-production"

export interface SalesVideoProductionSelection {
  productionGenre: VideoProductionGenre
  voiceStyle: VideoVoiceStyle
  avatarStyle: VideoAvatarStyle
  captionStyle: VideoCaptionStyle
  storyFramework: VideoStoryFramework
  qualityTier: VideoQualityTier
}

interface Props {
  value: SalesVideoProductionSelection
  onChange: (next: SalesVideoProductionSelection) => void
  locale: string
  companySlugOrDomain: string
  jobType: "sales_video" | "subscription_video"
}

function SelectField<T extends string>({
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
    <label className="grid gap-1 text-xs font-medium text-zinc-600">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-950 outline-none focus:border-zinc-500"
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

export function SalesVideoProductionControls({ value, onChange, locale, companySlugOrDomain, jobType }: Props) {
  const update = <K extends keyof SalesVideoProductionSelection>(key: K, next: SalesVideoProductionSelection[K]) =>
    onChange({ ...value, [key]: next })
  const r2Prefix = buildR2AssetPrefix({
    locale,
    companySlug: companySlugOrDomain,
    jobType,
    productionGenre: value.productionGenre,
  })

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold text-zinc-950">プロ制作プロファイル</div>
        <p className="text-xs leading-5 text-zinc-600">
          ジャンル、音声、アバター、字幕、ストーリー型を保存し、Dify / n8n / レンダラー / R2 へ同じ仕様を渡します。
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SelectField label="動画ジャンル" value={value.productionGenre} options={VIDEO_PRODUCTION_GENRES} labels={VIDEO_PRODUCTION_GENRE_LABELS} onChange={(next) => update("productionGenre", next)} />
        <SelectField label="音声" value={value.voiceStyle} options={VIDEO_VOICE_STYLES} labels={VIDEO_VOICE_STYLE_LABELS} onChange={(next) => update("voiceStyle", next)} />
        <SelectField label="アバター" value={value.avatarStyle} options={VIDEO_AVATAR_STYLES} labels={VIDEO_AVATAR_STYLE_LABELS} onChange={(next) => update("avatarStyle", next)} />
        <SelectField label="字幕" value={value.captionStyle} options={VIDEO_CAPTION_STYLES} labels={VIDEO_CAPTION_STYLE_LABELS} onChange={(next) => update("captionStyle", next)} />
        <SelectField label="ストーリー" value={value.storyFramework} options={VIDEO_STORY_FRAMEWORKS} labels={VIDEO_STORY_FRAMEWORK_LABELS} onChange={(next) => update("storyFramework", next)} />
        <SelectField label="品質" value={value.qualityTier} options={VIDEO_QUALITY_TIERS} labels={VIDEO_QUALITY_TIER_LABELS} onChange={(next) => update("qualityTier", next)} />
      </div>
      <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3">
        <div className="text-xs font-semibold text-zinc-950">R2保存プレフィックス</div>
        <code className="mt-2 block break-all rounded bg-zinc-950 px-2 py-1 text-[11px] text-white">{r2Prefix}</code>
        <p className="mt-2 text-xs leading-5 text-zinc-600">
          master.mp4 / review proxy / SRT / VTT / thumbnail / transcript / source-manifest.json を同じ場所に集約します。
        </p>
      </div>
    </div>
  )
}
