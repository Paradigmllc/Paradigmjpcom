/**
 * lib/youtube/quality/policy-gate.ts — 公開前の収益化リスク検査
 *
 * 役割: 台本を公開してよいかを機械判定する。「良い動画か」ではなく
 *       「収益化を失う要因を含まないか」だけを測る。
 *
 * 検査する7領域:
 *   1. 構造      — シーン数、尺、情報密度が形式契約の範囲内か
 *   2. 反復性    — 直近作のテンプレ流用になっていないか (inauthentic content 対策)
 *   3. 固有価値  — このチャンネル固有の付加価値が実在するシーンに紐づいているか
 *   4. 主張の根拠 — 統計、法令、医療、金融の断定に一次ソースが付いているか
 *   5. メタ整合  — タイトルとサムネ文言が本編に実在するか (誤解を招くメタデータ対策)
 *   6. 合成開示  — 現実の人物・出来事に見える合成に開示文があるか
 *   7. 参照整合  — シーンIDの重複や時間軸の破綻がないか
 *
 * block が1件でもあれば公開してはならない。warn は人間の判断に委ねる。
 */

import type { ChannelFormat, VideoScript } from "../formats/types"
import {
  analyzeRepetition,
  characterShingles,
  normalizeForComparison,
  type RepetitionReport,
} from "./repetition"

export type PolicySeverity = "block" | "warn"

export interface PolicyFinding {
  code: string
  severity: PolicySeverity
  message: string
  sceneId?: string
}

export interface PolicyGateResult {
  ok: boolean
  findings: PolicyFinding[]
  repetition: RepetitionReport
  metrics: {
    totalDurationSec: number
    narrationChars: number
    narrationCharsPerMinute: number
  }
}

/* ───── 根拠が必要な主張の検出 ───── */

interface ClaimPattern {
  type: string
  pattern: RegExp
}

/**
 * 一次ソース無しに断定させない主張のパターン。
 * 過検出は運用を止めるので、断定的な言い回しに限定して絞ってある。
 */
