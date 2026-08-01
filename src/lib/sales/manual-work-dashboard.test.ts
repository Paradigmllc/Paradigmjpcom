import { describe, expect, it } from "vitest"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"
import { filterManualWorkItems, summarizeManualWorkDashboard } from "./manual-work-dashboard"

function row(overrides: Partial<ManualJapanEntryWorkRow>): ManualJapanEntryWorkRow {
  return {
    id: "row-1",
    report_token: "11111111-1111-4111-8111-111111111111",
    input_url: "https://acme.example",
    canonical_url: "https://acme.example",
    domain: "acme.example",
    status: "needs_review",
    stage: "complete",
    company_name: "Acme",
    country_code: "US",
    is_japanese_company: false,
    smb_status: "qualified",
    smb_confidence: 90,
    japan_entry_fit_status: "qualified",
    japan_entry_fit_confidence: 80,
    business_model: "saas",
    industry: "Technology / IT",
    product_context: "SaaS",
    profile: {}, evidence: {}, form_discovery: {}, form_url: "https://acme.example/contact",
    initial_message: "Hello", message_review: {},
    message_variant_requested: "estimate_off_price_off", message_variant: "estimate_off_price_off", message_variant_fallback_reason: null,
    message_angle_requested: "problem", message_angle: "problem", message_angle_fallback_reason: null,
    outreach_playbook: "saas_ai_devtools", qualification_ledger: {}, master_lead_ledger: {}, source_attributions: [],
    report_data: {}, report_url: null, twenty_company_id: null, twenty_sync_status: "skipped", error_message: null,
    attempts: 1, sent: false, manually_sent_at: null, reply_received_at: null, founder_forwarded_at: null, meeting_converted_at: null,
    created_at: "2026-07-17T00:00:00.000Z", updated_at: "2026-07-17T00:00:00.000Z",
    ...overrides,
  }
}

describe("manual work dashboard", () => {
  const items = [
    row({ id: "review", company_name: "Acme Cloud", twenty_sync_status: "synced" }),
    row({ id: "done", domain: "orbit.example", company_name: "Orbit", status: "completed", twenty_sync_status: "synced", manually_sent_at: "2026-07-17T01:00:00.000Z", meeting_converted_at: "2026-07-17T02:00:00.000Z" }),
    row({ id: "failed", domain: "broken.example", company_name: "Broken", status: "failed", form_url: null }),
  ]

  it("summarizes operator outcomes without treating generation as sending", () => {
    expect(summarizeManualWorkDashboard(items)).toEqual({
      total: 3, actionRequired: 1, completed: 2, formReady: 2, manuallySent: 1, meetings: 1,
    })
  })

  it("filters history by workflow state and company search", () => {
    expect(filterManualWorkItems(items, "action_required", "acme").map((item) => item.id)).toEqual(["review"])
    expect(filterManualWorkItems(items, "sent", "").map((item) => item.id)).toEqual(["done"])
    expect(filterManualWorkItems(items, "completed", "").map((item) => item.id)).toEqual(["review", "done"])
    expect(filterManualWorkItems(items, "failed", "broken.example").map((item) => item.id)).toEqual(["failed"])
  })
})
