import { describe, expect, it } from "vitest"
import {
  buildVideoClaimGuard,
  buildVideoLossSimulation,
  defaultVideoLossInputs,
} from "./video-strategy"

describe("video strategy", () => {
  it("builds a segment-specific loss estimate without turning it into a hard claim", () => {
    const simulation = buildVideoLossSimulation({
      segment: "agency_white_label",
      offerAngle: "lost_revenue",
      inputs: {
        monthlyRejectedProjects: 3,
        averageProjectValueUsd: 6000,
        monthlyVideoBudgetUsd: 2500,
        currentVideosPerMonth: 1,
        competitorVideosPerMonth: 7,
        grossMarginPercent: 50,
      },
    })

    expect(simulation.annual_loss_usd).toBeGreaterThan(0)
    expect(simulation.confidence).toBe("operator_estimate")
    expect(simulation.customer_safe_summary_ja).toContain("推定")
    expect(simulation.verification_status).toBe("estimate_only")
  })

  it("requires primary sources for legal, penalty, market, and CAGR claims", () => {
    const guard = buildVideoClaimGuard()
    expect(guard.requires_primary_source_verification).toBe(true)
    expect(guard.blocked_claim_types).toEqual(
      expect.arrayContaining(["law_effective_date", "fine_amount", "market_size", "cagr"]),
    )
    expect(guard.dify_instruction_ja).toContain("未検証")
    expect(guard.dify_instruction_en).toContain("primary_source_url")
  })

  it("provides different defaults per segment for the GUI simulator", () => {
    const agency = defaultVideoLossInputs("agency_white_label")
    const jaas = defaultVideoLossInputs("jaas_bundle")
    expect(agency.averageProjectValueUsd).not.toBe(jaas.averageProjectValueUsd)
  })
})
