/** Small, runtime-safe helpers for parsing JSON responses from LLM APIs. */
export type JsonObject = Record<string, unknown>

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function readChatContent(value: unknown): string {
  if (!isJsonObject(value) || !Array.isArray(value.choices)) {
    throw new Error("LLM response did not contain a choices array")
  }

  const firstChoice: unknown = value.choices[0]
  if (!isJsonObject(firstChoice) || !isJsonObject(firstChoice.message)) {
    throw new Error("LLM response did not contain a message")
  }

  const content = firstChoice.message.content
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("LLM response did not contain message content")
  }
  return content
}

export function parseJsonObject(content: string): JsonObject {
  const parsed: unknown = JSON.parse(content.replace(/```json\s*|\s*```/g, "").trim())
  if (!isJsonObject(parsed)) {
    throw new Error("LLM response JSON must be an object")
  }
  return parsed
}

export function boundedNumber(value: unknown, fallback: number, min = 0, max = 1): number {
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

export function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}
