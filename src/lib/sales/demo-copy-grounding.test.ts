import { describe, expect, it } from "vitest"
import { findUnsupportedDemoClaims, groundDemoText } from "./demo-copy-grounding"

describe("demo copy grounding", () => {
  it("detects unsupported food, operations, and image-rights details", () => {
    const copy = "2020年の創業以来、外は香ばしく中はしっとり。DMで予約を承り、翌営業日に返信します。写真は権利確認済みの公式素材です。"
    expect(findUnsupportedDemoClaims(copy, "フレンチトースト、公式Instagram")).toEqual([
      "asset_provenance",
      "chronology",
      "history",
      "operations",
      "product_detail",
    ])
  })

  it("replaces an unsupported generated sentence with verified-fact fallback", () => {
    expect(groundDemoText(
      "一杯ずつハンドドリップで抽出します。",
      "ドリップコーヒー",
      "ドリップコーヒーをご案内しています。",
    )).toBe("ドリップコーヒーをご案内しています。")
  })

  it("keeps details that are explicitly present in verified facts", () => {
    const copy = "一杯ずつハンドドリップで抽出します。"
    expect(groundDemoText(copy, "一杯ずつハンドドリップ", "fallback")).toBe(copy)
  })
})
