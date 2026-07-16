import { describe, expect, it } from "vitest"
import {
  assignManualMessageVariant,
  MANUAL_MESSAGE_VARIANTS,
  nonEstimateVariant,
  summarizeManualWorkExperiment,
  variantOptions,
} from "./manual-japan-entry-experiment"

describe("manual Japan Entry copy experiment", () => {
  it("assigns the same domain to the same valid cell", () => {
    const first = assignManualMessageVariant("example.com")
    expect(MANUAL_MESSAGE_VARIANTS).toContain(first)
    expect(assignManualMessageVariant("EXAMPLE.COM")).toBe(first)
  })

  it("maps all four estimate and price combinations exactly", () => {
    expect(variantOptions("estimate_off_price_off")).toEqual({ includeEstimate: false, includePrice: false, founderForwardCta: true })
    expect(variantOptions("estimate_on_price_off")).toEqual({ includeEstimate: true, includePrice: false, founderForwardCta: true })
    expect(variantOptions("estimate_off_price_on")).toEqual({ includeEstimate: false, includePrice: true, founderForwardCta: true })
    expect(variantOptions("estimate_on_price_on")).toEqual({ includeEstimate: true, includePrice: true, founderForwardCta: true })
  })

  it("falls back without silently changing the price cell", () => {
    expect(nonEstimateVariant("estimate_on_price_off")).toBe("estimate_off_price_off")
    expect(nonEstimateVariant("estimate_on_price_on")).toBe("estimate_off_price_on")
  })

  it("uses manually sent as the outcome denominator source", () => {
    const metrics = summarizeManualWorkExperiment([
      {
        message_variant: "estimate_off_price_off",
        manually_sent_at: "2026-07-16T00:00:00.000Z",
        reply_received_at: "2026-07-16T01:00:00.000Z",
        founder_forwarded_at: null,
        meeting_converted_at: null,
      },
      {
        message_variant: "estimate_off_price_off",
        manually_sent_at: null,
        reply_received_at: null,
        founder_forwarded_at: null,
        meeting_converted_at: null,
      },
    ])
    expect(metrics[0]).toMatchObject({ assigned: 2, manuallySent: 1, replies: 1, founderForwards: 0, meetings: 0 })
  })
})
