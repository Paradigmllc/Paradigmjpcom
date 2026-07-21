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
      tone: "amber",
    })
  })

  it("labels a Twenty failure as a persistence recovery after automatic retries", () => {
    const notice = manualWorkOperatorNotice(row({ twenty_sync_status: "failed" }))

    expect(notice?.retryLabel).toBe("保存を復旧")
    expect(notice?.detail).toContain("自動再試行後")
  })

  it("explains a canonical-page audit retry without exposing raw diagnostics", () => {
    const notice = manualWorkOperatorNotice(row({
      status: "failed",
      stage: "failed",
      error_message: "No public pages were available for Japan-readiness evidence",
    }))

    expect(notice?.detail).toContain("canonical URL")
    expect(notice?.detail).toContain("自動再試行")
    expect(notice?.detail).not.toContain("No public pages")
  })
})
