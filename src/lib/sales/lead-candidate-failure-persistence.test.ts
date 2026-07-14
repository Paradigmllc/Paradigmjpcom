import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const select = vi.fn(() => ({ maybeSingle }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  return { maybeSingle, select, eq, update, from }
})

vi.mock("@/lib/supabase", () => ({
  getServiceSalesSupabase: () => ({ from: mocks.from }),
}))

import { persistRunItemFailure } from "./lead-candidate-failure-persistence"

const ITEM = {
  id: "item-1",
  run_id: "run-1",
  domain: "example.com",
  attempts: 0,
}

describe("persistRunItemFailure", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires a returned failed row before treating persistence as successful", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { id: ITEM.id, status: "failed" },
      error: null,
    })

    await expect(persistRunItemFailure(ITEM, "timeout")).resolves.toBeUndefined()
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "failed",
      attempts: 1,
      error_message: "timeout",
    }))
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(1)
  })

  it("retries only the DB failure write and succeeds when confirmation arrives", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: null, error: { message: "temporary failure" } })
      .mockResolvedValueOnce({ data: { id: ITEM.id, status: "failed" }, error: null })

    await expect(persistRunItemFailure(ITEM, "timeout")).resolves.toBeUndefined()
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(2)
  })

  it("fails closed after three unconfirmed writes", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(persistRunItemFailure(ITEM, "timeout")).rejects.toThrow(
      "Failed to persist verification failure for example.com",
    )
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(3)
  })
})