const CLAIM_PATTERNS: ClaimPattern[] = [
  { type: "statistic", pattern: /\d+(?:\.\d+)?\s?(?:%|％|パーセント)/ },
  { type: "statistic", pattern: /\d+(?:\.\d+)?\s?(?:割|倍)(?!ぐらい|くらい)/ },
  { type: "market_size", pattern: /\d+(?:\.\d+)?\s?(?:兆|億)\s?(?:円|ドル)/ },
  { type: "market_size", pattern: /market (?:size|is worth)[^.]{0,24}\$?\d/i },
  { type: "legal_date", pattern: /(?:施行|改正|義務化|法制化)[^。]{0,20}\d{1,4}\s?(?:年|月)/ },
  { type: "legal_date", pattern: /\d{1,4}\s?(?:年|月)[^。]{0,20}(?:施行|改正|義務化)/ },
  { type: "medical_claim", pattern: /(?:治る|治せる|完治|予防でき|症状が改善|副作用は(?:あり)?ません)/ },
  { type: "medical_claim", pattern: /\b(?:cures?|prevents?|treats)\b[^.]{0,30}\b(?:disease|cancer|illness)\b/i },
  // 断定的な相場予測。上げ方向だけでなく下げ方向も対象にする
  // (実データ検証で「株価は確実に下落します」が素通りしたため語彙を広げた)。
  {
    type: "financial_return",
    pattern:
      /(?:必ず|確実に|絶対に|間違いなく)[^。]{0,20}(?:稼|儲|増え|上が|下が|下落|暴落|急騰|高騰|値上がり|値下がり|increase)/,
  },
  // 出典を示さない権威付け。LLM が根拠なく書きがちな定型。
  { type: "expert_attribution", pattern: /(?:専門家|研究者|関係者|識者)(?:によれば|によると|の話では|は指摘)/ },
  { type: "expert_attribution", pattern: /\b(?:experts? (?:say|believe|warn)|studies show)\b/i },
  { type: "financial_return", pattern: /利回り[^。]{0,10}\d|\d+(?:\.\d+)?\s?(?:%|％)[^。]{0,8}(?:利回り|リターン)/ },
  { type: "financial_return", pattern: /\b(?:guaranteed returns?|risk[- ]free|get rich)\b/i },
  { type: "superlative", pattern: /(?:世界初|日本初|世界一|日本一|業界(?:No\.?\s?1|ナンバーワン)|唯一無二)/ },
  { type: "superlative", pattern: /\b(?:world'?s first|the (?:only|best) \w+ in the world|#1 \w+)\b/i },
]

/** ナレーションから、根拠が必要な主張の種類を検出する。 */
export function detectClaimTypes(narration: string): string[] {
  const found = new Set<string>()
  for (const { type, pattern } of CLAIM_PATTERNS) {
    if (pattern.test(narration)) found.add(type)
  }
  return [...found]
}

/* ───── メタデータ整合 ───── */

/** 文字 n-gram のサイズ。repetition.ts と揃える。 */
const SHINGLE_SIZE = 3

/**
 * a の n-gram のうち b に含まれる割合。短い語句が長文に現れるかの判定に使う。
 *
 * n-gram サイズ未満の語は集合を作れず、本文側の3-gram とは原理的に一致しない。
 * サムネ文言は「覚悟」「反論」のような短い語が普通なので、そのまま比較すると
 * 本編に実在していても必ず不一致になる(実データ検証で発覚)。
 * 短い語は正規化後の本文への直接包含で判定する。
 */
function containment(phrase: string, body: string): number {
  const normalizedPhrase = normalizeForComparison(phrase)
  if (normalizedPhrase.length === 0) return 1
  if (normalizedPhrase.length < SHINGLE_SIZE) {
    return normalizeForComparison(body).includes(normalizedPhrase) ? 1 : 0
  }

  const phraseShingles = characterShingles(phrase)
  if (phraseShingles.size === 0) return 1
  const bodyShingles = characterShingles(body)
  let hit = 0
  for (const shingle of phraseShingles) {
    if (bodyShingles.has(shingle)) hit += 1
  }
  return hit / phraseShingles.size
}

/** サムネ文言・タイトルが本編に実在するとみなす下限。 */
const METADATA_CONTAINMENT_THRESHOLD = 0.5

/* ───── ゲート本体 ───── */

/**
 * 台本を形式契約と直近作に照らして検査する。
 *
 * @param recent 同一チャンネルの直近作。新しい順に並べる。
 */
export function runPolicyGate(
  script: VideoScript,
  format: ChannelFormat,
  recent: VideoScript[] = [],
): PolicyGateResult {
  const findings: PolicyFinding[] = []
  const { quality } = format

  const window = recent.slice(0, quality.recentComparisonWindow)
  const repetition = analyzeRepetition(script, window)

  const totalDurationSec = script.scenes.reduce((sum, scene) => sum + scene.durationSec, 0)
  const narrationChars = script.scenes.reduce((sum, scene) => sum + scene.narration.length, 0)

  // 密度は「実尺」ではなく「目標尺」で割る。
  // 尺はナレーション長から話速で逆算されるため、実尺で割ると密度は常に話速そのものに
  // 一致してしまい、検査が構造的に機能しない(実データで171文字30秒の薄い台本が
  // 342文字/分として通過した)。目標の長さに見合う中身があるかを測るのが本来の意図。
  const narrationCharsPerMinute = (narrationChars / quality.targetDurationSec) * 60

  /* 1. 構造 */
  if (script.scenes.length < quality.minSceneCount) {
    findings.push({
      code: "structure.scene_count_low",
      severity: "block",
      message: `シーン数が${script.scenes.length}で下限${quality.minSceneCount}を下回っています。`,
    })
  }
  if (script.scenes.length > quality.maxSceneCount) {
    findings.push({
      code: "structure.scene_count_high",
      severity: "warn",
      message: `シーン数が${script.scenes.length}で上限${quality.maxSceneCount}を超えています。`,
    })
  }
  const durationGap = Math.abs(totalDurationSec - quality.targetDurationSec)
  if (durationGap > quality.durationToleranceSec) {
    findings.push({
      code: "structure.duration_off_target",
      severity: "warn",
      message: `尺${totalDurationSec}秒が目標${quality.targetDurationSec}秒から${durationGap}秒ずれています。`,
    })
  }
  if (narrationCharsPerMinute < quality.minNarrationCharsPerMinute) {
    findings.push({
      code: "structure.density_low",
      severity: "block",
      message: `情報密度が毎分${Math.round(narrationCharsPerMinute)}文字で下限${quality.minNarrationCharsPerMinute}を下回っています。内容の薄い量産とみなされます。`,
    })
  }

  /* 7. 参照整合 (構造の一部として先に潰す) */
  const seenIds = new Set<string>()
  for (const scene of script.scenes) {
    if (seenIds.has(scene.id)) {
      findings.push({
        code: "structure.duplicate_scene_id",
        severity: "block",
        message: `シーンIDが重複しています: ${scene.id}`,
        sceneId: scene.id,
      })
    }
    seenIds.add(scene.id)
    if (scene.durationSec <= 0) {
      findings.push({
        code: "structure.non_positive_duration",
        severity: "block",
        message: `シーンの尺が0以下です: ${scene.id}`,
        sceneId: scene.id,
      })
    }
  }

  /* 2. 反復性 */
  if (window.length > 0) {
    if (repetition.maxScriptSimilarity > quality.maxScriptSimilarityToRecent) {
      findings.push({
        code: "repetition.script_similar",
        severity: "block",
        message: `直近作との台本類似度が${repetition.maxScriptSimilarity.toFixed(2)}で上限${quality.maxScriptSimilarityToRecent}を超えています。テンプレ量産と判定される危険があります。`,
      })
    }
    if (repetition.maxTitleSimilarity > quality.maxTitleSimilarityToRecent) {
      findings.push({
        code: "repetition.title_similar",
        severity: "warn",
        message: `直近作とのタイトル類似度が${repetition.maxTitleSimilarity.toFixed(2)}で上限${quality.maxTitleSimilarityToRecent}を超えています。`,
      })
    }
    if (repetition.identicalStructureStreak >= quality.maxIdenticalStructureStreak) {
      findings.push({
        code: "repetition.structure_streak",
        severity: "block",
        message: `同一構成が${repetition.identicalStructureStreak}本連続しています。上限は${quality.maxIdenticalStructureStreak}本です。構成に変化をつけてください。`,
      })
    }
  }

  /* 3. 固有価値 */
  if (quality.requireOriginalValue) {
    const statement = script.originalValue?.statement?.trim() ?? ""
    if (statement.length === 0) {
      findings.push({
        code: "original_value.missing",
        severity: "block",
        message: "このチャンネル固有の付加価値が宣言されていません。",
      })
    }
    const evidenceIds = script.originalValue?.evidenceSceneIds ?? []
    if (evidenceIds.length === 0) {
      findings.push({
        code: "original_value.no_evidence",
        severity: "block",
        message: "固有価値がどのシーンに現れるか指定されていません。",
      })
    }
    for (const sceneId of evidenceIds) {
      if (!seenIds.has(sceneId)) {
        findings.push({
          code: "original_value.dangling_evidence",
          severity: "block",
          message: `固有価値が存在しないシーンを参照しています: ${sceneId}`,
          sceneId,
        })
      }
    }
  }

  /* 4. 主張の根拠 */
  if (quality.requireSourceForClaims) {
    for (const scene of script.scenes) {
      const claimTypes = detectClaimTypes(scene.narration).filter((type) =>
        quality.bannedClaimTypes.includes(type),
      )
      if (claimTypes.length > 0 && scene.sources.length === 0) {
        findings.push({
          code: "claims.unsourced",
          severity: "block",
          message: `根拠の必要な主張(${claimTypes.join(", ")})に一次ソースが付いていません: ${scene.id}`,
          sceneId: scene.id,
        })
      }
    }
    for (const scene of script.scenes) {
      for (const source of scene.sources) {
        if (!/^https?:\/\//.test(source.url)) {
          findings.push({
            code: "claims.invalid_source_url",
            severity: "block",
            message: `一次ソースのURLが不正です: ${source.url}`,
            sceneId: scene.id,
          })
        }
      }
    }
  }

  /* 5. メタデータ整合 */
  const bodyText = [
    ...script.scenes.map((scene) => scene.narration),
    ...script.scenes.flatMap((scene) => scene.onScreenText),
    script.hook,
  ].join("")

  for (const phrase of script.thumbnailText) {
    // 「覚悟 / 反論 / 愚策」のような並列表記は、区切りごとに本編との一致を見る。
    // 合成ラベル全体では一致しないが、各語が本編にあれば誤解を招く表記ではない。
    // 検査は緩めない。各断片がそれぞれ本編に実在することを要求する。
    const fragments = phrase
      .split(/[/|｜・、,]/)
      .map((fragment) => fragment.trim())
      .filter(Boolean)
    const targets = fragments.length > 1 ? fragments : [phrase]

    for (const target of targets) {
      if (containment(target, bodyText) < METADATA_CONTAINMENT_THRESHOLD) {
        findings.push({
          code: "metadata.thumbnail_not_in_body",
          severity: "block",
          message:
            targets.length > 1
              ? `サムネ文言「${phrase}」のうち「${target}」が本編に見当たりません。誤解を招くメタデータと判定される危険があります。`
              : `サムネ文言「${phrase}」が本編に見当たりません。誤解を招くメタデータと判定される危険があります。`,
        })
      }
    }
  }
  if (script.title.trim().length === 0) {
    findings.push({ code: "metadata.title_empty", severity: "block", message: "タイトルが空です。" })
  } else if (containment(script.title, bodyText) < METADATA_CONTAINMENT_THRESHOLD) {
    findings.push({
      code: "metadata.title_not_in_body",
      severity: "warn",
      message: "タイトルの語句が本編にほとんど現れません。内容との乖離を確認してください。",
    })
  }

  /* 6. 合成開示 */
  const { synthetic } = script
  const usesSynthetic = synthetic.syntheticVoice || synthetic.syntheticVisuals
  if (usesSynthetic && synthetic.realisticPersonOrEvent) {
    const disclosure = synthetic.disclosureText?.trim() ?? ""
    if (disclosure.length === 0) {
      findings.push({
        code: "synthetic.disclosure_missing",
        severity: "block",
        message: "現実の人物・出来事に見える合成メディアを使う場合は開示文が必要です。",
      })
    }
  }

  return {
    ok: findings.every((finding) => finding.severity !== "block"),
    findings,
    repetition,
    metrics: { totalDurationSec, narrationChars, narrationCharsPerMinute },
  }
}
