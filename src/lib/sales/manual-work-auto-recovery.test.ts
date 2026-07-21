import { describe, expect, it, vi } from "vitest"
import { runWithManualWorkAutoRecovery } from "./manual-work-auto-recovery"

describe("manual work automatic recovery", () => {
  it("recovers a transient thrown failure inside the original operation", async () => {
    const operation = vi.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("temporary timeout"))
      .mockResolvedValueOnce("saved")

    await expect(runWithManualWorkAutoRecovery({
      phase: "Twenty persistence",
      maxAttempts: 3,
      operation,
    })).resolves.toEqual({ value: "saved", attempts: 2 })
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("retries a rejected quality result and returns the first accepted result", async () => {
    const operation = vi.fn<() => Promise<{ ok: boolean; version: number }>>()
      .mockResolvedValueOnce({ ok: false, version: 1 })
      .mockResolvedValueOnce({ ok: true, version: 2 })

    await expect(runWithManualWorkAutoRecovery({
      phase: "message quality",
      maxAttempts: 2,
      operation,
      accept: (result) => result.ok,
    })).resolves.toEqual({ value: { ok: true, version: 2 }, attempts: 2 })
  })

  it("surfaces the final failure after the bounded retry budget", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("still unavailable"))

    await expect(runWithManualWorkAutoRecovery({
      phase: "public evidence",
      maxAttempts: 2,
      operation,
    })).rejects.toThrow("still unavailable")
    expect(operation).toHaveBeenCalledTimes(2)
  })
})
