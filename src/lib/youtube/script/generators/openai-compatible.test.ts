import { describe, expect, it } from "vitest"

import { createOpenAiCompatibleGenerator, parseDraftJson, type OssLlmConfig } from "./openai-compatible"

const CONFIG: OssLlmConfig = {
  baseUrl: "http://localhost:11434/v1",
  model: "qwen2.5:14b-instruct",
  apiKey: null,
  timeoutMs: 5_000,
  temperature: 0.85,
}

const DRAFT_JSON = JSON.stringify({
  title: "テスト",
  description: "説明",
  tags: ["a"],
  thumbnailText: ["テスト"],
  hook: "導入",
  originalValue: { kind: "original_analysis", statement: "独自の整理。", evidenceSceneIndexes: [0] },
  scenes: [{ narration: "本文", onScreenText: [], visualSpec: {}, sourceUrls: [] }],
})

interface RecordedCall {
  url: string
  body: Record<string, unknown>
  headers: Record<string, string>
}

/** 応答を順に返す fetch のスタブ。呼び出し内容を記録する。 */
function stubFetch(responses: Response[], calls: RecordedCall[]): typeof fetch {
  let index = 0
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body ?? "{}")),
      headers: (init?.headers ?? {}) as Record<string, string>,
    })
    const response = responses[Math.min(index, responses.length - 1)]
    index += 1
    return response
  }) as unknown as typeof fetch
}

function chatResponse(content: string, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("parseDraftJson", () => {
  it("素のJSONを読める", () => {
    expect(parseDraftJson(DRAFT_JSON).scenes.length).toBe(1)
  })

  it("コードフェンスで包まれていても読める", () => {
    expect(parseDraftJson("```json\n" + DRAFT_JSON + "\n```").title).toBe("テスト")
  })

  it("1シーン分の応答も通す", () => {
    // 逐次生成では scenes を持たない {narration:...} が返る。
    // ここで形を決め打ちすると、シーン生成が全滅する(実測で発覚)。
    const scene = parseDraftJson('{"narration":"本文","onScreenText":[],"sourceUrls":[]}')
    expect((scene as unknown as { narration: string }).narration).toBe("本文")
  })

  it("オブジェクトでなければ例外にする", () => {
    expect(() => parseDraftJson("[1,2,3]")).toThrow(/JSONオブジェクト/)
    expect(() => parseDraftJson('"just a string"')).toThrow(/JSONオブジェクト/)
  })
})

describe("createOpenAiCompatibleGenerator", () => {
  it("OpenAI互換エンドポイントを叩いてドラフトを返す", async () => {
    const calls: RecordedCall[] = []
    const generate = createOpenAiCompatibleGenerator(CONFIG, stubFetch([chatResponse(DRAFT_JSON)], calls))

    const result = await generate({ systemPrompt: "SYS", payload: { topic: "t" } })

    expect(result.ok).toBe(true)
    expect(result.draft?.title).toBe("テスト")
    expect(calls[0].url).toBe("http://localhost:11434/v1/chat/completions")
    expect(calls[0].body.model).toBe("qwen2.5:14b-instruct")
    expect(calls[0].body.temperature).toBe(0.85)
  })

  it("systemPrompt と payload を messages に載せる", async () => {
    const calls: RecordedCall[] = []
    const generate = createOpenAiCompatibleGenerator(CONFIG, stubFetch([chatResponse(DRAFT_JSON)], calls))
    await generate({ systemPrompt: "SYS", payload: { topic: "計算順序" } })

    const messages = calls[0].body.messages as Array<{ role: string; content: string }>
    expect(messages[0].role).toBe("system")
    expect(messages[0].content).toBe("SYS")
    expect(messages[1].content).toContain("計算順序")
  })

  it("JSONモード非対応(400)なら response_format を外して再送する", async () => {
    const calls: RecordedCall[] = []
    const generate = createOpenAiCompatibleGenerator(
      CONFIG,
      stubFetch([new Response("unsupported", { status: 400 }), chatResponse(DRAFT_JSON)], calls),
    )

    const result = await generate({ systemPrompt: "SYS", payload: {} })

    expect(result.ok).toBe(true)
    expect(calls.length).toBe(2)
    expect(calls[0].body.response_format).toBeTruthy()
    expect(calls[1].body.response_format).toBe(undefined)
  })

  it("APIキーがあれば Authorization を付ける", async () => {
    const calls: RecordedCall[] = []
    const generate = createOpenAiCompatibleGenerator(
      { ...CONFIG, apiKey: "sk-local" },
      stubFetch([chatResponse(DRAFT_JSON)], calls),
    )
    await generate({ systemPrompt: "SYS", payload: {} })
    expect(calls[0].headers.Authorization).toBe("Bearer sk-local")
  })

  it("APIキーが無ければ Authorization を付けない", async () => {
    const calls: RecordedCall[] = []
    const generate = createOpenAiCompatibleGenerator(CONFIG, stubFetch([chatResponse(DRAFT_JSON)], calls))
    await generate({ systemPrompt: "SYS", payload: {} })
    expect(calls[0].headers.Authorization).toBe(undefined)
  })

  it("サーバーエラーはエラーとして返す", async () => {
    const generate = createOpenAiCompatibleGenerator(
      CONFIG,
      stubFetch([new Response("model not found", { status: 404 })], []),
    )
    const result = await generate({ systemPrompt: "SYS", payload: {} })
    expect(result.ok).toBe(false)
    expect(result.errorMessage).toContain("404")
  })

  it("空応答はエラーとして返す", async () => {
    const generate = createOpenAiCompatibleGenerator(CONFIG, stubFetch([chatResponse("   ")], []))
    const result = await generate({ systemPrompt: "SYS", payload: {} })
    expect(result.ok).toBe(false)
    expect(result.errorMessage).toContain("空の応答")
  })

  it("JSONとして壊れていればエラーとして返す", async () => {
    const generate = createOpenAiCompatibleGenerator(CONFIG, stubFetch([chatResponse("not json at all")], []))
    const result = await generate({ systemPrompt: "SYS", payload: {} })
    expect(result.ok).toBe(false)
  })
})
