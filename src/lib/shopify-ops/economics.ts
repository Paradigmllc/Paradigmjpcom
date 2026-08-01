export const SHOPIFY_OPS_ASSUMPTIONS = {
  exchangeRateJpyPerUsd: 160,
  freeShippingThresholdUsd: 120,
  internationalShippingJpy: 2_040,
  warehouseHandlingJpy: 900,
  paymentFeeRate: 0.035,
  returnAndDamageReserveRate: 0.04,
  customsReserveRate: 0.015,
} as const

export type ProductEconomicsInput = {
  priceUsd: number
  procurementCostJpy: number
  domesticShippingJpy: number
}

export type ProductEconomics = {
  revenueJpy: number
  estimatedVariableCostJpy: number
  estimatedProfitJpy: number
  estimatedMarginPercent: number
}

export function calculateProductEconomics(input: ProductEconomicsInput): ProductEconomics {
  const revenueJpy = Math.round(input.priceUsd * SHOPIFY_OPS_ASSUMPTIONS.exchangeRateJpyPerUsd)
  if (revenueJpy <= 0) {
    return { revenueJpy: 0, estimatedVariableCostJpy: 0, estimatedProfitJpy: 0, estimatedMarginPercent: 0 }
  }

  const internationalShipping = input.priceUsd >= SHOPIFY_OPS_ASSUMPTIONS.freeShippingThresholdUsd
    ? SHOPIFY_OPS_ASSUMPTIONS.internationalShippingJpy
    : 0
  const percentageCosts = Math.round(
    revenueJpy * (
      SHOPIFY_OPS_ASSUMPTIONS.paymentFeeRate
      + SHOPIFY_OPS_ASSUMPTIONS.returnAndDamageReserveRate
      + SHOPIFY_OPS_ASSUMPTIONS.customsReserveRate
    ),
  )
  const estimatedVariableCostJpy = Math.max(0,
    input.procurementCostJpy
    + input.domesticShippingJpy
    + SHOPIFY_OPS_ASSUMPTIONS.warehouseHandlingJpy
    + internationalShipping
    + percentageCosts,
  )
  const estimatedProfitJpy = revenueJpy - estimatedVariableCostJpy
  const estimatedMarginPercent = Math.round((estimatedProfitJpy / revenueJpy) * 1_000) / 10

  return { revenueJpy, estimatedVariableCostJpy, estimatedProfitJpy, estimatedMarginPercent }
}

export function calculateStoreProfitJpy(revenueUsd: number, variableCostJpy: number): number {
  return Math.round(revenueUsd * SHOPIFY_OPS_ASSUMPTIONS.exchangeRateJpyPerUsd) - variableCostJpy
}
