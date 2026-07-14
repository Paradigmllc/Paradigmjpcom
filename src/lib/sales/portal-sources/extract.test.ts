import { describe, expect, it } from "vitest"
import { inferPortalIndustry, isAllowedPortalUrl } from "./adapters"
import { extractPortalCandidateFromHtml } from "./extract"

function profileHtml(overrides: { website?: string; imageCount?: number } = {}): string {
  const imageCount = overrides.imageCount ?? 3
  const images = Array.from({ length: imageCount }, (_, index) => `https://cdn.example.jp/work-${index + 1}.webp`)
  return `<!doctype html><html><head>
    <meta property="og:title" content="匠リフォーム | Houzz">
    <script type="application/ld+json">${JSON.stringify({
      "@type": "ProfessionalService",
      name: "匠リフォーム",
      description: "東京都で戸建てのリフォームと外構工事を手掛けています。&quot;丁寧な施工&quot;を大切にしています。",
      category: "リフォーム会社",
      telephone: "03-0000-0000",
      address: { postalCode: "100-0001", addressRegion: "東京都", addressLocality: "千代田区", streetAddress: "千代田1-1" },
      image: images,
      url: overrides.website ?? "https://www.houzz.jp/pro/takumi",
      sameAs: ["https://www.instagram.com/takumi/"],
    })}</script>
  </head><body>${images.map((src) => `<img src="${src}" alt="施工例">`).join("")}</body></html>`
}

describe("portal profile extraction", () => {
  it("accepts only HTTPS pages on the selected portal host", () => {
    expect(isAllowedPortalUrl("houzz", "https://www.houzz.jp/pro/takumi")).toBe(true)
    expect(isAllowedPortalUrl("houzz", "https://houzz.jp.evil.example/pro/takumi")).toBe(false)
    expect(isAllowedPortalUrl("houzz", "http://www.houzz.jp/pro/takumi")).toBe(false)
  })

  it("extracts a reviewable no-website candidate and keeps encoded quotes valid", () => {
    const candidate = extractPortalCandidateFromHtml("houzz", "https://www.houzz.jp/pro/takumi", profileHtml())
    expect(candidate).toMatchObject({
      companyName: "匠リフォーム",
      prefecture: "東京都",
      websiteUrl: null,
      suggestedIndustry: "construction",
      status: "ready_for_review",
    })
    expect(candidate.description).toContain("丁寧な施工")
    expect(candidate.images).toHaveLength(3)
    expect(candidate.socialLinks).toEqual(["https://www.instagram.com/takumi/"])
  })

  it("excludes profiles that link to an independent website", () => {
    const candidate = extractPortalCandidateFromHtml("houzz", "https://www.houzz.jp/pro/takumi", profileHtml({ website: "https://takumi.example.jp/" }))
    expect(candidate.websiteUrl).toBe("https://takumi.example.jp/")
    expect(candidate.status).toBe("has_website")
  })

  it("fails closed when content has fewer than three usable images", () => {
    const candidate = extractPortalCandidateFromHtml("houzz", "https://www.houzz.jp/pro/takumi", profileHtml({ imageCount: 2 }))
    expect(candidate.status).toBe("insufficient_content")
  })

  it("maps portal-specific text into the existing industry set", () => {
    expect(inferPortalIndustry("ekiten", "地域密着の税理士・会計事務所")).toBe("accounting")
    expect(inferPortalIndustry("jmty", "ハウスクリーニングと片付け")).toBe("cleaning")
  })
})
