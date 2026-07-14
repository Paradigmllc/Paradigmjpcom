import { describe, expect, it } from "vitest"
import { decideFormQualification, isEnterpriseLikeStack, isNonContactFormUrl } from "./lead-factory-qualification"
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

  it("rejects generic forms embedded on legal and policy pages", () => {
    const legalForm = discovery({
      formUrl: "https://example.com/policies/legal-notice",
      method: "regex",
      verification: "form",
      confidence: 88,
    })

    expect(isNonContactFormUrl(legalForm.formUrl ?? "")).toBe(true)
    expect(decideFormQualification(legalForm, 80)).toEqual({ qualified: false, reason: "no_form" })
    expect(isNonContactFormUrl("https://example.com/pages/contact-us")).toBe(false)
  })

  it("blocks obvious enterprise platform stacks from the SMB lane", () => {
    expect(isEnterpriseLikeStack([{ name: "Adobe Experience Manager", category: "CMS", confidence: 95 }])).toBe(true)
    expect(isEnterpriseLikeStack([{ name: "Shopify", category: "Ecommerce", confidence: 95 }])).toBe(false)
  })
})
