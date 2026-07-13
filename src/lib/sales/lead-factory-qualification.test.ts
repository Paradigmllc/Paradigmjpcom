import { describe, expect, it } from "vitest"
import { decideFormQualification, isEnterpriseLikeStack } from "./lead-factory-qualification"
import type { FormDiscoveryResult } from "./sources/form-discovery"

function discovery(patch: Partial<FormDiscoveryResult>): FormDiscoveryResult {
  return {
    formUrl: null,
    method: "none",
    verification: "none",
    confidence: 0,
    candidates: [],
    traceMs: 1,
    ...patch,
  }
}

describe("decideFormQualification", () => {
  it("accepts only a verified form at or above the configured confidence", () => {
    expect(decideFormQualification(discovery({ formUrl: "https://example.com/contact", method: "regex", verification: "form", confidence: 88 }), 80)).toEqual({ qualified: true, reason: "verified_form" })
  })

  it("rejects a contact page without a form", () => {
    expect(decideFormQualification(discovery({ formUrl: "https://example.com/contact", method: "regex", verification: "page", confidence: 72 }), 70)).toEqual({ qualified: false, reason: "contact_page_only" })
  })

  it("rejects low-confidence form discoveries", () => {
    expect(decideFormQualification(discovery({ formUrl: "https://example.com/contact", method: "spa", verification: "form", confidence: 75 }), 80)).toEqual({ qualified: false, reason: "low_confidence" })
  })

  it("blocks obvious enterprise platform stacks from the SMB lane", () => {
    expect(isEnterpriseLikeStack([{ name: "Adobe Experience Manager", category: "CMS", confidence: 95 }])).toBe(true)
    expect(isEnterpriseLikeStack([{ name: "Shopify", category: "Ecommerce", confidence: 95 }])).toBe(false)
  })
})
