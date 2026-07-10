export type ConsentDecision = "accept" | "decline"
export type StoredConsent = {
  decision: ConsentDecision
  decidedAt: string
}

export const CONSENT_STORAGE_KEY = "paradigm:cookie-consent"
export const CONSENT_CHANGED_EVENT = "paradigm:consent-changed"
export const CONSENT_SETTINGS_EVENT = "paradigm:consent-settings"
export const CONSENT_REASK_AFTER_DAYS = 365

export function parseStoredConsent(raw: string | null): StoredConsent | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== "object") return null
    const candidate = value as Partial<StoredConsent>
    if (
      (candidate.decision !== "accept" && candidate.decision !== "decline") ||
      typeof candidate.decidedAt !== "string"
    ) {
      return null
    }
    return {
      decision: candidate.decision,
      decidedAt: candidate.decidedAt,
    }
  } catch (error) {
    console.warn("[cookie-consent] Invalid stored consent:", error)
    return null
  }
}

export function isConsentStillValid(
  stored: StoredConsent,
  nowMs = Date.now(),
) {
  const decidedAt = new Date(stored.decidedAt).getTime()
  if (Number.isNaN(decidedAt) || decidedAt > nowMs) return false
  const maxAgeMs = CONSENT_REASK_AFTER_DAYS * 24 * 60 * 60 * 1000
  return nowMs - decidedAt < maxAgeMs
}

export function hasAnalyticsConsent(
  stored: StoredConsent | null,
  nowMs = Date.now(),
) {
  return Boolean(
    stored?.decision === "accept" && isConsentStillValid(stored, nowMs),
  )
}

export function readStoredConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null
  try {
    return parseStoredConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY))
  } catch (error) {
    console.warn("[cookie-consent] Failed to read stored consent:", error)
    return null
  }
}
