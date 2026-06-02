import type { JsonRecord } from "./japan-readiness-types"

export function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%\s,]/g, ""))
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function cleanDomain(domain: string): string {
  try {
    return new URL(domain.startsWith("http") ? domain : `https://${domain}`).hostname.replace(/^www\./, "")
  } catch (error) {
    console.error("[japan-readiness] invalid domain:", domain, error)
    return domain.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]
  }
}

export function pickNumber(meta: JsonRecord, paths: string[][]): number | null {
  for (const path of paths) {
    let current: unknown = meta
    for (const key of path) current = asRecord(current)?.[key]
    const parsed = asNumber(current)
    if (parsed !== null) return parsed
  }
  return null
}

export function techNames(meta: JsonRecord): string[] {
  const stack = asRecord(meta.tech)?.stack ?? meta.tech_stack ?? meta.technologies ?? meta.wappalyzer
  if (!Array.isArray(stack)) return []
  return stack
    .map((item) => (typeof item === "string" ? item : asString(asRecord(item)?.name)))
    .filter((item): item is string => item !== null)
}

export function hasTech(meta: JsonRecord, names: string[]): boolean {
  const haystack = techNames(meta).join(" ").toLowerCase()
  return names.some((name) => haystack.includes(name.toLowerCase()))
}

export function optionalEnv(name: string): string | null {
  const value = process.env[name]
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}
