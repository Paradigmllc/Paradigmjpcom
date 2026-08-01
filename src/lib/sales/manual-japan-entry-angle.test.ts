import { describe, expect, it } from "vitest"
import {
  assignManualMessageAngle,
  MANUAL_MESSAGE_ANGLES,
  resolveManualMessageAngle,
  summarizeManualWorkAngles,
} from "./manual-japan-entry-angle"

describe("manual Japan Entry message angles", () => {
  it("assigns a stable valid angle by domain", () => {
    const angle = assignManualMessageAngle("example.com")
    expect(MANUAL_MESSAGE_ANGLES).toContain(angle)
    expect(assignManualMessageAngle("EXAMPLE.COM")).toBe(angle)
  })

  it("fails closed for unsupported competitor, opportunity, and mockup claims", () => {
    expect(resolveManualMessageAngle({
      requested: "competitor",
      hasVerifiedCompetitor: false,
      hasModeledOpportunity: false,
      hasPreparedPositioningConcept: false,
    })).toMatchObject({ angle: "problem", fallbackReason: expect.stringContaining("競合名を推測せず") })
    expect(resolveManualMessageAngle({
      requested: "opportunity",
      hasVerifiedCompetitor: false,
      hasModeledOpportunity: false,
      hasPreparedPositioningConcept: false,
    })).toMatchObject({ angle: "problem", fallbackReason: expect.stringContaining("数字を出さず") })
    expect(resolveManualMessageAngle({
      requested: "mockup",
      hasVerifiedCompetitor: false,
      hasModeledOpportunity: false,
      hasPreparedPositioningConcept: false,
    })).toMatchObject({ angle: "problem", fallbackReason: expect.stringContaining("作成済みと主張せず") })
  })

  it("allows an angle only when its evidence exists", () => {
    expect(resolveManualMessageAngle({ requested: "competitor", hasVerifiedCompetitor: true, hasModeledOpportunity: false, hasPreparedPositioningConcept: false })).toEqual({ angle: "competitor", fallbackReason: null })
    expect(resolveManualMessageAngle({ requested: "opportunity", hasVerifiedCompetitor: false, hasModeledOpportunity: true, hasPreparedPositioningConcept: false })).toEqual({ angle: "opportunity", fallbackReason: null })
    expect(resolveManualMessageAngle({ requested: "mockup", hasVerifiedCompetitor: false, hasModeledOpportunity: false, hasPreparedPositioningConcept: true })).toEqual({ angle: "mockup", fallbackReason: null })
  })

  it("summarizes outcomes by the effective angle", () => {
    const metrics = summarizeManualWorkAngles([{
      message_angle: "mockup",
      manually_sent_at: "2026-07-16T00:00:00.000Z",
      reply_received_at: "2026-07-16T01:00:00.000Z",
      founder_forwarded_at: null,
      meeting_converted_at: null,
    }])
    expect(metrics.find((metric) => metric.angle === "mockup")).toMatchObject({ assigned: 1, manuallySent: 1, replies: 1 })
  })
})
