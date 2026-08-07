/**
 * lib/youtube/script/generators/openai-compatible.ts — OSS LLM で台本ドラフトを生成する
 *
 * OpenAI互換の /chat/completions を叩くだけなので、次のいずれでも動く:
 *   - Ollama            http://localhost:11434/v1
 *   - vLLM              http://<host>:8000/v1        (Vast.ai 上でも可)
 *   - LM Studio         http://localhost:1234/v1
 *   - LiteLLM proxy     http://localhost:4000/v1
 *   - 自前ホストの Dify  (OpenAI互換エンドポイント)
 *
 * Dify Cloud に依存しないため、追加の月額費用なしで台本層を回せる。
 */

import { optionalEnv } from "@/lib/sales/japan-readiness-utils"
import type { ScriptDraft } from "../types"
import type { DraftGenerator } from "../build"

export interface OssLlmConfig {
  baseUrl: string
  model: string
  apiKey: string | null
  timeoutMs: number
  temperature: number
}

const DEFAULT_BASE_URL = "http://localhost:11434/v1"
const DEFAULT_MODEL = "qwen2.5:14b-instruct"

/**
 * 温度をやや高めに置く。台本層は反復性ゲートで直近作との類似度を見られるため、
 * 決定論的な出力だと同じ言い回しに収束して却下され続ける。
 */
const DEFAULT_TEMPERATURE = 0.85

export function getOssLlmConfig(): OssLlmConfig {
  return {
    baseUrl: (optionalEnv("YOUTUBE_SCRIPT_LLM_BASE_URL") ?? DEFAULT_BASE_URL).replace(/\/+$/, ""),
    model: optionalEnv("YOUTUBE_SCRIPT_LLM_MODEL") ?? DEFAULT_MODEL,
    apiKey: optionalEnv("YOUTUBE_SCRIPT_LLM_API_KEY"),
    timeoutMs: Number(optionalEnv("YOUTUBE_SCRIPT_LLM_TIMEOUT_MS") ?? 180_000),
    temperature: Number(optionalEnv("YOUTUBE_SCRIPT_LLM_TEMPERATURE") ?? DEFAULT_TEMPERATURE),
  }
}

/**
 * ```json ... ``` で包まれていても読めるようにする。
 *
 * ここでは JSON オブジェクトであることだけを確認し、中身の形は検証しない。
 * 生成器は台本全体・構成案・1シーン分のいずれも運ぶため、
 * 特定の形(scenes 配列など)を要求すると他の用途で誤って弾いてしまう。
 * 形の検証は用途を知っている呼び出し側(compose.ts)の責務にする。
 */
export function parseDraftJson(text: string): ScriptDraft {
  const stripped = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim()
  const parsed = JSON.parse(stripped) as unknown
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("ドラフトがJSONオブジェクトではありません。")
  }
  return parsed as ScriptDraft
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>
  error?: { message?: string }
}

type FetchLike = typeof fetch

/**
 * OpenAI互換サーバー向けの生成器を作る。
 *
 * JSONモードは OSS サーバーごとに対応状況がばらつくため、
 * 400が返ったら response_format を外して一度だけ再送する。
 */
export function createOpenAiCompatibleGenerator(
  config: OssLlmConfig = getOssLlmConfig(),
  fetchImpl: FetchLike = fetch,
): DraftGenerator {
  return async ({ systemPrompt, payload }) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(payload) },
    ]

    const send = async (useJsonMode: boolean): Promise<Response> => {
      const body: Record<string, unknown> = {
        model: config.model,
        messages,
        temperature: config.temperature,
        stream: false,
      }
      if (useJsonMode) body.response_format = { type: "json_object" }

      return fetchImpl(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(config.timeoutMs),
      })
    }

    try {
      let response = await send(true)
      if (response.status === 400) {
        // JSONモード非対応のサーバーとみなして素の生成に落とす。
        response = await send(false)
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => "")
        return {
          ok: false,
          errorMessage: `[oss-llm ${config.model}] ${response.status} ${detail.slice(0, 200)}`,
        }
      }

      const json = (await response.json()) as ChatCompletionResponse
      if (json.error?.message) {
        return { ok: false, errorMessage: `[oss-llm ${config.model}] ${json.error.message}` }
      }

      const content = json.choices?.[0]?.message?.content
      if (typeof content !== "string" || content.trim().length === 0) {
        return { ok: false, errorMessage: `[oss-llm ${config.model}] 空の応答が返りました。` }
      }

      return { ok: true, draft: parseDraftJson(content) }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { ok: false, errorMessage: `[oss-llm ${config.model}] ${message}` }
    }
  }
}
