import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({ getServiceSalesSupabase: vi.fn() }))

import { getServiceSalesSupabase } from "@/lib/supabase"
import {
  claimDemoBatchDrain,
  dispatchDemoBatchDrain,
  releaseDemoBatchDrain,
} from "./demo-batch-drain"

const getSupabase = vi.mocked(getServiceSalesSupabase)

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://paradigmjp.com")
  vi.stubEnv("TRIGGER_WEBHOOK_SECRET", "test-secret")
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("demo batch drain", () => {
  it("claims and releases the singleton lease with one drain id", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
    getSupabase.mockReturnValue({ rpc } as never)

    await expect(claimDemoBatchDrain("00000000-0000-4000-8000-000000000001")).resolves.toMatchObject({ claimed: true })
    await releaseDemoBatchDrain("00000000-0000-4000-8000-000000000001")
    expect(rpc).toHaveBeenNthCalledWith(1, "claim_demo_generation_drain", expect.any(Object))
    expect(rpc).toHaveBeenNthCalledWith(2, "release_demo_generation_drain", expect.any(Object))
  })

  it("dispatches the next bounded batch without enabling sending", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(dispatchDemoBatchDrain({
      drainId: "00000000-0000-4000-8000-000000000002",
      limit: 3,
    })).resolves.toMatchObject({ ok: true, status: 200 })
    expect(fetchMock).toHaveBeenCalledWith(
      "https://paradigmjp.com/api/sales/demo-site/batch",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          limit: 3,
          drainId: "00000000-0000-4000-8000-000000000002",
          automated: true,
        }),
      }),
    )
  })
})
