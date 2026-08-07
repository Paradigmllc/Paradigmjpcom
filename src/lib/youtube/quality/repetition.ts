/**
 * lib/youtube/quality/repetition.ts — 台本の反復性検出
 *
 * 役割: 「1本ずつ見れば良質だが、並べるとテンプレ量産に見える」状態を機械検出する。
 *       YouTube の inauthentic content 判定は個別の動画ではなくチャンネル全体の
 *       反復性を見るため、公開前に直近作との差分を測る必要がある。
 *
 * なぜ文字 n-gram なのか:
 *   日本語は分かち書きされないため、単語分割には形態素解析器が要る。依存を増やさず、
 *   かつ日英どちらでも動かすために文字 3-gram の Jaccard 係数を使う。表記ゆれや
 *   語順の入れ替えに対しても、テンプレ流用であれば高い一致率が残る。
 */

import type { Scene, VideoScript } from "../formats/types"

const SHINGLE_SIZE = 3

/** 比較用にテキストを正規化する。空白と記号を落とし、英字は小文字に揃える。 */
export function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\s　]+/g, "")
    .replace(/[!-/:-@[-`{-~、。「」『』・…ー―〜？！]/g, "")
}

/** 正規化済みテキストから文字 n-gram 集合を作る。 */
export function characterShingles(text: string, size: number = SHINGLE_SIZE): Set<string> {
  const normalized = normalizeForComparison(text)
  const shingles = new Set<string>()
  if (normalized.length === 0) return shingles
  if (normalized.length <= size) {
    shingles.add(normalized)
    return shingles
  }
  for (let i = 0; i <= normalized.length - size; i += 1) {
    shingles.add(normalized.slice(i, i + size))
  }
  return shingles
}

/** Jaccard 係数。両方が空集合なら 0 を返す(比較不能を類似とみなさない)。 */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  for (const value of a) {
    if (b.has(value)) intersection += 1
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

/** 台本全体のナレーションを連結する。 */
export function narrationText(script: VideoScript): string {
  return script.scenes.map((scene) => scene.narration).join("")
}

/** 2本の台本のナレーション類似度 (0-1)。 */
export function scriptSimilarity(a: VideoScript, b: VideoScript): number {
  return jaccard(characterShingles(narrationText(a)), characterShingles(narrationText(b)))
}

/** 2本のタイトル類似度 (0-1)。骨格を使い回した釣りタイトルを検出する。 */
export function titleSimilarity(a: VideoScript, b: VideoScript): number {
  return jaccard(characterShingles(a.title), characterShingles(b.title))
}

/**
 * 構成の指紋。シーン数と尺の配分を丸めた文字列を返す。
 * 内容が違っても毎回同じ型に流し込んでいる場合、この値が一致し続ける。
 */
export function structuralFingerprint(script: VideoScript): string {
  const total = script.scenes.reduce((sum, scene) => sum + scene.durationSec, 0)
  if (total <= 0) return `${script.scenes.length}:empty`
  const shape = script.scenes
    .map((scene: Scene) => {
      const ratio = scene.durationSec / total
      // 5%刻みに丸める。多少の尺揺れでは指紋が変わらないようにする。
      return `${scene.visual.kind}${Math.round(ratio * 20)}`
    })
    .join("-")
  return `${script.scenes.length}:${shape}`
}

/**
 * 直近作の中で、構成の指紋が対象と一致し続けている連続本数を数える。
 * recent は新しい順に並んでいる前提。
 */
export function identicalStructureStreak(script: VideoScript, recent: VideoScript[]): number {
  const fingerprint = structuralFingerprint(script)
  let streak = 0
  for (const previous of recent) {
    if (structuralFingerprint(previous) !== fingerprint) break
    streak += 1
  }
  return streak
}

export interface RepetitionReport {
  maxScriptSimilarity: number
  maxTitleSimilarity: number
  /** 最も似ていた直近作のインデックス。比較対象が無ければ null。 */
  closestIndex: number | null
  identicalStructureStreak: number
}

/** 台本を直近作と突き合わせ、反復性の指標をまとめて返す。 */
export function analyzeRepetition(script: VideoScript, recent: VideoScript[]): RepetitionReport {
  let maxScriptSimilarity = 0
  let maxTitleSimilarity = 0
  let closestIndex: number | null = null

  recent.forEach((previous, index) => {
    const scriptScore = scriptSimilarity(script, previous)
    if (scriptScore > maxScriptSimilarity) {
      maxScriptSimilarity = scriptScore
      closestIndex = index
    }
    const titleScore = titleSimilarity(script, previous)
    if (titleScore > maxTitleSimilarity) maxTitleSimilarity = titleScore
  })

  return {
    maxScriptSimilarity,
    maxTitleSimilarity,
    closestIndex,
    identicalStructureStreak: identicalStructureStreak(script, recent),
  }
}
