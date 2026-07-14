import { describe, expect, it } from "vitest"
import { expandGroundedBody } from "./demo-content-depth"

describe("grounded demo copy expansion", () => {
  it("expands short model copy with company-specific verified context", () => {
    const common = {
      body: "店内の雰囲気をご紹介します。",
      companyName: "ノン美容室",
      facts: ["神奈川県横浜市港北区", "店内のセット面", "鏡と椅子が写る店内"],
      services: [{ title: "カット", description: "確認済みの提供メニューとしてご案内しています。" }],
      locale: "ja" as const,
      context: "works" as const,
      targetLength: 180,
    }
    const first = expandGroundedBody({ ...common, index: 0 })
    const second = expandGroundedBody({ ...common, index: 1 })

    expect(first.length).toBeGreaterThanOrEqual(180)
    expect(first).toContain("ノン美容室")
    expect(first).toContain("神奈川県横浜市港北区")
    expect(second).not.toBe(first)
  })

  it("does not alter copy that already meets the target", () => {
    const body = "確認済みの本文です。".repeat(20)
    expect(expandGroundedBody({
      body,
      companyName: "サンプル",
      facts: [],
      services: [],
      index: 0,
      locale: "ja",
      context: "home",
      targetLength: 120,
    })).toBe(body)
  })
})
