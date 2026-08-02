export const QUOTE_RECOVERY_PLANS = {
  starter: {
    code: "starter",
    name: "Starter",
    monthlyPriceYen: 29_800,
    seatLimit: 3,
    monthlyQuoteLimit: 2_000,
    priceEnv: "STRIPE_PRICE_QUOTE_RECOVERY_STARTER",
  },
  team: {
    code: "team",
    name: "Team",
    monthlyPriceYen: 49_800,
    seatLimit: 10,
    monthlyQuoteLimit: 10_000,
    priceEnv: "STRIPE_PRICE_QUOTE_RECOVERY_TEAM",
  },
} as const

export type QuoteRecoveryPlanCode = keyof typeof QUOTE_RECOVERY_PLANS

export function isQuoteRecoveryPlan(value: unknown): value is QuoteRecoveryPlanCode {
  return typeof value === "string" && value in QUOTE_RECOVERY_PLANS
}

export function priceIdForPlan(plan: QuoteRecoveryPlanCode): string {
  const definition = QUOTE_RECOVERY_PLANS[plan]
  const value = process.env[definition.priceEnv]?.trim()
  if (!value) throw new Error(`${definition.priceEnv} is not configured`)
  if (!value.startsWith("price_")) throw new Error(`${definition.priceEnv} is not a Stripe Price ID`)
  return value
}
