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

  it("publishes an accountable operator message and inspectable trust surfaces", () => {
    expect(messages.aboutPage.representativeMessage.length).toBeGreaterThan(300)
    expect(messages.aboutPage.representativePrinciples).toHaveLength(3)
    expect(messages.home.trustPanel.cards).toHaveLength(4)
    expect(messages.home.journey.steps.map((step) => step.title)).toEqual([
      "Contact",
      "Materials & fit call",
      "Application & scope",
      "Setup & launch",
      "Operate & scale",
    ])
    expect(messages.home.journey.note).toContain("does not create a contract")
    expect(messages.home.journey.workspace.title).toContain("work")
    expect(messages.home.journey.workspace.description).toContain("Notion")
    expect(messages.home.journey.workspace.slaBody).toContain("48 business hours")
    expect(messages.faqPage.items.some((item) => /workspace|Notion|Trello/i.test(`${item.q} ${item.a}`))).toBe(true)
    expect(jaMessages.aboutPage.representativeMessage.length).toBeGreaterThan(200)
    expect(jaMessages.home.trustPanel.cards).toHaveLength(4)
  })

  it("states Paradigm's Japan-based professional domain across public English surfaces", () => {
    const professionalDomain = /Japan-based .*partner|Japan-based .*professional/i
    const supportedSectors = /e-commerce, SaaS, and Web3\.0/i
    const seed = readFileSync(
      join(process.cwd(), "src/app/api/admin/seed-all-content/seed-data.ts"),
      "utf8",
    )
    const homepageBlocks = readFileSync(
      join(process.cwd(), "src/app/api/admin/seed-all-content/homepage-en-blocks.ts"),
      "utf8",
    )

    expect(messages.aboutPage.heroDesc).toMatch(supportedSectors)
    expect(messages.aboutPage.missionDesc).toMatch(professionalDomain)
    expect(messages.home.heroSubheadline).toMatch(supportedSectors)
    expect(messages.footer.companyTagline).toMatch(professionalDomain)
    expect(messages.worksPage.professionalUseCases).toHaveLength(3)
    expect(messages.worksPage.professionalUseCases.map((item) => item.sector)).toEqual([
      "E-COMMERCE",
      "SAAS",
      "WEB3.0",
    ])
    expect(JSON.stringify(messages)).not.toContain("SNS")
    expect(seed).toMatch(supportedSectors)
    expect(homepageBlocks).toMatch(/WHO WE ARE/)
  })

  it("adds human context without presenting stock imagery as proof", () => {
    expect(messages.home.visualContext.slides).toHaveLength(3)
    expect(jaMessages.home.visualContext.slides).toHaveLength(3)
    expect(messages.home.visualContext.disclosure).toMatch(/stock imagery/i)
    expect(messages.home.visualContext.desc).toMatch(/not client case studies/i)
    expect(jaMessages.home.visualContext.disclosure).toContain("ストック素材")
    for (const slide of messages.home.visualContext.slides) {
      expect(slide.alt.trim()).not.toBe("")
      expect(slide.body.trim()).not.toBe("")
    }
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

  it("publishes the supported payment rails and delivery refund condition", () => {
    const english = JSON.stringify(messages)
    const japanese = JSON.stringify(jaMessages)
    for (const term of ["Wise", "USDC", "Stripe invoice", "14 business days", "100% of the USD 12,000 setup fee is refunded"]) {
      expect(english).toContain(term)
    }
    for (const term of ["Wise", "USDC", "Stripe請求書", "14営業日", "12,000ドルを全額返金"]) {
      expect(japanese).toContain(term)
    }
  })

  it("ships separate locale-specific contract and refund documents", () => {
    expect(messages.termsPage.metaTitle).toBe("Terms of Service | Japan Entry Package")
    expect(messages.termsPage.sections.length).toBeGreaterThanOrEqual(8)
    expect(JSON.stringify(messages.termsPage)).toContain("USD 12,000")
    expect(JSON.stringify(messages.refundPage)).toContain("14 business days")
    expect(jaMessages.termsPage.metaTitle).toBe("利用規約")
    expect(jaMessages.refundPage.metaTitle).toBe("返金・キャンセルポリシー")
    expect(JSON.stringify(jaMessages.termsPage)).not.toContain("Japan Entry")
    expect(JSON.stringify(jaMessages.refundPage)).not.toContain("$12,000")
  })
})
