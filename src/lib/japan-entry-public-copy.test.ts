import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import messages from "../../messages/en.json"
import jaMessages from "../../messages/ja.json"
import {
  JAPAN_ENTRY_MONTH_ONE_TARGET,
  JAPAN_ENTRY_MONTH_ONE_TARGET_DISCLOSURE,
  JAPAN_ENTRY_MONTH_ONE_TARGET_STAT,
} from "./japan-entry-public-copy"

function collectStrings(value: unknown, path = "en"): Array<{ path: string; value: string }> {
  if (typeof value === "string") return [{ path, value }]
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectStrings(item, `${path}[${index}]`))
  }
  if (!value || typeof value !== "object") return []
  return Object.entries(value).flatMap(([key, item]) => collectStrings(item, `${path}.${key}`))
}

describe("public English Japan Entry copy", () => {
  const strings = collectStrings(messages)

  it("does not advertise the retired free or low-price offers", () => {
    const retiredOffer = /free (?:consult|audit|diagnosis|intro)|\$(?:1,500|2,000|3,000|5,000|8,000)|purchasing power parity|ppp-adjusted|¥(?:19,800|29,800|49,800|79,800|198,000|300,000|500,000|800,000)/i
    const violations = strings.filter(({ value }) => retiredOffer.test(value))

    expect(violations).toEqual([])
  })

  it("keeps the fixed commercial terms consistent", () => {
    expect(messages.pricingPage.fixedPlanName).toBe("Japan Entry Package")
    expect(messages.pricingPage.heroDesc).toContain("$12,000")
    expect(messages.pricingPage.heroDesc).toContain("$995/month")
    expect(messages.homeEn.hero.ctaPrimary).toBe("Apply for Japan Entry — $12K")
    expect(messages.cta.primary).toBe("Apply — $12K")
    expect(messages.lpWeb.plans.map((plan) => plan.name)).toEqual([
      "Japan Entry setup",
      "Months 1–6",
      "Month 7 onward",
    ])
    expect(messages.videoPage.plans).toHaveLength(1)
    expect(messages.videoPage.plans[0].name).toBe("Japan Entry Package")
    expect(JSON.stringify(messages)).not.toMatch(
      /cancel anytime|\bcancellable\b|our pro plan/i,
    )
  })

  it("keeps the legacy homeEn catalog identical across en and ja bundles", () => {
    expect(jaMessages.homeEn).toEqual(messages.homeEn)

    const copy = JSON.stringify(jaMessages.homeEn)
    for (const term of [
      "$12,000",
      "$0/month",
      "$995/month",
      "signed terms",
      "Month-one target: 20 qualified launches",
      "not a customer outcome guarantee",
    ]) {
      expect(copy).toContain(term)
    }
    expect(copy).not.toMatch(
      /\$(?:1,500|3,000|5,000|8,000)|Market Fit Report|cancel anytime/i,
    )
  })

  it("defines the 20-launch figure as one shared internal operating target", () => {
    expect(JAPAN_ENTRY_MONTH_ONE_TARGET).toBe(
      "Month-one target: 20 qualified launches",
    )
    expect(JAPAN_ENTRY_MONTH_ONE_TARGET_STAT.label).toBe(
      JAPAN_ENTRY_MONTH_ONE_TARGET,
    )
    expect(JAPAN_ENTRY_MONTH_ONE_TARGET_DISCLOSURE).toContain(
      "internal operating target",
    )
    expect(JAPAN_ENTRY_MONTH_ONE_TARGET_DISCLOSURE).toContain(
      "not a customer outcome guarantee",
    )

    const sources = [
      readFileSync(join(process.cwd(), "src/app/[locale]/page.tsx"), "utf8"),
      readFileSync(
        join(process.cwd(), "src/app/api/admin/seed-all-content/seed-data.ts"),
        "utf8",
      ),
    ]
    for (const source of sources) {
      expect(source).toContain("JAPAN_ENTRY_MONTH_ONE_TARGET_STAT")
      expect(source).toContain("JAPAN_ENTRY_MONTH_ONE_TARGET_DISCLOSURE")
      expect(source).not.toContain("qualified-launch target")
      expect(source).not.toContain("initial cohort of 20")
    }
  })

  it("contains no other public dollar price", () => {
    const priceToken = /\$(?:\d{1,3}(?:,\d{3})+|\d+)(?:K)?/g
    const prices = new Set(strings.flatMap(({ value }) => value.match(priceToken) ?? []))

    expect([...prices].sort()).toEqual(["$0", "$12,000", "$12K", "$995"])
  })

  it("contains no accidental Japanese copy outside the locale-switch label", () => {
    const japaneseScript = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u
    const violations = strings.filter(({ value }) => value !== "日本語" && japaneseScript.test(value))

    expect(violations).toEqual([])
  })

  it("ships complete FAQ questions and answers", () => {
    expect(messages.faqPage.items.length).toBeGreaterThanOrEqual(8)
    for (const item of messages.faqPage.items) {
      expect(item.q.trim()).not.toBe("")
      expect(item.a.trim()).not.toBe("")
    }
  })

  it("discloses the application data path in the privacy copy", () => {
    const privacy = JSON.stringify(messages.privacyPage).toLowerCase()
    for (const term of ["supabase", "slack", "ip address", "utm", "referrer", "retention", "rights"]) {
      expect(privacy).toContain(term)
    }
  })

  it("provides a concrete pre-application route for seller-detail disclosure", () => {
    const legal = JSON.stringify(messages.legalPage)

    expect(legal).toContain("before application")
    expect(legal).toContain("info@paradigmjp.com")
    expect(legal).not.toContain("Available before contract on request")
  })
})
