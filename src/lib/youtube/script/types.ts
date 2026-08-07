/**
 * lib/youtube/script/types.ts — 台本層の入出力契約
 *
 * 流れ: ScriptIdea (リサーチ層の出力)
 *        → ScriptPattern が Dify 向けプロンプトを組む
 *        → Dify が ScriptDraft (緩い JSON) を返す
 *        → normalize が VideoScript (厳密な IR) に変換する
 *        → policy gate が公開可否を判定する
 *
 * ドラフトを緩く受けて正規化側で締めるのは、LLM出力の揺れをプロンプトの
 * 厳格化ではなく決定論的な後処理で吸収するため。タイミングやIDのような
 * 機械が決められる値をLLMに委ねない。
 */

import type { ChannelFormat, SceneVisualKind, SourceRef, OriginalValueKind } from "../formats/types"

/** リサーチ層が確定させた企画。台本層はこれを一次入力にする。 */
export interface ScriptIdea {
  topic: string
  /** 同じ題材でも切り口を変えるための軸。反復回避の主要な変数になる。 */
  angle: string
  keywords: string[]
  /** 検証済みの根拠。台本のシーンに割り当てられる。 */
  sources: SourceRef[]
  /**
   * 同一事象を扱う複数媒体の見出し。
   * リサーチ層は記事本文を取得しないため、事実として使える材料はこれだけになる。
   * ここに無い具体的な数値や固有名詞を台本に書かせてはいけない。
   */
  contextHeadlines?: Array<{ title: string; source: string | null; url: string | null }>
  notes?: string
}

/* ───── Dify が返すドラフト ───── */

export interface ScriptDraftScene {
  narration: string
  onScreenText?: string[]
  /** 省略時はパターンの既定値を使う。 */
  visualKind?: SceneVisualKind
  /** レンダラーに渡す指示。省略可。 */
  visualSpec?: Record<string, unknown>
  /** 省略時はナレーション長から話速で見積もる。 */
  durationSec?: number
  /** このシーンで使った根拠。ScriptIdea.sources のURLを参照する。 */
  sourceUrls?: string[]
}

export interface ScriptDraft {
  title: string
  description: string
  tags: string[]
  thumbnailText: string[]
  hook: string
  originalValue: {
    kind: OriginalValueKind
    statement: string
    /** シーンIDはまだ存在しないので、0始まりの位置で指定させる。 */
    evidenceSceneIndexes: number[]
  }
  scenes: ScriptDraftScene[]
}

/* ───── パターン ───── */

export interface ScriptPatternContext {
  format: ChannelFormat
  idea: ScriptIdea
  /** 直近作のタイトル。反復を避けさせるためモデルに見せる。 */
  recentTitles: string[]
  /** 前回のゲート指摘。自己修復ループで渡す。 */
  repairNotes: string[]
}

export interface ScriptPattern {
  id: string
  /** ドラフトが visualKind を省略したときの既定値。 */
  defaultVisualKind: SceneVisualKind
  /**
   * 構成作家としての役割定義。プロンプト冒頭に置く。
   * 一括生成・構成案生成・シーン生成の3種類のプロンプトで共有するため、
   * 完成したプロンプトではなく素材として持つ。
   */
  role: string
  /** 物語構成。形式ごとに自由に定義する。 */
  structure: string
  buildPayload(context: ScriptPatternContext): Record<string, unknown>
}

/* ───── 逐次生成 ───── */

/**
 * 構成案。台本全体のメタ情報と、各シーンで何を言うかだけを決める。
 *
 * なぜ2段階にするか: 実測(qwen2.5:14b)では1400文字の台本を一括で書かせると
 * 390〜490文字で頭打ちになり、修復ループを回しても改善しなかった。
 * 「合計文字数」は生成の実行単位にならない。構成案で骨格を決め、
 * シーンごとに200文字前後を書かせれば、同じモデルでも必要な分量に届く。
 */
export interface ScriptOutline {
  title: string
  description: string
  tags: string[]
  thumbnailText: string[]
  hook: string
  originalValue: {
    kind: OriginalValueKind
    statement: string
    evidenceSceneIndexes: number[]
  }
  scenes: Array<{
    /** このシーンで何を言うかを一文で。 */
    purpose: string
    /** このシーンで使う根拠URL。 */
    sourceUrls?: string[]
  }>
}

/** 1シーン分の本文。 */
export interface SceneDraft {
  narration: string
  onScreenText?: string[]
  visualSpec?: Record<string, unknown>
  sourceUrls?: string[]
}

/* ───── 生成器 ───── */

export interface DraftGeneratorArgs {
  systemPrompt: string
  payload: Record<string, unknown>
}

export interface DraftGeneratorResult {
  ok: boolean
  draft?: ScriptDraft
  errorMessage?: string
}

/**
 * ドラフト生成の差し替え点。
 * Dify Cloud、OSS LLM (Ollama/vLLM/LiteLLM)、テスト用のスタブを同じ形で扱う。
 */
export type DraftGenerator = (args: DraftGeneratorArgs) => Promise<DraftGeneratorResult>

/* ───── 話速 ───── */

/**
 * ナレーション長から尺を見積もるための話速 (文字/分)。
 * 解説向けにやや遅めの実測値を採っている。
 */
export const SPEECH_CHARS_PER_MINUTE: Record<string, number> = {
  ja: 350,
  en: 900,
}

export function speechRateFor(locale: string): number {
  return SPEECH_CHARS_PER_MINUTE[locale] ?? SPEECH_CHARS_PER_MINUTE.en
}
