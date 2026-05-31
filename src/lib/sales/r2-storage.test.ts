import { describe, expect, it } from "vitest"
import { sanitizeR2ObjectName } from "./r2-storage"

describe("R2 storage helpers", () => {
  it("sanitizes nested object names without losing useful extensions", () => {
    expect(sanitizeR2ObjectName("/Master Video 日本語.mp4")).toBe("Master-Video.mp4")
    expect(sanitizeR2ObjectName("outputs/review proxy 01.webm")).toBe("outputs/review-proxy-01.webm")
  })
})
