/**
 * lib/youtube/formats/definitions/quality-presets.ts — 品質契約の既定値
 *
 * 役割: 形式ごとに品質条件を書き下すと抜けが出るので、収益化を守るための
 *       既定値をここに集約し、形式側では意図的に変える項目だけ上書きさせる。
 */

import type { FormatQualityContract } from "../types"

/** 根拠なしの断定を許さない主張の種類。既定では全種を対象にする。 */
export const ALL_BANNED_CLAIM_TYPES = [
  "statistic",
  "market_size",
  "legal_date",
  "medical_claim",
  "financial_return",
  "superlative",
  /** 「専門家によれば」のような、出典のない権威付け。 */
  "expert_attribution",
] as const

/**
 * 話速から導いた情報密度の下限。これを下回る台本は内容が薄い量産とみなす。
 * 日本語は毎分約350文字、英語は毎分約900文字が標準的な読み上げ速度なので、
 * その8割程度を下限に置いている。
 */
export const MIN_CHARS_PER_MINUTE = { ja: 280, en: 700 } as const

export interface QualityPresetInput {
  locale: "ja" | "en"
  targetDurationSec: number
  minSceneCount: number
  maxSceneCount: number
  overrides?: Partial<FormatQualityContract>
}

export function qualityContract(input: QualityPresetInput): FormatQualityContract {
  const base: FormatQualityContract = {
    minSceneCount: input.minSceneCount,
    maxSceneCount: input.maxSceneCount,
    targetDurationSec: input.targetDurationSec,
    // 目標尺の15%を許容範囲とする。
    durationToleranceSec: Math.round(input.targetDurationSec * 0.15),
    minNarrationCharsPerMinute: MIN_CHARS_PER_MINUTE[input.locale],
    // 0.35 は「同じ題材を扱っても言い回しが変われば通る」程度の水準。
    maxScriptSimilarityToRecent: 0.35,
    maxTitleSimilarityToRecent: 0.5,
    recentComparisonWindow: 12,
    maxIdenticalStructureStreak: 3,
    requireSourceForClaims: true,
    requireOriginalValue: true,
    bannedClaimTypes: [...ALL_BANNED_CLAIM_TYPES],
  }
  return { ...base, ...input.overrides }
}
