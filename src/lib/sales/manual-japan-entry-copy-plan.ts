import type { BusinessModel } from "./japan-entry-projection"
import type { ManualMessageAngle } from "./manual-japan-entry-angle"
import type { ManualOutreachPlaybook } from "./manual-japan-entry-playbook"

export const MANUAL_COPY_ARCHITECTURES = [
  "product_audit_decision",
  "use_case_decision_evidence",
  "capability_gap_validation",
  "product_signal_opportunity",
  "evidence_routing_decision",
] as const

export type ManualCopyArchitecture = (typeof MANUAL_COPY_ARCHITECTURES)[number]

export interface ManualCopyPlan {
  architecture: ManualCopyArchitecture
  narrativeInstruction: string
  solutionFocus: string
  countryTone: string
  requiredMoves: string[]
}

export function buildManualQuestionDecisionAnchor(
  playbook: ManualOutreachPlaybook,
  customerPathAnchor: string,
): string {
  const decision = playbook === "premium_hobby_ecommerce"
    ? "purchase-path decision"
    : playbook === "cyber_b2b_infrastructure" || playbook === "web3_blockchain"
      ? "technical-evaluation decision"
      : playbook === "hospitality_saas" || playbook === "marketplace_platform"
        ? "buyer-workflow decision"
        : playbook === "saas_ai_devtools" || playbook === "creator_tools" || playbook === "gaming_tools"
          ? "evaluation-path decision"
          : "customer-path decision"
  return `${customerPathAnchor.trim()} ${decision}`.replace(/\s+/g, " ")
}

function stableHash(value: string): number {
  let hash = 2_166_136_261
  for (const character of value.toLowerCase()) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function solutionFocus(playbook: ManualOutreachPlaybook): string {
  if (playbook === "premium_hobby_ecommerce") return "a bounded test of product explanation and purchase-path readiness"
  if (playbook === "saas_ai_devtools" || playbook === "creator_tools" || playbook === "gaming_tools") return "a bounded test of product evaluation and Japanese positioning"
  if (playbook === "cyber_b2b_infrastructure") return "a bounded test of technical evaluation and procurement readiness"
  if (playbook === "hospitality_saas" || playbook === "marketplace_platform") return "a bounded test of the documented operating workflow"
  if (playbook === "education_membership" || playbook === "research_data_media") return "a bounded test of offer comprehension and purchase readiness"
  if (playbook === "web3_blockchain") return "a bounded test of technical evaluation and trust"
  return "a bounded test of positioning and customer-path readiness"
}

function countryTone(countryCode: string | null): string {
  if (["DE", "CH", "AT", "NL", "SE", "NO", "DK", "FI"].includes(countryCode ?? "")) return "concise, precise, and low-hype"
  if (["FR", "IT", "ES", "PT", "BE"].includes(countryCode ?? "")) return "business-formal, natural, and explanatory without overstatement"
  if (["US", "CA", "AU", "NZ", "GB", "IE"].includes(countryCode ?? "")) return "direct, commercially literate, and low-pressure"
  return "business-formal, clear, and free of nationality-based assumptions"
}

const ARCHITECTURE_INSTRUCTIONS: Record<ManualCopyArchitecture, string> = {
  product_audit_decision: "Start from the product workflow, move to the verified Japan-page observation, then frame the one launch decision the evidence leaves open.",
  use_case_decision_evidence: "Start from the documented capability or use case without assigning it to an unverified Japanese audience, state the product-path decision it raises, then support that decision with the verified page evidence.",
  capability_gap_validation: "Connect one documented capability to one verified customer-path gap, then define the narrow validation needed before a wider Japan launch.",
  product_signal_opportunity: "Start from the strongest product signal, introduce the modeled opportunity only when supplied, then connect it to one audited Japan customer-path decision.",
  evidence_routing_decision: "Lead with a precise product observation, establish the evidence boundary, and finish by routing a company-specific Japan decision brief to its owner.",
}

export function buildManualCopyPlan(input: {
  companyName: string
  countryCode: string | null
  businessModel: BusinessModel
  playbook: ManualOutreachPlaybook
  angle: ManualMessageAngle
  hasModeledOpportunity: boolean
}): ManualCopyPlan {
  const eligible = input.hasModeledOpportunity && input.angle === "opportunity"
    ? MANUAL_COPY_ARCHITECTURES
    : MANUAL_COPY_ARCHITECTURES.filter((architecture) => architecture !== "product_signal_opportunity")
  const index = stableHash([
    input.companyName,
    input.countryCode ?? "unknown",
    input.businessModel,
    input.playbook,
    input.angle,
  ].join(":")) % eligible.length
  const architecture = eligible[index] ?? "product_audit_decision"
  return {
    architecture,
    narrativeInstruction: ARCHITECTURE_INSTRUCTIONS[architecture],
    solutionFocus: solutionFocus(input.playbook),
    countryTone: countryTone(input.countryCode),
    requiredMoves: [
      "one exact company-specific product observation",
      "one verified Japan customer-path signal",
      "one concrete decision or barrier stated without invented causation",
      "one Paradigm analysis focus tailored to that decision",
      "one original permission or owner-routing question",
    ],
  }
}
