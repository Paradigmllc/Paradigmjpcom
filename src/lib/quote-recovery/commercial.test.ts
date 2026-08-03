import { afterEach, describe, expect, it } from "vitest"
import { hashQuoteRecoveryPassword, verifyQuoteRecoveryPassword } from "./auth"
import { quoteRecoveryJsonAllowed, quoteRecoveryMutationAllowed } from "./http"
import { isQuoteRecoveryPlan, priceIdForPlan } from "./plans"
import { quoteRecoveryMemberUpdateSchema, quoteRecoveryQuoteUpdateSchema, quoteRecoverySignupSchema } from "./commercial-schemas"
import { escapeQuoteRecoveryEmailHtml } from "./email"
import { isStandaloneRoute } from "@/components/aesop/standalone-routes"

describe("Quote Recovery commercial security", () => {
  afterEach(() => {
    delete process.env.STRIPE_PRICE_QUOTE_RECOVERY_STARTER
    delete process.env.NEXT_PUBLIC_SITE_URL
  })

  it("hashes passwords with a random salt and verifies them", async () => {
    const first = await hashQuoteRecoveryPassword("CommercialPass123")
    const second = await hashQuoteRecoveryPassword("CommercialPass123")
    expect(first).not.toBe(second)
    await expect(verifyQuoteRecoveryPassword("CommercialPass123", first)).resolves.toBe(true)
    await expect(verifyQuoteRecoveryPassword("WrongPassword123", first)).resolves.toBe(false)
  })

  it("requires strong passwords at signup", () => {
    expect(quoteRecoverySignupSchema.safeParse({ email: "owner@example.com", password: "short", displayName: "Owner", organizationName: "Factory" }).success).toBe(false)
    expect(quoteRecoverySignupSchema.safeParse({ email: "owner@example.com", password: "CommercialPass123", displayName: "Owner", organizationName: "Factory" }).success).toBe(true)
  })

  it("accepts only server-defined commercial plans and Stripe price IDs", () => {
    expect(isQuoteRecoveryPlan("starter")).toBe(true)
    expect(isQuoteRecoveryPlan("enterprise")).toBe(false)
    process.env.STRIPE_PRICE_QUOTE_RECOVERY_STARTER = "price_starter"
    expect(priceIdForPlan("starter")).toBe("price_starter")
  })

  it("rejects cross-origin and non-JSON mutations", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://paradigmjp.com"
    const allowed = new Request("https://paradigmjp.com/api/example", { method: "POST", headers: { Origin: "https://paradigmjp.com", "Content-Type": "application/json" } })
    const crossOrigin = new Request("https://paradigmjp.com/api/example", { method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" } })
    const formPost = new Request("https://paradigmjp.com/api/example", { method: "POST", headers: { Origin: "https://paradigmjp.com", "Content-Type": "application/x-www-form-urlencoded" } })
    expect(quoteRecoveryMutationAllowed(allowed)).toBe(true)
    expect(quoteRecoveryJsonAllowed(allowed)).toBe(true)
    expect(quoteRecoveryMutationAllowed(crossOrigin)).toBe(false)
    expect(quoteRecoveryJsonAllowed(formPost)).toBe(false)
  })

  it("validates quote workflow changes and team roles", () => {
    expect(quoteRecoveryQuoteUpdateSchema.safeParse({ ownerName: "田中", nextActionDate: "2026-08-10", status: "open", activityType: "call", note: "担当者へ連絡" }).success).toBe(true)
    expect(quoteRecoveryQuoteUpdateSchema.safeParse({ ownerName: null, nextActionDate: null, status: "draft" }).success).toBe(false)
    expect(quoteRecoveryMemberUpdateSchema.safeParse({ role: "admin" }).success).toBe(true)
    expect(quoteRecoveryMemberUpdateSchema.safeParse({ role: "owner" }).success).toBe(false)
  })

  it("isolates Quote Recovery routes from the marketing chrome", () => {
    expect(isStandaloneRoute("/ja/quote-recovery")).toBe(true)
    expect(isStandaloneRoute("/ja/quote-recovery/login")).toBe(true)
    expect(isStandaloneRoute("/ja/services")).toBe(false)
  })

  it("escapes invitation email content", () => {
    expect(escapeQuoteRecoveryEmailHtml(`<script>alert("x")</script>&'`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;")
  })
})
