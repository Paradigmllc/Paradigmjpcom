import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  dispatch: vi.fn(),
  clear: vi.fn(),
  promote: vi.fn(),
  record: vi.fn(),
}))

vi.mock("next/server", () => ({ after: mocks.after }))
vi.mock("./manual-japan-entry-batch-drain", () => ({ dispatchManualWorkBatchDrain: mocks.dispatch }))
vi.mock("./manual-japan-entry-batch-store", () => ({
  clearManualWorkBatchDispatchError: mocks.clear,
  promoteNextManualWorkBatch: mocks.promote,
  recordManualWorkBatchDispatchError: mocks.record,
}))

import { resumeManualWorkBatchQueue, scheduleManualWorkBatchDrain } from "./manual-japan-entry-batch-schedule"

const batchId = "11111111-1111-4111-8111-111111111111"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.dispatch.mockResolvedValue({ ok: true, status: 202 })
  mocks.clear.mockResolvedValue(undefined)
  mocks.record.mockResolvedValue(undefined)
  mocks.promote.mockResolvedValue({ snapshot: { batch: { id: batchId } }, promoted: false })
})

describe("manual work batch scheduling", () => {
  it("resumes the current DB runner at process startup", async () => {
    await resumeManualWorkBatchQueue()
    expect(mocks.promote).toHaveBeenCalledTimes(1)
    expect(mocks.dispatch).toHaveBeenCalledWith(batchId)
    expect(mocks.clear).toHaveBeenCalledWith(batchId)
  })

  it("registers request-scoped background dispatch", () => {
    scheduleManualWorkBatchDrain(batchId)
    expect(mocks.after).toHaveBeenCalledTimes(1)
    expect(mocks.after.mock.calls[0]?.[0]).toEqual(expect.any(Function))
  })
})
