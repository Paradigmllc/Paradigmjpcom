import { afterEach, describe, expect, it, vi } from "vitest"
import {
  arePublicPayloadReadsEnabled,
  withPayloadReadFallback,
} from "./payload-availability"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("withPayloadReadFallback", () => {
  it("skips public Payload reads by default", async () => {
    vi.stubEnv("PAYLOAD_PUBLIC_READS_ENABLED", "")
    vi.stubEnv("PAYLOAD_READS_DISABLED", "")
    vi.stubEnv("PAYLOAD_READS_DISABLED_DURING_BUILD", "")

    let called = false
    const result = await withPayloadReadFallback(
      "test.payload.find",
      async () => {
        called = true
        return "live"
      },
      "fallback",
    )

    expect(arePublicPayloadReadsEnabled()).toBe(false)
    expect(called).toBe(false)
    expect(result).toBe("fallback")
  })

  it("allows public Payload reads only when explicitly enabled", async () => {
    vi.stubEnv("PAYLOAD_PUBLIC_READS_ENABLED", "1")
    vi.stubEnv("PAYLOAD_READS_DISABLED", "")
    vi.stubEnv("PAYLOAD_READS_DISABLED_DURING_BUILD", "")
    vi.stubEnv("DATABASE_URI", "")

    const result = await withPayloadReadFallback(
      "test.payload.find",
      async () => "live",
      "fallback",
    )

    expect(arePublicPayloadReadsEnabled()).toBe(true)
    expect(result).toBe("live")
  })
})
