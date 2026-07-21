import { z } from "zod"
import { callDeepSeek, type DeepSeekMessage, type DeepSeekResponse } from "@/lib/deepseek"

const MODEL = "deepseek-v4-pro" as const
const STAGE_MAX_TOKENS = { generation: 4_000, repair: 2_400, critic: 1_200 } as const

export type DeepSeekStructuredCaller = typeof callDeepSeek

export function addDeepSeekUsage(
  current?: DeepSeekResponse["usage"],
  next?: DeepSeekResponse["usage"],
): DeepSeekResponse["usage"] {
  if (!current && !next) return undefined
  return {
    prompt_tokens: (current?.prompt_tokens ?? 0) + (next?.prompt_tokens ?? 0),
    completion_tokens: (current?.completion_tokens ?? 0) + (next?.completion_tokens ?? 0),
    cache_hit_tokens: (current?.cache_hit_tokens ?? 0) + (next?.cache_hit_tokens ?? 0),
    cache_miss_tokens: (current?.cache_miss_tokens ?? 0) + (next?.cache_miss_tokens ?? 0),
  }
}

function parseJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""))
}

export async function callDeepSeekStructured<T>(input: {
  stage: keyof typeof STAGE_MAX_TOKENS
  messages: DeepSeekMessage[]
  schema: z.ZodType<T>
  caller: DeepSeekStructuredCaller
}): Promise<
  | { ok: true; data: T; attempts: number; usage?: DeepSeekResponse["usage"] }
  | { ok: false; attempts: number; error: string; usage?: DeepSeekResponse["usage"] }
> {
  let lastError = `${input.stage} failed`
  let usage: DeepSeekResponse["usage"]
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let response: DeepSeekResponse
    try {
      response = await input.caller(input.messages, {
        model: MODEL,
        modelPolicy: "strict",
        responseFormat: "json_object",
        temperature: input.stage === "generation" ? 0.55 : input.stage === "repair" ? 0.35 : 0.1,
        maxTokens: STAGE_MAX_TOKENS[input.stage],
        thinking: "disabled",
        timeoutMs: 120_000,
      })
    } catch (error) {
      lastError = error instanceof Error ? error.message : `${input.stage} call failed`
      console.error(`[japan-entry-message] ${input.stage} attempt ${attempt} threw:`, error)
      continue
    }
    usage = addDeepSeekUsage(usage, response?.usage)
    if (!response?.ok || !response.text) {
      lastError = response?.error ?? `${input.stage} returned an empty response`
      console.error(`[japan-entry-message] ${input.stage} attempt ${attempt} failed:`, lastError)
      continue
    }
    try {
      return { ok: true, data: input.schema.parse(parseJson(response.text)), attempts: attempt, usage }
    } catch (error) {
      lastError = error instanceof Error ? error.message : `${input.stage} returned invalid JSON`
      console.error(`[japan-entry-message] ${input.stage} attempt ${attempt} JSON invalid:`, lastError)
    }
  }
  return { ok: false, attempts: 3, error: lastError, usage }
}
