import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  update: vi.fn(),
  collect: vi.fn(),
}))

vi.mock("./manual-japan-entry-store", () => ({
  findManualWorkById: mocks.find,
  updateManualWork: mocks.update,
}))
vi.mock("./manual-work-editorial-brief", () => ({ collectManualEditorialBrief: mocks.collect }))

import { processManualEditorialMessage } from "./manual-work-editorial-service"

function existing(): ManualJapanEntryWorkRow {
  return {
    id: "106db008-80af-4c56-93ee-916643d84c1b",
    domain: "airvida.example",
    canonical_url: "https://airvida.example/",
    company_name: "Airvida",
    country_code: null,
    is_japanese_company: false,
    business_model: "service",
    industry: "Other",
    product_context: "Wearable air purifier",
    profile: { observedFacts: ["Wearable air purifier"] },
    evidence: { productNames: [] },
    attempts: 1,
    manually_sent_at: null,
    reply_received_at: null,
    founder_forwarded_at: null,
    meeting_converted_at: null,
    outreach_playbook: "general_online_smb",
  } as unknown as ManualJapanEntryWorkRow
}

beforeEach(() => {
  vi.clearAllMocks()
  let current = existing()
  mocks.find.mockResolvedValue(current)
  mocks.update.mockImplementation(async (_id: string, patch: Record<string, unknown>) => {
    current = { ...current, ...patch } as ManualJapanEntryWorkRow
    return current
  })
  mocks.collect.mockResolvedValue({
    domain: "airvida.example",
    companyName: "ible Technology Inc.",
    countryCode: "TW",
    countryConfidence: 95,
    countrySignals: ["based in Taiwan"],
    businessModel: "ecommerce",
    productNames: ["Airvida L1", "Airvida M1"],
    productContext: "Airvida is ible's wearable air purifier series.",
    pages: [
      { url: "https://airvida.example/", kind: "home", title: "Airvida", description: "Wearable air purifier", headings: ["Airvida"], snippets: ["Wearable air purifier"], hasContactForm: false },
      { url: "https://airvida.example/en/about", kind: "about", title: "About ible", description: null, headings: ["Business Contact"], snippets: ["ible is an IoT and wearable device company."], hasContactForm: true },
      { url: "https://airvida.example/en/where-to-buy-jp", kind: "pricing", title: "Japan stores", description: null, headings: ["Store"], snippets: ["EDION and Loft stores in Japan"], hasContactForm: false },
    ],
    evidence: [
      { id: "e01", pageKind: "home", statement: "Wearable air purifier", sourceUrl: "https://airvida.example/" },
      { id: "e02", pageKind: "about", statement: "ible is an IoT and wearable device company.", sourceUrl: "https://airvida.example/en/about" },
      { id: "e03", pageKind: "pricing", statement: "EDION and Loft stores in Japan", sourceUrl: "https://airvida.example/en/where-to-buy-jp" },
    ],
    contactUrl: "https://airvida.example/en/about",
    publicEmail: null,
    contactFormDetected: true,
    contactSignals: ["Business inquiry form detected"],
    japanPresence: {
      existing: true,
      level: "sales",
      signals: ["Japan sales link: Japan / 日 本"],
      urls: ["https://airvida.example/en/where-to-buy-jp/"],
    },
    audit: {
      engine: "local_heuristic",
      generated_at: "2026-07-29T00:00:00.000Z",
      score: 70,
      status: {
        tokushoho_missing: true,
        appi_missing: true,
        local_payments_missing: true,
        japanese_language_missing: false,
        jpy_currency_missing: true,
        japan_shipping_missing: true,
      },
      signals: { tokushoho: [], appi: [], local_payments: [], japanese_language: ["日本語"], jpy_currency: [], japan_shipping: [] },
      presence: { existing: true, level: "sales", signals: ["Japan sales link"], urls: ["https://airvida.example/en/where-to-buy-jp/"] },
      pages_checked: ["https://airvida.example/"],
      sales_pitch_context: "Existing Japan sales path",
      human_review_required: true,
      legal_disclaimer: "Not legal advice",
    },
    collectedAt: "2026-07-29T00:00:00.000Z",
  })
})

describe("manual editorial brief preparation", () => {
  it("updates stale company fields and excludes an existing Japan business from outbound", async () => {
    const result = await processManualEditorialMessage({
      rawUrl: "https://airvida.example/",
      expectedWorkId: "106db008-80af-4c56-93ee-916643d84c1b",
    })

    expect(result.item).toMatchObject({
      company_name: "ible Technology Inc.",
      country_code: "TW",
      business_model: "ecommerce",
      japan_entry_fit_status: "rejected",
      japan_entry_fit_confidence: 0,
      status: "rejected",
      form_url: "https://airvida.example/en/about",
    })
    expect(result.item.evidence).toMatchObject({
      analysis_mode: "existing_japan_presence",
      structuredSummary: {
        productNames: ["Airvida L1", "Airvida M1"],
        contactFormDetected: true,
        japanPresence: { existing: true, level: "sales" },
      },
    })
    expect(result.item.message_review).toMatchObject({
      generation_status: "existing_japan_presence",
      api_used: false,
    })
  })
})
