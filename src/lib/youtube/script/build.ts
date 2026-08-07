/**
 * lib/youtube/script/build.ts — 台本生成の統括
 *
 * 生成 → 正規化 → 公開前ゲート → (却下なら指摘を添えて再生成) のループを回す。
 *
 * 要点: ゲートの指摘をそのまま次回プロンプトの制約として差し戻す。
 *       人間がレビューして書き直す代わりに、機械判定の結果を修復指示に変換することで、
 *       品質基準を運用者の集中力に依存させない。
 *
 * LLM は差し替え可能。既定は OSS LLM (Ollama/vLLM/LiteLLM)、環境変数で Dify Cloud に切替える。
 */

import type { VideoScript } from "../formats/types"
import { requireFormat } from "../formats/registry"
import { runPolicyGate, type PolicyGateResult } from "../quality/policy-gate"
import { composeScriptDraft } from "./compose"
import { resolveDraftGenerator } from "./generators"
import { normalizeDraft } from "./normalize"
import { requirePattern } from "./patterns"
import { composeSystemPrompt } from "./patterns/common"
import type { DraftGenerator, ScriptDraft, ScriptIdea, ScriptPatternContext } from "./types"

/**
 * 生成方式。
 * sequential: 構成案 → シーンごとに本文。1回の要求量が小さく、小型モデルでも分量が出る。
 * single:     台本全体を1回で生成。呼び出しは1回で済むが、実測では分量が足りない。
 */
export type ScriptBuildMode = "sequential" | "single"

export type { DraftGenerator, DraftGeneratorArgs, DraftGeneratorResult } from "./types"

export interface BuildScriptInput {
  formatId: string
  channelId: string
  idea: ScriptIdea
  /** 同一チャンネルの直近作。新しい順。反復判定に使う。 */
  recentScripts?: VideoScript[]
  /** ゲート却下時の再生成回数の上限。 */
  maxAttempts?: number
  /** 生成器の差し替え。テストとオフライン検証で使う。 */
  generate?: DraftGenerator
  /** 生成方式。既定は sequential。 */
  mode?: ScriptBuildMode
}

export interface BuildScriptAttempt {
  attempt: number
  gate: PolicyGateResult | null
  errorMessage?: string
}

export interface BuildScriptResult {
  ok: boolean
  script: VideoScript | null
  gate: PolicyGateResult | null
  attempts: BuildScriptAttempt[]
  warnings: string[]
  /** LLM を呼んだ回数。逐次生成では 1 + シーン数 になる。 */
  llmCalls: number
  errorMessage?: string
}

const DEFAULT_MAX_ATTEMPTS = 3

export async function buildScript(input: BuildScriptInput): Promise<BuildScriptResult> {
  const format = requireFormat(input.formatId)
  const pattern = requirePattern(format.script.patternId)
  const generate = input.generate ?? resolveDraftGenerator()
  const recentScripts = input.recentScripts ?? []
  const maxAttempts = Math.max(1, input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS)

  const context: ScriptPatternContext = {
    format,
    idea: input.idea,
    recentTitles: recentScripts.slice(0, format.quality.recentComparisonWindow).map((script) => script.title),
    repairNotes: [],
  }

  const mode = input.mode ?? "sequential"
  const attempts: BuildScriptAttempt[] = []
  let lastWarnings: string[] = []
  let llmCalls = 0

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let draft: ScriptDraft
    let composeWarnings: string[] = []

    if (mode === "sequential") {
      const composed = await composeScriptDraft({ context, pattern, generate })
      llmCalls += composed.calls
      composeWarnings = composed.warnings
      if (!composed.ok || !composed.draft) {
        attempts.push({ attempt, gate: null, errorMessage: composed.errorMessage })
        continue
      }
      draft = composed.draft
    } else {
      llmCalls += 1
      const generated = await generate({
        systemPrompt: composeSystemPrompt(context, pattern.role, pattern.structure),
        payload: pattern.buildPayload(context),
      })
      if (!generated.ok || !generated.draft) {
        attempts.push({ attempt, gate: null, errorMessage: generated.errorMessage })
        // 生成そのものが失敗した場合は修復指示を作れないので、そのまま再試行する。
        continue
      }
      draft = generated.draft
    }

    let script: VideoScript
    try {
      const normalized = normalizeDraft({
        draft,
        format,
        pattern,
        idea: input.idea,
        channelId: input.channelId,
      })
      script = normalized.script
      lastWarnings = [...composeWarnings, ...normalized.warnings]
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      attempts.push({ attempt, gate: null, errorMessage: message })
      continue
    }

    const gate = runPolicyGate(script, format, recentScripts)
    attempts.push({ attempt, gate })

    if (gate.ok) {
      return { ok: true, script, gate, attempts, warnings: lastWarnings, llmCalls }
    }

    // ブロック要因だけを修復指示に変換する。警告は人間の判断に残す。
    context.repairNotes = gate.findings
      .filter((finding) => finding.severity === "block")
      .map((finding) => finding.message)
  }

  const last = attempts[attempts.length - 1]
  return {
    ok: false,
    script: null,
    gate: last?.gate ?? null,
    attempts,
    warnings: lastWarnings,
    llmCalls,
    errorMessage:
      last?.errorMessage ?? `${maxAttempts}回試行しましたが公開前検査を通過しませんでした。`,
  }
}
