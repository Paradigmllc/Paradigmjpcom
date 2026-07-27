export const JAPAN_ENTRY_FOUNDING_PARTNER_CAPACITY =
  "Limited founding-partner capacity"

export const JAPAN_ENTRY_FOUNDING_PARTNER_CAPACITY_DISCLOSURE =
  "Founding-partner capacity is limited and confirmed in writing before kickoff."

export const JAPAN_ENTRY_FOUNDING_PARTNER_CAPACITY_STAT = {
  value: "Limited",
  label: JAPAN_ENTRY_FOUNDING_PARTNER_CAPACITY,
} as const

// Compatibility aliases for internal imports that still use the established
// Japan Entry identifiers. Public copy no longer exposes the old month-one target.
export const JAPAN_ENTRY_MONTH_ONE_TARGET =
  JAPAN_ENTRY_FOUNDING_PARTNER_CAPACITY
export const JAPAN_ENTRY_MONTH_ONE_TARGET_DISCLOSURE =
  JAPAN_ENTRY_FOUNDING_PARTNER_CAPACITY_DISCLOSURE
export const JAPAN_ENTRY_MONTH_ONE_TARGET_STAT =
  JAPAN_ENTRY_FOUNDING_PARTNER_CAPACITY_STAT

export const JAPAN_ENTRY_CTA_EN = "Apply for a Japan Partnership — $13K"
export const JAPAN_ENTRY_CTA_JA = "Japan Entryについて問い合わせる"
