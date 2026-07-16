import { describe, expect, it } from "vitest"
import { groundManualPositioningConcept } from "./manual-japan-entry-playbook"

describe("manual Japan Entry positioning concept grounding", () => {
  const context = "Example provides a subscription analytics platform for independent retailers with inventory insights."

  it("keeps a concrete concept grounded in an exact public phrase", () => {
    expect(groundManualPositioningConcept({
      sourcePhrase: "subscription analytics platform for independent retailers",
      japaneseHeadline: "小売事業者向けサブスクリプション分析",
      japaneseSupportLine: "在庫インサイトを確認できる分析プラットフォームの日本語ポジショニング案です。",
    }, context)).toMatchObject({ sourcePhrase: "subscription analytics platform for independent retailers" })
  })

  it("rejects an invented source phrase or promotional guarantee", () => {
    expect(groundManualPositioningConcept({
      sourcePhrase: "AI market leader",
      japaneseHeadline: "日本一の分析基盤",
      japaneseSupportLine: "売上向上を保証する分析プラットフォームです。",
    }, context)).toBeNull()
  })
})
