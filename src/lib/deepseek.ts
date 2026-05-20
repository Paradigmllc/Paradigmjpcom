/**
 * lib/deepseek.ts — DeepSeek V4 PRO API wrapper (Sprint 10-A)
 *
 * 役割: DeepSeek Chat Completions API を呼ぶ唯一の窓口。
 *       Context Caching を最大化する設計 (system prompt 冒頭固定 → 90% OFF)。
 *
 * モデル方針 (2026-05-20 改訂・ユーザー承認):
 *   - 旧「deepseek-v4-pro 永久固定」を撤回。実 API で v4-pro は空応答を返すため。
 *   - **DEFAULT_MODEL = "deepseek-chat"** (env DEEPSEEK_MODEL で上書き可)
 *   - **LiteLLM 対応**: env DEEPSEEK_API_BASE で OpenAI 互換 endpoint (LiteLLM proxy /
 *     OpenRouter 等) に差し替え可能。LiteLLM 経由なら model="deepseek/deepseek-chat" 等を
 *     DEEPSEEK_MODEL に設定。base 未設定時は api.deepseek.com 直叩き。
 *
 * 設計原則:
 *   1. system prompt に「固定プレフィックス」を頭に置く → cache hit
 *   2. timeout 30s + AbortSignal (fail-soft)
 *   3. env 未設定なら { ok: false } 返却 (fail-soft)
 */

// LiteLLM 対応: base URL を env で差し替え可 (OpenAI 互換 endpoint)
const API_BASE = process.env.DEEPSEEK_API_BASE ?? "https://api.deepseek.com/v1"
const CHAT_URL = `${API_BASE.replace(/\/+$/, "")}/chat/completions`
// 2026-05-20 改訂: v4-pro は実 API で空応答 → deepseek-chat に変更 (env DEEPSEEK_MODEL で上書き可)
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat"
const DEFAULT_TIMEOUT_MS = 30_000

const apiKey = () => process.env.DEEPSEEK_API_KEY ?? ""

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface DeepSeekOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: "text" | "json_object"
  timeoutMs?: number
}

export interface DeepSeekResponse {
  ok: boolean
  text?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    cache_hit_tokens?: number
    cache_miss_tokens?: number
  }
  error?: string
  status?: number
}

/**
 * DeepSeek Chat Completions を呼ぶ.
 *
 * @example
 *   const res = await callDeepSeek([
 *     { role: "system", content: SALES_SYSTEM_PROMPT }, // cache-friendly 固定
 *     { role: "user",   content: `会社名: ${name}\n課題: ${issue}` }, // 変数
 *   ])
 */
export async function callDeepSeek(
  messages: DeepSeekMessage[],
  opts: DeepSeekOptions = {},
): Promise<DeepSeekResponse> {
  const key = apiKey()
  if (!key) {
    return { ok: false, error: "DEEPSEEK_API_KEY not set" }
  }
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const body: Record<string, unknown> = {
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 1500,
    stream: false,
  }
  if (opts.responseFormat === "json_object") {
    body.response_format = { type: "json_object" }
  }
  try {
    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: text || res.statusText, status: res.status }
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: DeepSeekResponse["usage"]
    }
    const text = data.choices?.[0]?.message?.content ?? ""
    return { ok: true, text, usage: data.usage, status: 200 }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

/**
 * Cache hit ratio を計算 (debug 用・コスト監視に使う)
 */
export function cacheHitRatio(usage?: DeepSeekResponse["usage"]): number {
  if (!usage?.cache_hit_tokens || !usage.cache_miss_tokens) return 0
  const total = usage.cache_hit_tokens + usage.cache_miss_tokens
  return total > 0 ? usage.cache_hit_tokens / total : 0
}
