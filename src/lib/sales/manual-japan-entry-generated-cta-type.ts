export const MANUAL_GENERATED_CTA_TYPES = [
  "permission_to_send",
  "right_person",
  "founder_forward",
  "legacy_unspecified",
] as const

export type ManualGeneratedCtaType = (typeof MANUAL_GENERATED_CTA_TYPES)[number]

export function normalizeGeneratedManualCtaType(value: unknown): unknown {
  if (typeof value !== "string") return value
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_")
  if (MANUAL_GENERATED_CTA_TYPES.includes(normalized as ManualGeneratedCtaType)) return normalized
  if (/(?:founder|international_growth).*(?:forward|route|recipient)|(?:forward|route).*(?:founder|international_growth)/.test(normalized)) {
    return "founder_forward"
  }
  if (/(?:right|correct|appropriate)_(?:person|contact|owner|recipient)|(?:owner|recipient|routing)/.test(normalized)) {
    return "right_person"
  }
  if (/(?:permission|request|offer).*(?:send|share)|(?:send|share).*(?:analysis|brief|report|permission)/.test(normalized)) {
    return "permission_to_send"
  }
  return value
}
