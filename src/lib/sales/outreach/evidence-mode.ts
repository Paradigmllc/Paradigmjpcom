/**
 * Controls whether outbound copy may use paid traffic estimates.
 *
 * The default is the free/public-signals mode. It deliberately does not
 * fabricate visits or revenue when a paid provider is not configured.
 */
export type OutreachEvidenceMode = "public-signals" | "paid-traffic"

export function getOutreachEvidenceMode(): OutreachEvidenceMode {
  const configured = process.env.OUTREACH_EVIDENCE_MODE?.trim().toLowerCase()
  return configured === "paid-traffic" ? "paid-traffic" : "public-signals"
}

export function requiresVerifiedOutreachMetrics(): boolean {
  return getOutreachEvidenceMode() === "paid-traffic"
}
