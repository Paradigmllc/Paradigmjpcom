import { describe, expect, it } from "vitest"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import { manualWorkFailureToast, manualWorkOperatorNotice } from "./manual-work-operator-notice"

function row(overrides: Partial<ManualJapanEntryWorkRow> = {}): ManualJapanEntryWorkRow {
  return {
    id: "work-1", report_token: "report-1", input_url: "https://example.com", canonical_url: "https://example.com",
    domain: "example.com", status: "needs_review", stage: "complete", company_name: "Example", country_code: "GB",
    is_japanese_company: false, smb_status: "qualified", smb_confidence: 90, japan_entry_fit_status: "qualified",
    japan_entry_fit_confidence: 90, business_model: "saas", industry: "Technology / IT", product_context: "Example product",
    profile: {}, evidence: {}, form_discovery: {}, form_url: null, initial_message: null, message_review: {},
    message_variant_requested: "estimate_off_price_off", message_variant: "estimate_off_price_off",
    message_variant_fallback_reason: null, message_angle_requested: "problem", message_angle: "problem",
    message_angle_fallback_reason: null, outreach_playbook: "saas_ai_devtools", qualification_ledger: {}, master_lead_ledger: {},
    source_attributions: [], report_data: {}, report_url: null, twenty_company_id: null, twenty_sync_status: "skipped",
    error_message: null, attempts: 1, sent: false, manually_sent_at: null, reply_received_at: null,
    founder_forwarded_at: null, meeting_converted_at: null, created_at: "2026-07-21T00:00:00.000Z",
    updated_at: "2026-07-21T00:00:00.000Z", ...overrides,
  }
}

describe("manualWorkOperatorNotice", () => {
  it("does not expose raw model or gate diagnostics to the operator", () => {
    const raw = "Initial message generation failed: Unsupported causal inference; Revenue wording is not tied"
    const item = row({ error_message: raw, message_review: { generation_status: "failed", generation_error: raw } })
    const notice = manualWorkOperatorNotice(item)

    expect(notice?.title).toBe("企業別フォーム文面を再生成してください")
    expect(notice?.reasons).toEqual([
      "初回文面が事実確認・企業固有性・安全性の品質基準を通過しませんでした。",
      "フォーム探索結果の確度が不足しているため、有効な問い合わせフォームを確定できませんでした。",
    ])
    expect(notice?.nextAction).toContain("送信しない")
    expect(JSON.stringify(notice)).not.toContain("Unsupported causal inference")
    expect(manualWorkFailureToast(item)).not.toContain("Revenue wording")
  })

  it("distinguishes a verified result awaiting qualification review from a processing error", () => {
    const item = row({
      initial_message: "Hello Example team,",
      form_url: "https://example.com/contact",
      form_discovery: {
        verification: "form", confidence: 95,
        inspection: { status: "form", fields: ["email", "message", "submit"] },
      },
    })

    expect(manualWorkOperatorNotice(item)).toMatchObject({
      title: "対象判定の追加確認が必要です",
      reasons: ["海外SMBまたはJapan Entry適合性を確定する公開根拠が不足しています。"],
      tone: "amber",
    })
  })

  it("shows a preserved regeneration failure instead of presenting stale artifacts as current", () => {
    const item = row({
      initial_message: "Hello Example team,",
      message_review: {
        generation_status: "passed",
        passed: true,
        last_regeneration_failure: {
          failed_at: "2026-07-22T00:00:00.000Z",
          message: "raw deterministic diagnostics",
          artifacts_preserved: true,
        },
      },
      error_message: "raw deterministic diagnostics",
    })

    const notice = manualWorkOperatorNotice(item)
    expect(notice).toMatchObject({
      title: "最新文面への更新を完了できませんでした",
      reasons: ["最新の品質基準による文面再生成が、自動修正後も合格しませんでした。"],
      retryLabel: "更新を再実行",
      tone: "amber",
    })
    expect(JSON.stringify(notice)).not.toContain("raw deterministic diagnostics")
  })

  it("labels a Twenty failure as a persistence recovery after automatic retries", () => {
    const notice = manualWorkOperatorNotice(row({ twenty_sync_status: "failed" }))

    expect(notice?.retryLabel).toBe("保存を復旧")
    expect(notice?.reasons).toEqual(["自動再試行後もTwentyへの保存または保存内容の読み戻し確認を完了できませんでした。"])
    expect(notice?.nextAction).toContain("読み戻し完了")
  })

  it("explains a canonical-page audit retry without exposing raw diagnostics", () => {
    const notice = manualWorkOperatorNotice(row({
      status: "failed",
      stage: "failed",
      error_message: "No public pages were available for Japan-readiness evidence",
    }))

    expect(notice?.reasons).toEqual(["企業サイトの公開ページを取得できず、企業情報の監査を完了できませんでした。"])
    expect(notice?.detail).toContain("自動再試行")
    expect(JSON.stringify(notice)).not.toContain("No public pages")
  })

  it("always shows the concrete exclusion reason for a Japanese company", () => {
    const notice = manualWorkOperatorNotice(row({
      status: "rejected",
      country_code: "JP",
      is_japanese_company: true,
      error_message: "Japanese companies are outside the Japan Entry Package target.",
    }))

    expect(notice).toMatchObject({
      title: "対象外として安全に停止しました",
      reasons: ["日本企業のため、海外SMB向けJapan Entry Packageの対象外です。"],
    })
    expect(notice?.nextAction).toContain("正しい企業URL")
  })

  it("shows every persisted review blocker plus the form diagnosis", () => {
    const notice = manualWorkOperatorNotice(row({
      error_message: "Country is unconfirmed; Japan Entry fit needs review; A high-confidence public form was not verified",
      form_discovery: { outcome: "no_public_form", verification: "fallback" },
    }))

    expect(notice?.reasons).toEqual([
      "企業の所在国を公開情報から確定できませんでした。",
      "日本進出との適合性を判断する公開根拠が不足しています。",
      "入力・本文・送信操作を備えた有効な公開問い合わせフォームを確認できませんでした。",
      "サイト内を探索しましたが、使用可能な公開問い合わせフォームは見つかりませんでした。",
    ])
  })

  it.each([
    ["Twenty同期失敗", row({ twenty_sync_status: "failed" })],
    ["解析失敗", row({ status: "failed", stage: "failed" })],
    ["対象外", row({ status: "rejected" })],
    ["要確認", row({ status: "needs_review" })],
  ])("always returns at least one reason and a next action for %s", (_label, item) => {
    const notice = manualWorkOperatorNotice(item)
    expect(notice?.reasons.length).toBeGreaterThan(0)
    expect(notice?.nextAction.length).toBeGreaterThan(0)
  })
})
