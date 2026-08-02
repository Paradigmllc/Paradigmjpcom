import { describe, expect, it } from "vitest"
import { globalRunDate } from "./pipeline"

describe("Pet marketing pipeline", () => {
  it("uses a stable UTC run date for idempotency", () => {
    expect(globalRunDate(new Date("2026-08-03T23:59:59.999Z"))).toBe("2026-08-03")
    expect(globalRunDate(new Date("2026-08-04T00:00:00.000Z"))).toBe("2026-08-04")
  })
})
