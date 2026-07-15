import { describe, expect, it } from "vitest"
import type { DemoReviewedAsset } from "../demo-private-access"
import type { CandidateListItem } from "../lead-candidate-list"
import { buildPortalDemoManifest, readPortalSnapshot } from "./service"

function candidate(status: "ready_for_review" | "has_website" = "ready_for_review"): CandidateListItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    domain: "local-example.no-website.local",
    rootUrl: null,
    lane: "no_website_local_smb",
    sourceSlug: "houzz",
    status: "candidate",
    companyId: null,
    lastSeenAt: "2026-07-14T00:00:00.000Z",
    score: null,
    countries: [],
    technologies: [],
    meta: {
      raw: {
        portal_snapshot: {
          source: "houzz",
          listingUrl: "https://www.houzz.jp/pro/takumi",
          companyName: "匠リフォーム",
          category: "リフォーム会社",
          description: "代表の建築士が2008年に創業し、地域密着で戸建てリフォームと外構工事を手掛けています。",
          address: "東京都千代田区",
          phone: "03-0000-0000",
          prefecture: "東京都",
          websiteUrl: status === "has_website" ? "https://takumi.example.jp" : null,
          socialLinks: [],
          contactUrl: "https://www.houzz.jp/pro/takumi",
          images: [1, 2, 3].map((index) => ({ url: `https://cdn.example.jp/work-${index}.webp`, alt: `施工例${index}` })),
          suggestedIndustry: "construction",
          smbFit: {
            eligible: status === "ready_for_review",
            score: status === "ready_for_review" ? 92 : 55,
            decisionSignals: ["代表者・店主本人", "地域密着"],
            enterpriseSignals: [],
            reasons: ["経営者直結シグナル"],
          },
          fetchedAt: "2026-07-14T00:00:00.000Z",
          status,
        },
      },
    },
  }
}

function assets(): DemoReviewedAsset[] {
  return [1, 2, 3].map((index) => ({
    id: `asset-${index}`,
    kind: "image",
    sourceUrl: `https://cdn.example.jp/work-${index}.webp`,
    ownerLabel: "匠リフォーム",
    sourceAccount: "https://www.houzz.jp/pro/takumi",
    useBasis: "private_proposal",
    officialSource: true,
    peopleVisible: false,
    watermarkVisible: false,
    alt: `施工例${index}`,
  }))
}

describe("portal candidate review manifest", () => {
  it("builds a no-fetch manifest from operator-reviewed portal assets", () => {
    const manifest = buildPortalDemoManifest(candidate(), assets())
    expect(manifest.collectionPolicy).toBe("no_automated_fetch")
    expect(manifest.sources).toEqual([expect.objectContaining({ type: "official_profile_link", fetchPolicy: "never" })])
    expect(manifest.assets).toHaveLength(3)
  })

  it("rejects image URLs that were not captured in the portal snapshot", () => {
    const reviewed = assets()
    reviewed[0] = { ...reviewed[0], sourceUrl: "https://unreviewed.example.jp/image.webp" }
    expect(() => buildPortalDemoManifest(candidate(), reviewed)).toThrow("取得スナップショットにない素材")
  })

  it("rejects candidates that already have an independent website", () => {
    expect(() => buildPortalDemoManifest(candidate("has_website"), assets())).toThrow("独自HP・大企業シグナル")
  })

  it("allows a data-rich, no-website candidate only in the private proposal tier", () => {
    const pending = candidate()
    const raw = pending.meta.raw as Record<string, unknown>
    const snapshot = raw.portal_snapshot as Record<string, unknown>
    snapshot.status = "decision_fit_unverified"
    snapshot.smbFit = {
      eligible: false,
      score: 65,
      decisionSignals: [],
      enterpriseSignals: [],
      reasons: ["代表者確認待ち"],
    }
    const manifest = buildPortalDemoManifest(pending, assets())
    expect(manifest.assets.every((asset) => asset.useBasis === "private_proposal")).toBe(true)
  })

  it("re-evaluates legacy snapshots with the current decision-maker gate", () => {
    const legacy = candidate()
    const raw = legacy.meta.raw as Record<string, unknown>
    const snapshot = raw.portal_snapshot as Record<string, unknown>
    delete snapshot.smbFit
    snapshot.description = "戸建てリフォームと外構工事を提供しています。お気軽にお問い合わせください。"
    expect(readPortalSnapshot(legacy)?.status).toBe("decision_fit_unverified")
  })
})
