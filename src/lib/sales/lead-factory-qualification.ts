import type { FormDiscoveryResult } from "./sources/form-discovery"
import type { TechItem } from "./sources/wappalyzer"

export interface FormQualificationDecision {
  qualified: boolean
  reason: "verified_form" | "no_form" | "contact_page_only" | "low_confidence"
}

const ENTERPRISE_PLATFORM_RE = /adobe experience manager|sitecore|sap commerce|salesforce commerce cloud|oracle commerce|hybris|workday/i

export function isEnterpriseLikeStack(detections: TechItem[]): boolean {
  return detections.length >= 15 || detections.some((item) => ENTERPRISE_PLATFORM_RE.test(item.name))
}

export function decideFormQualification(
  discovery: FormDiscoveryResult,
  minConfidence: number,
): FormQualificationDecision {
  if (!discovery.formUrl || discovery.verification === "none" || discovery.verification === "fallback") {
    return { qualified: false, reason: "no_form" }
  }
  if (discovery.verification !== "form") {
    return { qualified: false, reason: "contact_page_only" }
  }
  if (discovery.confidence < minConfidence) {
    return { qualified: false, reason: "low_confidence" }
  }
  return { qualified: true, reason: "verified_form" }
}
