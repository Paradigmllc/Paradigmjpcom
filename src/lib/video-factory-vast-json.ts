export type JsonRecord = Record<string, unknown>

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function jsonArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function jsonString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function jsonNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function jsonRecord(value: unknown): JsonRecord | null {
  return isJsonRecord(value) ? value : null
}
