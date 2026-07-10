import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  enrichFromContact: vi.fn(),
  notifyBothChannels: vi.fn(),
}))

vi.mock("@/lib/notify", () => ({
  notifyBothChannels: mocks.notifyBothChannels,
}))
vi.mock("@/lib/sales/enrich", () => ({
  enrichFromContact: mocks.enrichFromContact,
}))

import { startContactEnrichment } from "./contact-enrichment"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.enrichFromContact.mockResolvedValue({
    ok: true,
    company: {
      company_name: "Acme Software",
      domain: "example.com",
      industry: "SaaS",
      pagespeed_mobile: 80,
      detected_issues: ["no_japanese_content"],
      slug: "acme-software",
      report_url: "https://paradigmjp.com/en/report/acme-software",
      report_locale: "en",
      region: "global",
    },
  })
  mocks.notifyBothChannels.mockResolvedValue({
    ok: true,
    slack: { ok: true },
    database: { ok: true },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("startContactEnrichment", () => {
  test("sends enrichment through the shared DB-bell and Slack path", async () => {
    const leadId = "11111111-1111-4111-8111-111111111111"
    startContactEnrichment({
      leadId,
      email: "founder@example.com",
      company: "Acme Software",
      message: "Launch in Japan",
      services: ["Japan Entry Package"],
      reportLocale: "en",
      targetCountry: "AU",
    })

    await vi.waitFor(() => {
      expect(mocks.notifyBothChannels).toHaveBeenCalledWith(
        expect.stringContaining(`lead ${leadId}`),
        expect.objectContaining({
          type: "contact_enrichment_complete",
          leadId,
          clientMessageId: leadId,
          blocks: expect.any(Array),
        }),
      )
    })
  })

  test("neutralizes Slack markup from enrichment fields and ignores stored external report URLs", async () => {
    mocks.enrichFromContact.mockResolvedValue({
      ok: true,
      company: {
        company_name: "<@U123> *Acme*",
        domain: "example.com\n<!channel>",
        industry: "_SaaS_",
        pagespeed_mobile: 80,
        detected_issues: ["`payload`", "<https://evil.example|click>"],
        slug: "safe-report",
        report_url: "https://evil.example/phish",
        report_locale: "en",
        region: "global",
      },
    })

    startContactEnrichment({
      leadId: "22222222-2222-4222-8222-222222222222",
      email: "founder@example.com",
      company: "Acme",
      message: "Launch in Japan",
      services: ["Japan Entry Package"],
      reportLocale: "en",
      targetCountry: "US",
    })

    await vi.waitFor(() => expect(mocks.notifyBothChannels).toHaveBeenCalled())
    const [text, options] = mocks.notifyBothChannels.mock.calls.at(-1) ?? []
    expect(text).not.toContain("<@U123>")
    expect(text).not.toContain("<!channel>")
    expect(text).not.toContain("*Acme*")
    expect(JSON.stringify(options?.blocks)).not.toContain("evil.example/phish")
    expect(JSON.stringify(options?.blocks)).toContain(
      "paradigmjp.com/en/report/safe-report",
    )
  })

  test("does not write a personal email address to production logs", async () => {
    mocks.enrichFromContact.mockResolvedValue({
      ok: false,
      skipped: "personal_domain",
    })
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const leadId = "33333333-3333-4333-8333-333333333333"

    startContactEnrichment({
      leadId,
      email: "private.person@gmail.com",
      company: null,
      message: "Hello",
      services: [],
      reportLocale: "en",
      targetCountry: "US",
    })

    await vi.waitFor(() => expect(warn).toHaveBeenCalled())
    expect(warn.mock.calls.flat().join(" ")).toContain(leadId)
    expect(warn.mock.calls.flat().join(" ")).not.toContain(
      "private.person@gmail.com",
    )
  })
})
