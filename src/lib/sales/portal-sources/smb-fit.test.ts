import { describe, expect, it } from "vitest"
import { assessPortalSmbFit } from "./smb-fit"

const localBuilder = {
  companyName: "バナナ工務店",
  category: "工務店・注文住宅・リフォーム",
  description: "代表の大工が2001年に創業。二級建築士と宅地建物取引士の資格を持ち、三浦市で地域に根ざした施工を行っています。",
  address: "神奈川県三浦市三崎町小網代227-10",
  websiteUrl: null,
  imageCount: 8,
}

describe("portal SMB decision fit", () => {
  it("accepts an owner-operated local specialist", () => {
    const fit = assessPortalSmbFit(localBuilder)
    expect(fit.eligible).toBe(true)
    expect(fit.score).toBeGreaterThanOrEqual(70)
    expect(fit.decisionSignals).toContain("代表者・店主本人")
  })

  it("rejects listed, nationwide, multi-location operators", () => {
    const fit = assessPortalSmbFit({
      ...localBuilder,
      companyName: "全国住宅ホールディングス",
      category: "ハウスメーカー",
      description: "東証上場の企業グループとして全国80拠点を展開しています。",
    })
    expect(fit.eligible).toBe(false)
    expect(fit.score).toBeLessThanOrEqual(15)
    expect(fit.enterpriseSignals).toEqual(expect.arrayContaining(["上場企業", "全国展開", "企業グループ", "ハウスメーカー"]))
  })

  it("holds a generic listing without owner-level evidence", () => {
    const fit = assessPortalSmbFit({
      ...localBuilder,
      description: "住宅リフォームと外構工事を提供しています。お気軽にお問い合わせください。",
    })
    expect(fit.eligible).toBe(false)
    expect(fit.reasons[0]).toContain("確認する必要")
  })

  it("does not treat a specialist keyword alone as owner-level evidence", () => {
    const fit = assessPortalSmbFit({
      ...localBuilder,
      description: "二級建築士が在籍し、住宅リフォームと外構工事を提供しています。地域密着で対応します。",
    })
    expect(fit.decisionSignals).toContain("職人・専門家直結")
    expect(fit.eligible).toBe(false)
  })

  it("rejects operators with enterprise-scale stated capital", () => {
    const fit = assessPortalSmbFit({
      ...localBuilder,
      description: "代表が施工品質を監修しています。資本金 3億円、全国でサービスを提供しています。",
    })
    expect(fit.eligible).toBe(false)
    expect(fit.enterpriseSignals).toContain("大規模資本")
  })
})
