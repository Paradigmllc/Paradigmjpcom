import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: vi.fn() }))

import {
  generateDemoPreviewToken,
  hashDemoPreviewToken,
  previewCookieName,
  validateDemoAssets,
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

  it("accepts official private-proposal assets without people or watermark", () => {
    expect(validateDemoAssets([safeAsset])).toEqual([])
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
})
