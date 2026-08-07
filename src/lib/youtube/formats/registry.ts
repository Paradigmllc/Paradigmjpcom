/**
 * lib/youtube/formats/registry.ts — チャンネル形式レジストリ
 *
 * 役割: 形式定義を1箇所に集め、IDで引けるようにする。
 *       新しい形式を足す手順は definitions/ に1ファイル追加して
 *       definitions/index.ts の配列に載せるだけ。型定義もDB制約も触らない。
 */

import type { ChannelFormat } from "./types"
import { FORMAT_DEFINITIONS } from "./definitions"

export interface FormatValidationIssue {
  formatId: string
  field: string
  message: string
}

/** 形式定義の自己矛盾を検出する。起動時とテストで回す。 */
export function validateFormat(format: ChannelFormat): FormatValidationIssue[] {
  const issues: FormatValidationIssue[] = []
  const add = (field: string, message: string) => issues.push({ formatId: format.id, field, message })

  if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(format.id)) {
    add("id", "IDは小文字英数字とハイフンで3〜50文字にしてください。")
  }
  if (format.hypothesis.trim().length === 0) {
    add("hypothesis", "検証仮説は必須です。何を確かめるチャンネルなのか書いてください。")
  }

  const [minScenes, maxScenes] = format.script.sceneRange
  if (minScenes > maxScenes) {
    add("script.sceneRange", "シーン数の下限が上限を超えています。")
  }
  if (format.quality.minSceneCount > format.quality.maxSceneCount) {
    add("quality.sceneCount", "品質契約のシーン数下限が上限を超えています。")
  }
  if (minScenes < format.quality.minSceneCount || maxScenes > format.quality.maxSceneCount) {
    add("script.sceneRange", "台本のシーン数レンジが品質契約の範囲外です。")
  }
  if (format.script.targetSec !== format.quality.targetDurationSec) {
    add("script.targetSec", "台本の目標尺と品質契約の目標尺が一致していません。")
  }

  for (const value of [format.quality.maxScriptSimilarityToRecent, format.quality.maxTitleSimilarityToRecent]) {
    if (value < 0 || value > 1) add("quality.similarity", "類似度の上限は0〜1で指定してください。")
  }
  if (format.quality.recentComparisonWindow < 1) {
    add("quality.recentComparisonWindow", "比較する直近本数は1以上にしてください。")
  }
  if (format.quality.maxIdenticalStructureStreak < 1) {
    add("quality.maxIdenticalStructureStreak", "同一構成の許容連続本数は1以上にしてください。")
  }

  if (format.visual.engine === "comfyui" && !format.visual.checkpoint) {
    add("visual.checkpoint", "ComfyUIを使う形式はcheckpointを明示してください。既定のflux-devはアニメや漫画には向きません。")
  }
  if (format.visual.engine === "none" && format.visual.checkpoint) {
    add("visual.checkpoint", "映像生成を使わない形式にcheckpointが指定されています。")
  }
  if (format.visual.character?.livePortrait && !format.visual.character.faceRef) {
    add("visual.character", "LivePortraitを使う場合はfaceRefが必要です。")
  }

  if (format.voice.engine === "voice_pro" && !format.voice.cloneRef) {
    add("voice.cloneRef", "voice_proを使う場合はクローン元の参照音声が必要です。")
  }

  if (!format.cost.gpuAllowed && format.visual.engine === "comfyui") {
    add("cost.gpuAllowed", "ComfyUIを使う形式でGPUが禁止されています。")
  }
  if (format.cost.maxUsdPerVideo <= 0) {
    add("cost.maxUsdPerVideo", "1本あたりのコスト上限は正の数にしてください。")
  }

  if (format.research.sources.length === 0) {
    add("research.sources", "リサーチソースを最低1つ指定してください。")
  }

  return issues
}

function buildRegistry(): Map<string, ChannelFormat> {
  const map = new Map<string, ChannelFormat>()
  for (const format of FORMAT_DEFINITIONS) {
    if (map.has(format.id)) {
      throw new Error(`[youtube/formats] 形式IDが重複しています: ${format.id}`)
    }
    map.set(format.id, format)
  }
  return map
}

const REGISTRY = buildRegistry()

export function listFormats(): ChannelFormat[] {
  return [...REGISTRY.values()]
}

export function getFormat(id: string): ChannelFormat | null {
  return REGISTRY.get(id) ?? null
}

/** 存在しないIDを渡された場合に例外を投げる版。呼び出し側の分岐を減らすために用意する。 */
export function requireFormat(id: string): ChannelFormat {
  const format = getFormat(id)
  if (!format) {
    throw new Error(`[youtube/formats] 未登録の形式です: ${id} (登録済み: ${[...REGISTRY.keys()].join(", ")})`)
  }
  return format
}

/** 登録済み形式をすべて検証する。 */
export function validateAllFormats(): FormatValidationIssue[] {
  return listFormats().flatMap(validateFormat)
}
