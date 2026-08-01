import { describe, expect, it } from "vitest"
import type { CandidateListItem } from "@/lib/sales/lead-candidate-list"
import { portalCandidateTwentyPayload } from "./twenty-sync"
import type { PortalCandidateExtraction } from "./types"

const snapshot: PortalCandidateExtraction = {
  source: "ekiten",
  listingUrl: "https://www.ekiten.jp/shop_123456/",
  companyName: "テスト美容室",
  category: "美容室・ヘアサロン",
  description: "地域密着で予約制の施術を行う小規模サロンです。",
  address: "東京都世田谷区1-2-3",
  phone: "03-0000-0000",
  prefecture: "東京都",
  websiteUrl: null,
  socialLinks: [],
  contactUrl: "https://www.ekiten.jp/shop_123456/",
  images: [
    { url: "https://image.example.jp/1.jpg", alt: "店内" },
    { url: "https://image.example.jp/2.jpg", alt: "施術" },
    { url: "https://image.example.jp/3.jpg", alt: "外観" },
  ],
  suggestedIndustry: "beauty_salon",
  smbFit: { eligible: true, score: 100, decisionSignals: ["地域密着"], enterpriseSignals: [], reasons: ["小規模運営"] },
  fetchedAt: "2026-07-15T00:00:00.000Z",
  status: "ready_for_review",
}

const candidate: CandidateListItem = {
  id: "11111111-1111-4111-8111-111111111111",
  domain: "local-test.no-website.local",
  rootUrl: null,
  lane: "no_website_local_smb",
  sourceSlug: "ekiten",
  status: "scored",
  companyId: null,
  lastSeenAt: "2026-07-15T00:00:00.000Z",
  meta: {},
  score: {
    stackFitScore: 0,
    smbScore: 100,
    freshnessScore: 80,
    geoConfidence: 100,
    contactabilityScore: 90,
    websiteAbsenceScore: 100,
    opportunityScore: 92,
    falsePositiveRisk: 0,
    details: {},
  },
  countries: [],
  technologies: [],
}

describe("portalCandidateTwentyPayload", () => {
  it("keeps a portal candidate list-only, linked to the source page, and unsent", () => {
    const payload = portalCandidateTwentyPayload(candidate, snapshot)
    expect(payload).toMatchObject({
      name: "テスト美容室",
      paradigmCountryName: "日本",
      paradigmSourceName: "ekiten",
      paradigmLeadStatus: "候補登録 / 要確認 / 未送信",
      paradigmDemoUrl: { primaryLinkUrl: "" },
      paradigmReportUrl: { primaryLinkUrl: "" },
      paradigmSalesMaterialUrl: { primaryLinkUrl: "" },
    })
    expect(payload.paradigmFormUrl).toEqual({ primaryLinkLabel: "", primaryLinkUrl: "" })
    expect(payload.paradigmOutreachTargetUrl).toEqual({ primaryLinkLabel: "営業先（ポータル掲載ページ）", primaryLinkUrl: snapshot.listingUrl })
    expect((payload.paradigmKarteSummary as { markdown: string }).markdown).toContain(snapshot.listingUrl)
  })
})
