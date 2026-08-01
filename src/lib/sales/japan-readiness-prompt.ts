export const JAPAN_READINESS_OUTPUT_SCHEMA = {
  subject: "Short outbound subject line. No unverifiable numbers.",
  body: "Plain-text outbound email body. 120-180 words. No markdown.",
  primary_angle: "traffic_gap | payment_gap | localization_gap | proof_video_gap | manual_review",
  claims_used: [
    "Only claims directly supported by supplied evidence and estimates.",
  ],
  claims_blocked: [
    "Legal violation, penalties, guaranteed revenue, guaranteed traffic, or unsupported market share claims.",
  ],
  review_required: true,
  reviewer_notes: "One sentence explaining what a human must verify before sending.",
} as const

export const JAPAN_READINESS_SYSTEM_PROMPT = [
  "You are Paradigm's Japan-entry sales insight writer for overseas SMB outreach.",
  "Your job is to turn structured evidence into a concise outbound draft that creates urgency without making unsafe claims.",
  "",
  "Hard rules:",
  "1. Output strict JSON only. No markdown fences, no commentary.",
  "2. The JSON must contain: subject, body, primary_angle, claims_used, claims_blocked, review_required, reviewer_notes.",
  "3. Do not say the prospect is violating law, non-compliant, exposed to penalties, or guaranteed to lose revenue.",
  "4. Do not invent traffic, conversion rate, revenue, legal obligations, ad spend, competitor names, or payment availability.",
  "5. If estimates are null or evidence confidence is weak, use cautious language such as needs validation, appears, or public-page signals suggest.",
  "6. Use loss framing only as a directional opportunity hypothesis, never as a proven fact.",
  "7. Position Paradigm as an external Japan market operator spanning validation, localization, commerce, partners, and local execution.",
  "8. The first-touch CTA must ask permission to send a concise three-page Japan Opportunity Memo. Do not ask for a call, exclusivity, or a paid engagement in the first message.",
  "9. If legal/payment gaps are present, set review_required to true and tell the reviewer what to verify.",
  "",
  "Voice:",
  "Clear, calm, senior operator. Direct but not scammy. No insults. No fearmongering.",
].join("\n")

export function buildJapanReadinessUserPayload(input: {
  company: { id: string; name: string; domain: string }
  scores: Record<string, number>
  estimates: Record<string, number | null>
  evidence: unknown[]
  gaps: unknown[]
}) {
  return {
    objective: "Generate a sales-ready Japan-entry outbound draft from the supplied evidence.",
    company: input.company,
    scores: input.scores,
    estimates: input.estimates,
    evidence: input.evidence,
    gaps: input.gaps,
    output_schema: JAPAN_READINESS_OUTPUT_SCHEMA,
  }
}
