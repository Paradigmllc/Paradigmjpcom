import { describe, expect, it } from "vitest"
import { decideFormQualification, isEnterpriseLikeStack, isNonContactFormUrl } from "./lead-factory-qualification"
import type { FormDiscoveryResult } from "./sources/form-discovery"

function discovery(patch: Partial<FormDiscoveryResult>): FormDiscoveryResult {
  return {
    formUrl: null,
    method: "none",
    verification: "none",
    confidence: 0,
    inspection: null,
    candidates: [],
    traceMs: 1,
    ...patch,
  }
}

describe("decideFormQualification", () => {
  const verifiedInspection = { status: "form" as const, reason: "verified_contact_fields" as const, fields: ["name", "email", "message", "submit"] as Array<"name" | "email" | "message" | "submit">, formCount: 1, action: "https://example.com/contact", sameOrigin: true, trustedProvider: false }

  it("accepts only a verified form at or above the configured confidence", () => {
    expect(decideFormQualification(discovery({ formUrl: "https://example.com/contact", method: "dom", verification: "form", confidence: 94, inspection: verifiedInspection }), 80)).toEqual({ qualified: true, reason: "verified_form" })
  })

  it("rejects a contact page without a form", () => {
    expect(decideFormQualification(discovery({ formUrl: "https://example.com/contact", method: "dom", verification: "page", confidence: 72, inspection: { ...verifiedInspection, status: "page", reason: "contact_page_only", fields: [] } }), 70)).toEqual({ qualified: false, reason: "contact_page_only" })
  })

  it("rejects low-confidence form discoveries", () => {
    expect(decideFormQualification(discovery({ formUrl: "https://example.com/contact", method: "spa", verification: "form", confidence: 75, inspection: verifiedInspection }), 80)).toEqual({ qualified: false, reason: "low_confidence" })
  })

  it("rejects generic forms embedded on legal and policy pages", () => {
    const legalForm = discovery({
      formUrl: "https://example.com/policies/legal-notice",
      method: "dom",
      verification: "form",
      confidence: 88,
      inspection: verifiedInspection,
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
