import { describe, expect, it } from "vitest"
import { inferPortalIndustry, isAllowedPortalUrl } from "./adapters"
import { extractPortalCandidateFromHtml, normalizePortalOperatorSnapshot } from "./extract"

function profileHtml(overrides: { website?: string; imageCount?: number } = {}): string {
  const imageCount = overrides.imageCount ?? 3
  const images = Array.from({ length: imageCount }, (_, index) => `https://cdn.example.jp/work-${index + 1}.webp`)
  return `<!doctype html><html><head>
    <meta property="og:title" content="匠リフォーム | Houzz">
    <script type="application/ld+json">${JSON.stringify({
      "@type": "ProfessionalService",
      name: "匠リフォーム",
      description: "代表の建築士が東京都で戸建てのリフォームと外構工事を手掛けています。2008年の創業以来、地域密着で丁寧な施工を大切にしています。",
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
    expect(candidate.smbFit).toMatchObject({ eligible: true })
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

  it("excludes enterprise-like portal profiles before review", () => {
    const html = profileHtml().replace(
      "代表の建築士が東京都で戸建てのリフォームと外構工事を手掛けています。2008年の創業以来、地域密着で丁寧な施工を大切にしています。",
      "東証上場企業グループとして全国展開するハウスメーカーです。全国80拠点で対応します。",
    )
    const candidate = extractPortalCandidateFromHtml("houzz", "https://www.houzz.jp/pro/enterprise", html)
    expect(candidate.status).toBe("enterprise_like")
    expect(candidate.smbFit.enterpriseSignals).toContain("上場企業")
  })

  it("holds candidates when an owner-level decision signal is not visible", () => {
    const html = profileHtml().replace(
      "代表の建築士が東京都で戸建てのリフォームと外構工事を手掛けています。2008年の創業以来、地域密着で丁寧な施工を大切にしています。",
      "東京都で戸建てのリフォームと外構工事を提供しています。ご相談ください。",
    )
    const candidate = extractPortalCandidateFromHtml("houzz", "https://www.houzz.jp/pro/unknown", html)
    expect(candidate.status).toBe("decision_fit_unverified")
    expect(candidate.smbFit.eligible).toBe(false)
  })

  it("maps portal-specific text into the existing industry set", () => {
    expect(inferPortalIndustry("ekiten", "地域密着の税理士・会計事務所")).toBe("accounting")
    expect(inferPortalIndustry("jmty", "ハウスクリーニングと片付け")).toBe("cleaning")
  })

  it("normalizes a browser-confirmed snapshot without refetching the portal", () => {
    const candidate = normalizePortalOperatorSnapshot({
      source: "houzz",
      listingUrl: "https://www.houzz.jp/pro/banana-k/",
      companyName: "バナナ工務店",
      category: "工務店・注文住宅・リフォーム",
      description: "代表の大工が2001年に創業。二級建築士の資格を持ち、三浦市で地域に根ざした施工を行っています。",
      address: "神奈川県三浦市三崎町小網代227-10",
      images: [1, 2, 3].map((index) => ({ url: `https://st.hzcdn.com/work-${index}.jpg`, alt: `施工例${index}` })),
    })
    expect(candidate.status).toBe("ready_for_review")
    expect(candidate.images).toHaveLength(3)
    expect(candidate.smbFit.eligible).toBe(true)
  })

  it("preserves an HTTP independent website and excludes the candidate", () => {
    const candidate = normalizePortalOperatorSnapshot({
      source: "ekiten",
      listingUrl: "https://www.ekiten.jp/shop_10795375/",
      companyName: "いちごリフォーム",
      category: "住宅リフォーム",
      description: "代表の二級建築士が相談から施工まで一貫して担当する、地域密着のリフォーム事業者です。",
      address: "岡山県岡山市北区中井町1-5-19",
      websiteUrl: "http://www.ichigo-fudousan.jp",
      images: [1, 2, 3].map((index) => ({ url: `https://image.ekiten.jp/work-${index}.jpg`, alt: `施工例${index}` })),
    })
    expect(candidate.websiteUrl).toBe("http://www.ichigo-fudousan.jp/")
    expect(candidate.status).toBe("has_website")
  })
})
