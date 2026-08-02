import { afterEach, describe, expect, it, vi } from "vitest"
import {
  isRetryableHttpStatus,
  retryAfterMilliseconds,
  RetryableExternalError,
  withExternalRetry,
} from "./external-retry"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("external API retry policy", () => {
  it("retries temporary failures and preserves the final result", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const sleep = vi.fn(async () => undefined)
    const operation = vi.fn()
      .mockRejectedValueOnce(new RetryableExternalError("temporary"))
      .mockResolvedValueOnce("ok")

    await expect(withExternalRetry("test", operation, { sleep })).resolves.toBe("ok")
    expect(operation).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(1_000)
  })

  it("does not retry permanent failures", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("invalid input"))
    await expect(withExternalRetry("test", operation, { sleep: async () => undefined })).rejects.toThrow("invalid input")
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it("stops after the configured number of temporary failures", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const operation = vi.fn().mockRejectedValue(new RetryableExternalError("temporary"))
    await expect(withExternalRetry("test", operation, {
      attempts: 2,
      sleep: async () => undefined,
    })).rejects.toThrow("temporary")
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it("recognizes rate limits and Retry-After values", () => {
    expect(isRetryableHttpStatus(429)).toBe(true)
    expect(isRetryableHttpStatus(400)).toBe(false)
    expect(retryAfterMilliseconds("2")).toBe(2_000)
    expect(retryAfterMilliseconds("invalid")).toBeNull()
  })
})
