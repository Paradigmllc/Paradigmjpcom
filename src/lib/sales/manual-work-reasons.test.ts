import { describe, expect, it } from "vitest"
import { manualWorkReasonCopies, manualWorkReviewReasonCopies } from "./manual-work-reasons"

describe("manual work reason copy", () => {
  it("translates every known eligibility blocker into operator-facing Japanese", () => {
    expect(manualWorkReasonCopies([
      "Country is unconfirmed",
      "Japanese companies are excluded",
      "Company is outside the overseas SMB scope",
      "SMB classification needs review",
      "Company is outside the current Japan Entry offer scope",
      "Japan Entry fit needs review",
      "A high-confidence public form was not verified",
      "The initial message did not pass the production quality gate",
    ])).toEqual([
      "企業の所在国を公開情報から確定できませんでした。",
      "日本企業のため、海外SMB向けJapan Entry Packageの対象外です。",
      "公開情報から海外SMBの対象条件を満たす企業と確認できませんでした。",
      "企業規模を海外SMBと判断する公開根拠が不足しています。",
      "現在のJapan Entry Packageで支援できる事業条件の対象外です。",
      "日本進出との適合性を判断する公開根拠が不足しています。",
      "入力・本文・送信操作を備えた有効な公開問い合わせフォームを確認できませんでした。",
      "初回文面が事実確認・企業固有性・安全性の品質基準を通過しませんでした。",
    ])
  })

  it("preserves a safe Japanese non-company reason without exposing a URL", () => {
    expect(manualWorkReasonCopies("対象外: 公開ページは運営企業の商材サイトではなく、駐車ページと判定されました"))
      .toEqual(["公開ページは運営企業の商材サイトではなく、駐車ページと判定されました。"])
    expect(manualWorkReasonCopies("対象外: https://example.com/internal"))
      .toEqual([])
  })

  it("returns a safe fallback for an unknown persisted review diagnostic", () => {
    expect(manualWorkReviewReasonCopies(["provider-internal raw diagnostic"])).toEqual([
      "解析結果に追加確認が必要ですが、安全に表示できる詳細理由を取得できませんでした。",
    ])
  })
})
