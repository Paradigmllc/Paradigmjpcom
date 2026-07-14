import { describe, expect, it } from "vitest"
import { curateEditorialFacts, expandGroundedBody } from "./demo-content-depth"

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

  it("keeps source-health metadata out of customer-facing expansion", () => {
    const sourceRecord = "045-541-9161、神奈川県横浜市港北区新吉田東5-59-11、美容室・ヘアサロン。昭和58年に新吉田で開店し、2025年に42年。エキテン公式店舗は2026年6月25日更新。登録公式URL non-hair-salon.business.site は2026年7月14日に404を確認。これは現在確認できる情報の一つです。"
    const curated = curateEditorialFacts([sourceRecord])
    const expanded = expandGroundedBody({
      body: "地域に寄り添うサロンです。",
      companyName: "ノン美容室",
      facts: [sourceRecord],
      services: [{ title: "カット", description: "髪の状態に合わせて相談しながら進めます。" }],
      index: 1,
      locale: "ja",
      context: "works",
      targetLength: 180,
    })

    expect(curated.join(" ")).toContain("昭和58年")
    expect(`${curated.join(" ")} ${expanded}`).not.toMatch(/404|business\.site|登録公式URL|エキテン公式店舗|045-541-9161/u)
    expect(expanded.length).toBeGreaterThanOrEqual(180)
  })
})
