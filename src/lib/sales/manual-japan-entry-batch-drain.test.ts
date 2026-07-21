import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { dispatchManualWorkBatchDrain } from "./manual-japan-entry-batch-drain"

describe("manual work server-side batch drain", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://paradigmjp.com")
    vi.stubEnv("TRIGGER_WEBHOOK_SECRET", "test-secret")
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 202 })))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("dispatches the next durable slice with webhook authorization and zero send input", async () => {
    const batchId = "11111111-1111-4111-8111-111111111111"
    await expect(dispatchManualWorkBatchDrain(batchId)).resolves.toMatchObject({ ok: true, status: 202 })
    expect(fetch).toHaveBeenCalledWith(
      `https://paradigmjp.com/api/work/batches/${batchId}/drain`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-webhook-secret": "test-secret" }),
        body: JSON.stringify({ automated: true }),
      }),
    )
  })

  it("fails closed when the webhook secret is unavailable", async () => {
    vi.stubEnv("TRIGGER_WEBHOOK_SECRET", "")
    await expect(dispatchManualWorkBatchDrain("11111111-1111-4111-8111-111111111111"))
      .resolves.toMatchObject({ ok: false, error: expect.stringContaining("TRIGGER_WEBHOOK_SECRET") })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("can use an explicit loopback origin to bypass the public CDN", async () => {
    vi.stubEnv("MANUAL_WORK_INTERNAL_ORIGIN", "http://127.0.0.1:3000")
    await expect(dispatchManualWorkBatchDrain("11111111-1111-4111-8111-111111111111"))
      .resolves.toMatchObject({ ok: true })
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/api/work/batches/11111111-1111-4111-8111-111111111111/drain",
      expect.any(Object),
    )
  })
})
