import { describe, expect, it } from "vitest"
import { buildGoogleMapsEmbedUrl, inquirySchema } from "./DemoPremiumV2ContactPage"

describe("premium V2 contact utilities", () => {
  it("builds an API-key-free Google Maps embed URL from the verified address", () => {
    expect(buildGoogleMapsEmbedUrl("東京都世田谷区代沢5-6-14 岩本荘2F")).toBe(
      "https://www.google.com/maps?q=%E6%9D%B1%E4%BA%AC%E9%83%BD%E4%B8%96%E7%94%B0%E8%B0%B7%E5%8C%BA%E4%BB%A3%E6%B2%A25-6-14%20%E5%B2%A9%E6%9C%AC%E8%8D%982F&output=embed",
    )
  })

  it("rejects incomplete inquiries and accepts a complete private-preview inquiry", () => {
    expect(inquirySchema.safeParse({ name: "", email: "invalid", phone: "", topic: "", message: "短い", privacy: false }).success).toBe(false)
    expect(inquirySchema.safeParse({
      name: "山田 太郎",
      email: "yamada@example.com",
      phone: "",
      topic: "商品について",
      message: "今週の商品について教えてください。",
      privacy: true,
    }).success).toBe(true)
  })
})
