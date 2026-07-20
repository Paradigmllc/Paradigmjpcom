import type { JapanEntryInitialInterestOptions } from "./japan-entry-message-options"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

export const MANUAL_MESSAGE_VARIANTS = [
  "estimate_off_price_off",
  "estimate_on_price_off",
  "estimate_off_price_on",
  "estimate_on_price_on",
] as const

export type ManualMessageVariant = (typeof MANUAL_MESSAGE_VARIANTS)[number]
export type ManualMessageVariantSelection = ManualMessageVariant | "auto"

export const MANUAL_MESSAGE_VARIANT_LABELS: Record<ManualMessageVariant, string> = {
  estimate_off_price_off: "推定なし・価格なし",
  estimate_on_price_off: "推定あり・価格なし",
  estimate_off_price_on: "推定なし・価格あり",
  estimate_on_price_on: "推定あり・価格あり",
}

export function isManualMessageVariant(value: unknown): value is ManualMessageVariant {
  return typeof value === "string" && MANUAL_MESSAGE_VARIANTS.includes(value as ManualMessageVariant)
}

export function variantOptions(variant: ManualMessageVariant): JapanEntryInitialInterestOptions {
  return {
    includeEstimate: variant === "estimate_on_price_off" || variant === "estimate_on_price_on",
    includePrice: variant === "estimate_off_price_on" || variant === "estimate_on_price_on",
    founderForwardCta: true,
  }
}

export function nonEstimateVariant(variant: ManualMessageVariant): ManualMessageVariant {
  return variantOptions(variant).includePrice ? "estimate_off_price_on" : "estimate_off_price_off"
}

export function assignManualMessageVariant(domain: string): ManualMessageVariant {
  void domain
  return "estimate_off_price_off"
}

export interface ManualExperimentMetric {
  variant: ManualMessageVariant
  assigned: number
  manuallySent: number
  replies: number
  founderForwards: number
  meetings: number
}

type ExperimentRow = Pick<
  ManualJapanEntryWorkRow,
  "message_variant" | "manually_sent_at" | "reply_received_at" | "founder_forwarded_at" | "meeting_converted_at"
>

export function summarizeManualWorkExperiment(rows: ExperimentRow[]): ManualExperimentMetric[] {
  return MANUAL_MESSAGE_VARIANTS.map((variant) => {
    const matches = rows.filter((row) => row.message_variant === variant)
    return {
      variant,
      assigned: matches.length,
      manuallySent: matches.filter((row) => Boolean(row.manually_sent_at)).length,
      replies: matches.filter((row) => Boolean(row.reply_received_at)).length,
      founderForwards: matches.filter((row) => Boolean(row.founder_forwarded_at)).length,
      meetings: matches.filter((row) => Boolean(row.meeting_converted_at)).length,
    }
  })
}
