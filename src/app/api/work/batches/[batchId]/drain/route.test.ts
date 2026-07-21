import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  get: vi.fn(),
  claim: vi.fn(),
  complete: vi.fn(),
  refresh: vi.fn(),
  notified: vi.fn(),
  process: vi.fn(),
  notify: vi.fn(),
}))

vi.mock("@/lib/sales/api-auth", () => ({ isSalesApiAuthorized: mocks.authorize }))
vi.mock("@/lib/sales/manual-japan-entry-batch-store", () => ({
  getManualWorkBatch: mocks.get,
  claimManualWorkBatchItems: mocks.claim,
  completeManualWorkBatchItem: mocks.complete,
  refreshManualWorkBatch: mocks.refresh,
  markManualWorkBatchNotified: mocks.notified,
}))
vi.mock("@/lib/sales/manual-japan-entry-service", () => ({ processManualJapanEntryUrl: mocks.process }))
vi.mock("@/lib/notify", () => ({ notifyBothChannels: mocks.notify }))

import { POST } from "./route"

const batchId = "11111111-1111-4111-8111-111111111111"
const before = {
  batch: { id: batchId, status: "running", total_count: 2, message_variant_requested: "auto", message_angle_requested: "auto", source_slug: "manual_input", source_page_url: null, observed_on: null },
  items: [],
  counts: { queued: 2, processing: 0, completed: 0, needs_review: 0, rejected: 0, failed: 0, duplicate: 0 },
  finished: 0,
  remaining: 2,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.authorize.mockResolvedValue(true)
  mocks.get.mockResolvedValue(before)
  mocks.claim.mockResolvedValue([
    { id: "item-1", canonical_url: "https://one.example/", claim_token: "claim-1" },
    { id: "item-2", canonical_url: "https://two.example/", claim_token: "claim-2" },
  ])
  mocks.process.mockImplementation(async (url: string) => ({
    item: { id: url.includes("one") ? "work-1" : "work-2", status: url.includes("one") ? "completed" : "needs_review", error_message: null },
    duplicate: false,
  }))
  mocks.complete.mockResolvedValue(undefined)
  mocks.refresh.mockResolvedValue({ ...before, batch: { ...before.batch, status: "completed" }, remaining: 0, finished: 2, counts: { ...before.counts, queued: 0, completed: 1, needs_review: 1 } })
  mocks.notify.mockResolvedValue({ ok: true })
  mocks.notified.mockResolvedValue(true)
})

describe("manual work durable batch drain", () => {
  it("claims bounded items, processes them concurrently, and persists terminal outcomes", async () => {
    const response = await POST(
      new NextRequest(`https://paradigmjp.com/api/work/batches/${batchId}/drain`, { method: "POST" }),
      { params: Promise.resolve({ batchId }) },
    )
    expect(response.status).toBe(200)
    expect(mocks.process).toHaveBeenCalledTimes(2)
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({ itemId: "item-1", claimToken: "claim-1", status: "completed", workId: "work-1" }))
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({ itemId: "item-2", claimToken: "claim-2", status: "needs_review", workId: "work-2" }))
    expect(mocks.notify).toHaveBeenCalledTimes(1)
  })

  it("persists a failed item instead of abandoning its DB claim", async () => {
    mocks.claim.mockResolvedValue([{ id: "item-1", canonical_url: "https://one.example/", claim_token: "claim-1" }])
    mocks.process.mockRejectedValue(new Error("DeepSeek temporarily unavailable"))
    const response = await POST(
      new NextRequest(`https://paradigmjp.com/api/work/batches/${batchId}/drain`, { method: "POST" }),
      { params: Promise.resolve({ batchId }) },
    )
    expect(response.status).toBe(200)
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({
      itemId: "item-1",
      status: "failed",
      errorMessage: "DeepSeek temporarily unavailable",
    }))
  })
})
