/**
 * lib/deepseek.ts — LLM ゲートウェイ (LiteLLM スタイル・多段フォールバック)
 *
 * 役割: 全 LLM 呼び出しの唯一の窓口。OpenAI 互換 endpoint を叩き、
 *       モデル/プロバイダの **フォールバックチェーン** で「空応答・エラー」を吸収する。
 *
 * モデル方針 (2026-05-20・ユーザー指示「LiteLLM・default DeepSeek V4・fallback」):
 *   - **default = DeepSeek V4 を最初に試す** → 空/失敗なら自動で次モデルへフォールバック
 *   - 実 API では deepseek-v4-pro/v4/v4-flash が 200/空応答を返すため、フォールバックで
 *     `deepseek-chat` (実出力) に落ちる設計。DeepSeek が真の V4 id を公開したら default で通る。
 *   - **LiteLLM 対応**: DEEPSEEK_API_BASE で LiteLLM proxy / OpenRouter 等の OpenAI 互換
 *     endpoint に差し替え可。LiteLLM 経由なら DEEPSEEK_MODEL_CHAIN に "deepseek/..." を設定。
 *   - **第2プロバイダ fallback**: OPENROUTER_API_KEY があれば、primary 全滅時に OpenRouter へ。
 *
 * env:
 *   LITELLM_API_KEY         LiteLLM proxy key (configured時はprimaryとして優先)
 *   LITELLM_API_BASE        LiteLLM OpenAI-compatible base URL
 *   DEEPSEEK_API_KEY        primary プロバイダの鍵 (必須)
 *   DEEPSEEK_API_BASE       primary base URL (default https://api.deepseek.com/v1・LiteLLM 差替可)
 *   DEEPSEEK_MODEL_CHAIN    試行モデルを comma 区切りで明示 (例 "deepseek-v4,deepseek-chat")
 *   DEEPSEEK_MODEL          単一 default モデル (CHAIN 未指定時の先頭・default "deepseek-v4-pro")
 *   OPENROUTER_API_KEY      任意・第2プロバイダ fallback の鍵
 *   OPENROUTER_MODEL        任意・OpenRouter で使うモデル (default "deepseek/deepseek-chat")
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
  const providers: Provider[] = []
  const dsKey = process.env.LITELLM_API_KEY?.trim() ?? process.env.DEEPSEEK_API_KEY?.trim()
  if (dsKey) {
    providers.push({
      name: process.env.LITELLM_API_KEY?.trim() ? "litellm" : "deepseek",
      base: (process.env.LITELLM_API_BASE ?? process.env.DEEPSEEK_API_BASE ?? "https://api.deepseek.com/v1").replace(/\/+$/, ""),
      key: dsKey,
      models: modelPolicy === "strict" && optModel ? [optModel] : primaryModels(optModel),
    })
  }
  if (modelPolicy === "strict") return providers
  // 第2プロバイダ fallback (OpenRouter)
  const orKey = process.env.OPENROUTER_API_KEY?.trim()
  if (orKey) {
    providers.push({
      name: "openrouter",
      base: "https://openrouter.ai/api/v1",
      key: orKey,
      models: [process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat"],
    })
  }
  return providers
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
  if (opts.responseFormat === "json_object") {
    body.response_format = { type: "json_object" }
  }
  try {
    const res = await fetch(`${provider.base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.key}`,
        "Content-Type": "application/json",
        // OpenRouter 推奨ヘッダ (任意)
        ...(provider.name === "openrouter"
          ? { "HTTP-Referer": "https://paradigmjp.com", "X-Title": "Paradigm Sales OS" }
          : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS),
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
    return { ok: true, text, usedModel: model, usage: data.usage, status: 200 }
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
    return { ok: false, error: "no LLM provider configured (LITELLM_API_KEY / DEEPSEEK_API_KEY / OPENROUTER_API_KEY)" }
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
  if (!usage?.cache_hit_tokens || !usage.cache_miss_tokens) return 0
  const total = usage.cache_hit_tokens + usage.cache_miss_tokens
  return total > 0 ? usage.cache_hit_tokens / total : 0
}
