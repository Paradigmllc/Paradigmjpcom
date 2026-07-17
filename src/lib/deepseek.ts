/**
 * lib/deepseek.ts — DeepSeek 公式 API ゲートウェイ
 *
 * 役割: 全 LLM 呼び出しの唯一の窓口。DeepSeek公式のOpenAI互換endpointを叩き、
 *       同一プロバイダ内のモデルフォールバックで「空応答・エラー」を吸収する。
 *
 * モデル方針 (2026-07-13・ユーザー指示「DeepSeek V4 直叩き」):
 *   - **default = DeepSeek V4 を最初に試す** → 空/失敗なら自動で次モデルへフォールバック
 *   - 実 API では deepseek-v4-pro/v4/v4-flash が 200/空応答を返すため、フォールバックで
 *     `deepseek-chat` (実出力) に落ちる設計。DeepSeek が真の V4 id を公開したら default で通る。
 *   - LiteLLM / OpenRouterを経由せず、常にDeepSeek公式APIを直接呼び出す。
 *
 * env:
 *   DEEPSEEK_API_KEY        DeepSeek 公式 API key (必須)
 *   DEEPSEEK_API_BASE       DeepSeek API base URL (default https://api.deepseek.com/v1)
 *   DEEPSEEK_MODEL_CHAIN    試行モデルを comma 区切りで明示 (例 "deepseek-v4,deepseek-chat")
 *   DEEPSEEK_MODEL          単一 default モデル (CHAIN 未指定時の先頭・default "deepseek-v4-pro")
 *
 * 設計原則: system prompt 固定で cache hit / timeout + AbortSignal / fail-soft。
 */

const DEFAULT_TIMEOUT_MS = 30_000

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface DeepSeekOptions {
  model?: string // 指定時はこのモデルを先頭に (フォールバックは継続)
  /** strict の場合は指定モデル・primary providerのみを使用し、別モデルへ落とさない。 */
  modelPolicy?: "chain" | "strict"
  temperature?: number
  maxTokens?: number
  responseFormat?: "text" | "json_object"
  thinking?: "enabled" | "disabled"
  timeoutMs?: number
}

export interface DeepSeekResponse {
  ok: boolean
  text?: string
  usedModel?: string // 実際に成功したモデル (観測性)
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    cache_hit_tokens?: number
    cache_miss_tokens?: number
  }
  error?: string
  status?: number
}

interface Provider {
  name: string
  base: string
  key: string
  models: string[]
}

interface RawDeepSeekUsage {
  prompt_tokens: number
  completion_tokens: number
  prompt_cache_hit_tokens?: number
  prompt_cache_miss_tokens?: number
  cache_hit_tokens?: number
  cache_miss_tokens?: number
}

const DEEPSEEK_BALANCE_ERROR = "DeepSeek APIの残高不足で解析を停止しました。残高を補充後、解析履歴の「再解析」を実行してください。"

export function normalizeDeepSeekError(status: number, raw: string, statusText = ""): string {
  let detail = raw.trim()
  if (detail.startsWith("{")) {
    try {
      const parsed = JSON.parse(detail) as { error?: { message?: unknown } }
      if (typeof parsed.error?.message === "string") detail = parsed.error.message.trim()
    } catch (error) {
      console.warn("[llm] DeepSeek error response was malformed JSON:", error)
    }
  }
  if (status === 402 || /insufficient balance/i.test(detail)) return DEEPSEEK_BALANCE_ERROR
  return detail || statusText || `DeepSeek API error (${status})`
}

export function normalizeDeepSeekUsage(usage?: RawDeepSeekUsage): DeepSeekResponse["usage"] {
  if (!usage) return undefined
  return {
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    cache_hit_tokens: usage.prompt_cache_hit_tokens ?? usage.cache_hit_tokens ?? 0,
    cache_miss_tokens: usage.prompt_cache_miss_tokens ?? usage.cache_miss_tokens ?? 0,
  }
}

/* ───── フォールバックチェーン構築 ───── */

function primaryModels(optModel?: string): string[] {
  const chain = process.env.DEEPSEEK_MODEL_CHAIN
    ? process.env.DEEPSEEK_MODEL_CHAIN.split(",").map((m) => m.trim()).filter(Boolean)
    : [process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro", "deepseek-chat"]
  // opts.model 指定時は先頭に差し込み (重複排除)
  const merged = optModel ? [optModel, ...chain] : chain
  return [...new Set(merged)]
}

function buildProviders(optModel?: string, modelPolicy: DeepSeekOptions["modelPolicy"] = "chain"): Provider[] {
  const dsKey = process.env.DEEPSEEK_API_KEY?.trim()
  if (!dsKey) return []
  return [{
    name: "deepseek",
    base: (process.env.DEEPSEEK_API_BASE ?? "https://api.deepseek.com/v1").replace(/\/+$/, ""),
    key: dsKey,
    models: modelPolicy === "strict" && optModel ? [optModel] : primaryModels(optModel),
  }]
}

/* ───── 1 回の呼び出し ───── */

async function callOnce(
  provider: Provider,
  model: string,
  messages: DeepSeekMessage[],
  opts: DeepSeekOptions,
): Promise<DeepSeekResponse> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 1500,
    stream: false,
  }
  if (opts.thinking) body.thinking = { type: opts.thinking }
  if (opts.responseFormat === "json_object") {
    body.response_format = { type: "json_object" }
  }
  try {
    const res = await fetch(`${provider.base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: normalizeDeepSeekError(res.status, text, res.statusText), status: res.status }
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: RawDeepSeekUsage
    }
    const text = data.choices?.[0]?.message?.content ?? ""
    return { ok: true, text, usedModel: model, usage: normalizeDeepSeekUsage(data.usage), status: 200 }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/* ───── Public: フォールバック付き呼び出し ───── */

/**
 * LLM を呼ぶ。provider × model のチェーンを順に試し、
 * **最初に「ok かつ非空テキスト」を返したもの**を採用する。
 * 空応答 (v4 系の挙動) もエラー扱いにして次へフォールバックする。
 */
export async function callDeepSeek(
  messages: DeepSeekMessage[],
  opts: DeepSeekOptions = {},
): Promise<DeepSeekResponse> {
  const providers = buildProviders(opts.model, opts.modelPolicy)
  if (providers.length === 0) {
    return { ok: false, error: "DEEPSEEK_API_KEY is not configured for the official DeepSeek API" }
  }

  let last: DeepSeekResponse = { ok: false, error: "no attempt made" }
  for (const provider of providers) {
    for (const model of provider.models) {
      const res = await callOnce(provider, model, messages, opts)
      if (res.ok && res.text && res.text.trim()) {
        if (last.error && last.error !== "no attempt made") {
          console.warn(`[llm] fallback → ${provider.name}/${model} (前段失敗: ${last.error?.slice(0, 80)})`)
        }
        return res
      }
      // 空応答 or エラー → 次候補へ
      last = res.ok
        ? { ok: false, error: `empty response from ${provider.name}/${model}`, status: res.status }
        : res
      console.warn(`[llm] skip ${provider.name}/${model}: ${last.error?.slice(0, 100)}`)
    }
  }
  return last
}

/**
 * Cache hit ratio を計算 (debug 用・コスト監視に使う)
 */
export function cacheHitRatio(usage?: DeepSeekResponse["usage"]): number {
  const hits = usage?.cache_hit_tokens ?? 0
  const misses = usage?.cache_miss_tokens ?? 0
  const total = hits + misses
  return total > 0 ? hits / total : 0
}
