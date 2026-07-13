/**
 * deepseek.test.ts — LLM フォールバックチェーンの単体テスト
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { cacheHitRatio, callDeepSeek, normalizeDeepSeekUsage } from "./deepseek"

beforeEach(() => {
  process.env.DEEPSEEK_API_KEY = "test-key"
  delete process.env.OPENROUTER_API_KEY
  delete process.env.DEEPSEEK_MODEL_CHAIN
  delete process.env.DEEPSEEK_MODEL
  delete process.env.DEEPSEEK_API_BASE
  delete process.env.LITELLM_API_KEY
  delete process.env.LITELLM_API_BASE
  vi.spyOn(console, "warn").mockImplementation(() => {})
})
afterEach(() => vi.unstubAllGlobals())

/** model ごとに返す content を map で指定 (未登録 model は空応答) */
function mockByModel(map: Record<string, string>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { model: string }
      const content = map[body.model] ?? ""
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }),
  )
}

describe("callDeepSeek フォールバックチェーン", () => {
  it("default: v4-pro 空 → deepseek-chat にフォールバック", async () => {
    mockByModel({ "deepseek-v4-pro": "", "deepseek-chat": "実出力です" })
    const r = await callDeepSeek([{ role: "user", content: "hi" }])
    expect(r.ok).toBe(true)
    expect(r.text).toBe("実出力です")
    expect(r.usedModel).toBe("deepseek-chat")
  })

  it("先頭モデルが成功すればフォールバックしない", async () => {
    process.env.DEEPSEEK_MODEL_CHAIN = "deepseek-chat,deepseek-coder"
    mockByModel({ "deepseek-chat": "OK1" })
    const r = await callDeepSeek([{ role: "user", content: "hi" }])
    expect(r.usedModel).toBe("deepseek-chat")
    expect(r.text).toBe("OK1")
  })

  it("全モデル空 → ok:false", async () => {
    mockByModel({})
    const r = await callDeepSeek([{ role: "user", content: "hi" }])
    expect(r.ok).toBe(false)
  })

  it("provider 鍵が無い → ok:false", async () => {
    delete process.env.DEEPSEEK_API_KEY
    const r = await callDeepSeek([{ role: "user", content: "hi" }])
    expect(r.ok).toBe(false)
    expect(r.error).toContain("no LLM provider")
  })

  it("opts.model 指定はチェーン先頭に入る", async () => {
    mockByModel({ "deepseek-coder": "coder出力" })
    const r = await callDeepSeek([{ role: "user", content: "hi" }], { model: "deepseek-coder" })
    expect(r.usedModel).toBe("deepseek-coder")
  })

  it("strict policyは指定モデルからフォールバックしない", async () => {
    mockByModel({ "deepseek-v4-pro": "", "deepseek-chat": "fallback output" })
    const r = await callDeepSeek(
      [{ role: "user", content: "hi" }],
      { model: "deepseek-v4-pro", modelPolicy: "strict" },
    )
    expect(r.ok).toBe(false)
    expect(r.error).toContain("empty response")
  })

  it("strict V4 Pro calls the DeepSeek API directly even if LiteLLM variables exist", async () => {
    process.env.LITELLM_API_KEY = "litellm-test-key"
    process.env.LITELLM_API_BASE = "https://litellm.example/v1"
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { model: string }
      expect(url).toBe("https://api.deepseek.com/v1/chat/completions")
      expect(body.model).toBe("deepseek-v4-pro")
      return new Response(JSON.stringify({ choices: [{ message: { content: "V4 Pro output" } }] }), { status: 200 })
    })
    vi.stubGlobal("fetch", fetchMock)
    const r = await callDeepSeek(
      [{ role: "user", content: "hi" }],
      { model: "deepseek-v4-pro", modelPolicy: "strict" },
    )
    expect(r.ok).toBe(true)
    expect(r.usedModel).toBe("deepseek-v4-pro")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("passes non-thinking mode for deterministic JSON generation", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string) as { thinking?: { type?: string }; response_format?: { type?: string } }
      expect(body.thinking).toEqual({ type: "disabled" })
      expect(body.response_format).toEqual({ type: "json_object" })
      return new Response(JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }] }), { status: 200 })
    })
    vi.stubGlobal("fetch", fetchMock)

    const r = await callDeepSeek([{ role: "user", content: "JSONで返してください" }], {
      model: "deepseek-v4-pro",
      modelPolicy: "strict",
      responseFormat: "json_object",
      thinking: "disabled",
    })

    expect(r.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("normalizes official prompt cache usage fields", () => {
    const usage = normalizeDeepSeekUsage({
      prompt_tokens: 1_000,
      completion_tokens: 500,
      prompt_cache_hit_tokens: 800,
      prompt_cache_miss_tokens: 200,
    })
    expect(usage?.cache_hit_tokens).toBe(800)
    expect(usage?.cache_miss_tokens).toBe(200)
    expect(cacheHitRatio(usage)).toBe(0.8)
  })
})
