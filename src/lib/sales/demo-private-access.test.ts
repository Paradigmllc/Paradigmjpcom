import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: vi.fn() }))

import {
  generateDemoPreviewToken,
  activateSignedPrivateDemo,
  hashDemoPreviewToken,
  normalizeDemoRouteSlug,
  previewCookieName,
  validateDemoAssets,
  validatePublicDemoAssets,
  type DemoReviewedAsset,
} from "./demo-private-access"

const safeAsset: DemoReviewedAsset = {
  id: "asset-1",
  kind: "image",
  sourceUrl: "https://example.com/official/photo.webp",
  ownerLabel: "Example Store",
  sourceAccount: "https://example.com/official",
  useBasis: "private_proposal",
  officialSource: true,
  peopleVisible: false,
  watermarkVisible: false,
  alt: "店頭に並ぶ商品",
}

describe("demo private access", () => {
  it("generates non-reversible preview credentials", () => {
    const first = generateDemoPreviewToken()
    const second = generateDemoPreviewToken()
    expect(first).not.toBe(second)
    expect(first.length).toBeGreaterThanOrEqual(40)
    expect(hashDemoPreviewToken(first)).toMatch(/^[a-f0-9]{64}$/)
    expect(previewCookieName("sample-demo")).toMatch(/^demo_preview_[a-f0-9]{20}$/)
  })

  it("normalizes an encoded Japanese route slug before cookie and DB lookup", () => {
    expect(normalizeDemoRouteSlug("greyman%E4%B8%80%E7%B4%9A%E5%BB%BA%E7%AF%89%E5%A3%AB%E4%BA%8B%E5%8B%99%E6%89%80"))
      .toBe("greyman一級建築士事務所")
  })

  it("accepts official private-proposal assets without people or watermark", () => {
    expect(validateDemoAssets([safeAsset])).toEqual([])
  })

  it("keeps private-proposal assets behind signed access", () => {
    expect(validatePublicDemoAssets([safeAsset]).join(" ")).toContain("非公開提案限定")
    expect(validatePublicDemoAssets([{ ...safeAsset, useBasis: "generated" }])).toEqual([])
  })

  it("blocks non-HTTPS, unknown-source, and unconsented people assets", () => {
    const errors = validateDemoAssets([{
      ...safeAsset,
      sourceUrl: "http://example.com/photo.jpg",
      officialSource: false,
      peopleVisible: true,
    }])
    expect(errors).toHaveLength(3)
    expect(errors.join(" ")).toContain("HTTPS")
    expect(errors.join(" ")).toContain("明示許諾")
    expect(errors.join(" ")).toContain("非公式出所")
  })

  it("rejects private preview URLs longer than seven days before any DB write", async () => {
    await expect(activateSignedPrivateDemo({ slug: "sample", ttlDays: 8, assets: [safeAsset] }))
      .rejects.toThrow("1〜7日")
  })
})
