/**
 * lib/youtube/script/normalize.ts — ドラフトを厳密な VideoScript に変換する
 *
 * 方針: 機械が決められる値はモデルに委ねない。
 *   - シーンIDと開始時刻は連番と累積で決める
 *   - 尺はナレーション長と話速から算出する
 *   - 根拠URLは入力に実在するものだけ通す (URLの創作をここで遮断する)
 *   - 合成メディアの開示は形式定義から決定論的に導く
 *
 * 落とした情報は warnings として返し、黙って捨てない。
 */

import type { ChannelFormat, Scene, SourceRef, VideoScript } from "../formats/types"
import type { ScriptDraft, ScriptIdea, ScriptPattern } from "./types"
import { speechRateFor } from "./types"

export interface NormalizeInput {
  draft: ScriptDraft
  format: ChannelFormat
  pattern: ScriptPattern
  idea: ScriptIdea
  channelId: string
}

export interface NormalizeResult {
  script: VideoScript
  warnings: string[]
}

/** 合成メディアの開示文。開示が必要な場合にのみ付与する。 */
const DISCLOSURE_TEXT: Record<string, string> = {
  ja: "この動画には合成音声または生成された映像が含まれます。",
  en: "This video contains synthetic voice or AI-generated visuals.",
}

/** ナレーション長と話速から尺を見積もる。最短2秒を下限にする。 */
export function estimateDurationSec(text: string, locale: string): number {
  const rate = speechRateFor(locale)
  const seconds = (text.length / rate) * 60
  return Math.max(2, Math.round(seconds))
}

export function normalizeDraft(input: NormalizeInput): NormalizeResult {
  const { draft, format, pattern, idea, channelId } = input
  const warnings: string[] = []

  if (!Array.isArray(draft.scenes) || draft.scenes.length === 0) {
    throw new Error("[youtube/script] ドラフトにシーンがありません。")
  }

  // 入力に実在する根拠だけを引けるようにする。ここに無いURLは通さない。
  const sourceByUrl = new Map<string, SourceRef>(idea.sources.map((source) => [source.url, source]))

  let cursor = 0
  const scenes: Scene[] = draft.scenes.map((draftScene, index) => {
    const narration = (draftScene.narration ?? "").trim()
    const durationSec =
      typeof draftScene.durationSec === "number" && draftScene.durationSec > 0
        ? Math.round(draftScene.durationSec)
        : estimateDurationSec(narration, format.locale)

    const sources: SourceRef[] = []
    for (const url of draftScene.sourceUrls ?? []) {
      const source = sourceByUrl.get(url)
      if (source) {
        sources.push(source)
      } else {
        warnings.push(`シーン${index + 1}: 入力に無い根拠URLを破棄しました (${url})`)
      }
    }

    const scene: Scene = {
      id: `s${index + 1}`,
      startSec: cursor,
      durationSec,
      narration,
      onScreenText: (draftScene.onScreenText ?? []).map((text) => text.trim()).filter(Boolean),
      visual: {
        kind: draftScene.visualKind ?? pattern.defaultVisualKind,
        spec: draftScene.visualSpec ?? {},
      },
      sources,
    }
    cursor += durationSec
    return scene
  })

  const sceneIds = new Set(scenes.map((scene) => scene.id))
  const evidenceSceneIds: string[] = []
  for (const position of draft.originalValue?.evidenceSceneIndexes ?? []) {
    const id = `s${position + 1}`
    if (sceneIds.has(id)) {
      evidenceSceneIds.push(id)
    } else {
      warnings.push(`固有価値が存在しないシーン位置を指しています (index=${position})`)
    }
  }

  const syntheticVoice = format.voice.engine !== "none"
  const syntheticVisuals = format.visual.engine === "comfyui"
  const realisticPersonOrEvent = format.visual.realisticDepiction === true
  const needsDisclosure = (syntheticVoice || syntheticVisuals) && realisticPersonOrEvent

  const script: VideoScript = {
    formatId: format.id,
    channelId,
    title: (draft.title ?? "").trim(),
    description: (draft.description ?? "").trim(),
    tags: (draft.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    thumbnailText: (draft.thumbnailText ?? []).map((text) => text.trim()).filter(Boolean),
    hook: (draft.hook ?? "").trim(),
    scenes,
    originalValue: {
      kind: draft.originalValue?.kind ?? "synthesis_of_sources",
      statement: (draft.originalValue?.statement ?? "").trim(),
      evidenceSceneIds,
    },
    synthetic: {
      syntheticVoice,
      syntheticVisuals,
      realisticPersonOrEvent,
      disclosureText: needsDisclosure ? (DISCLOSURE_TEXT[format.locale] ?? DISCLOSURE_TEXT.en) : null,
    },
  }

  return { script, warnings }
}
