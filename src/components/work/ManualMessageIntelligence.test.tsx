// @vitest-environment jsdom

import { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ManualJapanEntryWorkRow } from "@/lib/sales/manual-japan-entry-types"
import { ManualMessageIntelligence } from "./ManualMessageIntelligence"

function workRow(overrides: Partial<ManualJapanEntryWorkRow> = {}): ManualJapanEntryWorkRow {
  return {
    id: "work-1",
    report_token: "report-1",
    input_url: "screenshottocode.com",
    canonical_url: "https://screenshottocode.com",
    domain: "screenshottocode.com",
    status: "needs_review",
    stage: "complete",
    company_name: "Screenshot to Code",
    country_code: "US",
    is_japanese_company: false,
    smb_status: "review_required",
    smb_confidence: 60,
    japan_entry_fit_status: "review_required",
    japan_entry_fit_confidence: 60,
    business_model: "saas",
    industry: "Technology / IT",
    product_context: "Converts screenshots into code.",
    profile: {},
    evidence: {},
    form_discovery: {},
    form_url: null,
    initial_message: null,
    message_review: {
      generation_status: "failed",
      generation_error: "DeepSeek candidate generation failed after three attempts",
    },
    message_variant_requested: "estimate_off_price_off",
    message_variant: "estimate_off_price_off",
    message_variant_fallback_reason: null,
    message_angle_requested: "problem",
    message_angle: "problem",
    message_angle_fallback_reason: null,
    outreach_playbook: "saas_ai_devtools",
    qualification_ledger: {},
    master_lead_ledger: {},
    source_attributions: [],
    report_data: {},
    report_url: null,
    twenty_company_id: null,
    twenty_sync_status: "skipped",
    error_message: null,
    attempts: 2,
    sent: false,
    manually_sent_at: null,
    reply_received_at: null,
    founder_forwarded_at: null,
    meeting_converted_at: null,
    created_at: "2026-07-20T00:00:00.000Z",
    updated_at: "2026-07-20T00:00:00.000Z",
    ...overrides,
  }
}

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

describe("ManualMessageIntelligence", () => {
  it("shows an actionable Japanese retry state without exposing raw model diagnostics", async () => {
    await act(async () => root.render(<ManualMessageIntelligence item={workRow()} onCopy={vi.fn()} />))

    expect(container.textContent).toContain("企業別フォーム文面は未生成です")
    expect(container.textContent).toContain("公開根拠の検証または品質審査が自動修正後も基準を満たしませんでした")
    expect(container.textContent).not.toContain("DeepSeek candidate generation failed after three attempts")
    expect(container.textContent).toContain("自動生成・品質修正・再生成は完了")
    expect(container.querySelector("button")).toBeNull()
  })

  it("renders and copies a saved draft", async () => {
    const onCopy = vi.fn()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    await act(async () => root.render(
      <ManualMessageIntelligence
        item={workRow({
          initial_message: "I noticed your screenshot-to-code workflow.",
          message_review: {
            generation_status: "passed",
            passed: true,
            score: 96,
            evidence_pack: [{ id: "fact-1", statement: "Japanese-language path was not observed.", source: "Japan market public-page audit" }],
          },
        })}
        onCopy={onCopy}
      />,
    ))

    expect(container.textContent).toContain("I noticed your screenshot-to-code workflow.")
    const copy = container.querySelector<HTMLButtonElement>("button")
    await act(async () => copy?.click())
    expect(onCopy).toHaveBeenCalledWith("I noticed your screenshot-to-code workflow.", "初回文面")
    expect(consoleError).not.toHaveBeenCalled()
  })

  it("shows traffic, hypothetical sales, and opportunity ranges as non-observed planning estimates", async () => {
    await act(async () => root.render(
      <ManualMessageIntelligence
        item={workRow({
          initial_message: "Copy-ready personalized draft.",
          message_review: { generation_status: "passed", passed: true, score: 96 },
          evidence: {
            message_projection: {
              monthlyVisitRange: { low: 6_000, high: 55_000 },
              assumptions: { conversionRate: 0.012, averageOrderValueUsd: 149 },
              monthlyOpportunityGapUsd: 1_074,
              scenarios: [
                { scenario: "conservative", months: Array.from({ length: 12 }, () => ({ incrementalRevenueUsd: 1_000 })) },
                { scenario: "upside", months: Array.from({ length: 12 }, () => ({ incrementalRevenueUsd: 4_000 })) },
              ],
            },
          },
        })}
        onCopy={vi.fn()}
      />,
    ))

    expect(container.textContent).toContain("推定月間PV6,000–55,000")
    expect(container.textContent).toContain("仮説月商$10,728–$98,340")
    expect(container.textContent).toContain("月次機会差$1,074")
    expect(container.textContent).toContain("初年度機会$12,000–$48,000")
    expect(container.textContent).toContain("実測PV・実売上・保証値ではありません")
  })
})
