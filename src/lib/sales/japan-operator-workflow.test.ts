import { describe, expect, it } from "vitest"
import {
  calculateJapanOperatorRevenueShare,
  canAdvanceJapanOperatorCase,
  getMissingJapanOperatorChecks,
  getNextJapanOperatorStage,
  JAPAN_OPERATOR_STAGE_DEFINITIONS,
  JAPAN_OPERATOR_STAGES,
  STANDARD_OPERATOR_TERMS,
  type JapanOperatorGateData,
} from "./japan-operator-workflow"

describe("Japan operator stage gates", () => {
  it("defines every stage once and in the same order as the pipeline", () => {
    expect(JAPAN_OPERATOR_STAGE_DEFINITIONS.map((item) => item.stage)).toEqual(JAPAN_OPERATOR_STAGES)
    expect(new Set(JAPAN_OPERATOR_STAGES).size).toBe(JAPAN_OPERATOR_STAGES.length)
  })

  it("does not advance when the next stage has incomplete entry conditions", () => {
    const result = canAdvanceJapanOperatorCase("memo_ready", {})
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.missing.map((item) => item.id)).toContain("send_copy_approved")
  })

  it("advances only after all next-stage conditions are checked", () => {
    const gateData: JapanOperatorGateData = {
      replied: { reply_logged: true, permission_to_send_memo: true },
    }
    expect(canAdvanceJapanOperatorCase("permission_sent", gateData)).toEqual({ ok: true, nextStage: "replied" })
  })

  it("makes the external-send record an explicit condition", () => {
    const missing = getMissingJapanOperatorChecks("permission_sent", {
      permission_sent: { delivery_route_verified: true, suppression_check: true },
    })
    expect(missing).toEqual([{ id: "sent_logged", label: "人が実行した送信日時と経路をCRMへ記録した" }])
  })

  it("has no stage after active operation", () => {
    expect(getNextJapanOperatorStage("active_operator")).toBeNull()
  })
})

describe("Japan operator commercial calculation", () => {
  it("keeps the approved package constants together", () => {
    expect(STANDARD_OPERATOR_TERMS).toMatchObject({
      validationFeeUsd: 5_000,
      launchTotalUsd: 20_000,
      monthlyRetainerUsd: 2_500,
      revenueShareRate: 0.1,
    })
  })

  it("calculates revenue share from collected sales after agreed deductions", () => {
    expect(calculateJapanOperatorRevenueShare({
      grossCollected: 10_000_00,
      consumptionTax: 90_909,
      refunds: 40_000,
      chargebacks: 10_000,
      discounts: 30_000,
      sellerPaidDuties: 20_000,
      marketplaceAndPaymentFees: 50_000,
    })).toEqual({ netCollectedJapanSales: 759_091, revenueShare: 75_909 })
  })

  it("never produces negative net sales or accepts decimal minor units", () => {
    expect(calculateJapanOperatorRevenueShare({
      grossCollected: 100,
      consumptionTax: 20,
      refunds: 200,
      chargebacks: 0,
      discounts: 0,
      sellerPaidDuties: 0,
      marketplaceAndPaymentFees: 0,
    })).toEqual({ netCollectedJapanSales: 0, revenueShare: 0 })
    expect(() => calculateJapanOperatorRevenueShare({
      grossCollected: 100.5,
      consumptionTax: 0,
      refunds: 0,
      chargebacks: 0,
      discounts: 0,
      sellerPaidDuties: 0,
      marketplaceAndPaymentFees: 0,
    })).toThrow("grossCollected")
  })
})
