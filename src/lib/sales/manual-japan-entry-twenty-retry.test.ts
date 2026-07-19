import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

const store = vi.hoisted(() => ({
  attachManualWorkSource: vi.fn(),
  createManualWork: vi.fn(),
  findManualLeadSource: vi.fn(),
  findManualWorkByDomain: vi.fn(),
  listRecentManualMessages: vi.fn(),
  updateManualWork: vi.fn(),
}))
const syncManualWorkToTwenty = vi.hoisted(() => vi.fn())

vi.mock("./manual-japan-entry-store", () => store)
vi.mock("./manual-japan-entry-twenty", async (importOriginal) => ({
  ...await importOriginal<typeof import("./manual-japan-entry-twenty")>(),
  syncManualWorkToTwenty,
}))

import { processManualJapanEntryUrl } from "./manual-japan-entry-service"
import { ManualTwentySyncError } from "./manual-japan-entry-twenty"

const savedProfile = {
  companyName: "Screenshot to Code",
  countryCode: "US",
  isJapaneseCompany: false,
  smbStatus: "qualified",
  smbConfidence: 83,
  smbEvidence: ["Public software product"],
  japanEntryFitStatus: "qualified",
  japanEntryFitConfidence: 78,
  japanEntryFitEvidence: ["Online product"],
  businessModel: "saas",
  industry: "Technology / IT",
  productContext: "Screenshot-to-code software for product teams.",
  observedFacts: ["Screenshot-to-code software"],
  outreachPlaybook: "saas_ai_devtools",
  positioningConcept: null,
  commercialSignals: [],
}

const existing = {
  id: "work-1",
  domain: "screenshottocode.com",
  status: "needs_review",
  stage: "complete",
  attempts: 2,
  twenty_sync_status: "failed",
  twenty_company_id: "company-owned",
  form_url: "https://screenshottocode.com/contact",
  report_url: "https://paradigmjp.com/en/work-report/report-1",
  initial_message: "保存済みの未送信初回文面",
  profile: savedProfile,
} as unknown as ManualJapanEntryWorkRow

describe("manual work Twenty-only retry orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.findManualLeadSource.mockResolvedValue({ slug: "manual_input" })
    store.findManualWorkByDomain.mockResolvedValue(existing)
    store.attachManualWorkSource.mockResolvedValue(undefined)
    store.updateManualWork.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({ ...existing, ...patch }))
  })

  it("reuses the owned company and completes without regenerating saved sales artifacts", async () => {
    syncManualWorkToTwenty.mockResolvedValue({ status: "synced", companyId: "company-owned" })

    const result = await processManualJapanEntryUrl("https://screenshottocode.com")

    expect(syncManualWorkToTwenty).toHaveBeenCalledWith(expect.objectContaining({
      ownedCompanyId: "company-owned",
      initialMessage: existing.initial_message,
      formUrl: existing.form_url,
      reportUrl: existing.report_url,
    }))
    expect(store.createManualWork).not.toHaveBeenCalled()
    expect(store.updateManualWork).toHaveBeenCalledWith("work-1", expect.objectContaining({
      status: "completed",
      attempts: 3,
      twenty_company_id: "company-owned",
      twenty_sync_status: "synced",
    }))
    expect(result.item.initial_message).toBe(existing.initial_message)
  })

  it("persists the partial company id when Twenty read-back fails again", async () => {
    syncManualWorkToTwenty.mockRejectedValue(new ManualTwentySyncError("read-back failed", "company-owned"))

    const result = await processManualJapanEntryUrl("https://screenshottocode.com")

    expect(store.updateManualWork).toHaveBeenCalledWith("work-1", expect.objectContaining({
      attempts: 3,
      twenty_company_id: "company-owned",
      twenty_sync_status: "failed",
      error_message: "read-back failed",
    }))
    expect(result.item.status).toBe("needs_review")
  })
})
