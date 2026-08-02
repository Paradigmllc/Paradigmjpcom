import Stripe from "stripe"
import { QUOTE_RECOVERY_PLANS, priceIdForPlan } from "./plans"

let stripeClient: Stripe | null = null

export function getQuoteRecoveryStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured")
  if (process.env.NODE_ENV === "production" && !secretKey.startsWith("sk_live_")) {
    throw new Error("Production requires a Stripe live secret key")
  }
  stripeClient ??= new Stripe(secretKey, {
    appInfo: { name: "Paradigm Quote Recovery", version: "1.0.0" },
    maxNetworkRetries: 2,
    timeout: 20_000,
  })
  return stripeClient
}

export function quoteRecoveryWebhookSecret(): string {
  const secret = process.env.STRIPE_QUOTE_RECOVERY_WEBHOOK_SECRET?.trim()
  if (!secret) throw new Error("STRIPE_QUOTE_RECOVERY_WEBHOOK_SECRET is not configured")
  if (!secret.startsWith("whsec_")) throw new Error("Stripe webhook secret is invalid")
  return secret
}

export async function quoteRecoveryPortalConfiguration(): Promise<string> {
  const stripe = getQuoteRecoveryStripe()
  const configurations = await stripe.billingPortal.configurations.list({ active: true, limit: 100 })
  const existing = configurations.data.find((configuration) => configuration.business_profile.headline === "Quote Recovery 請求管理")
  if (existing) return existing.id

  const planEntries = await Promise.all(Object.keys(QUOTE_RECOVERY_PLANS).map(async (plan) => {
    const priceId = priceIdForPlan(plan as keyof typeof QUOTE_RECOVERY_PLANS)
    const price = await stripe.prices.retrieve(priceId)
    const productId = typeof price.product === "string" ? price.product : price.product.id
    return { product: productId, prices: [priceId] }
  }))
  const configuration = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Quote Recovery 請求管理",
      privacy_policy_url: "https://paradigmjp.com/ja/privacy",
      terms_of_service_url: "https://paradigmjp.com/ja/terms",
    },
    features: {
      customer_update: { enabled: true, allowed_updates: ["address", "email", "tax_id"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: { enabled: true, options: ["too_expensive", "missing_features", "switched_service", "unused", "other"] },
      },
      subscription_update: { enabled: true, default_allowed_updates: ["price"], products: planEntries },
    },
  })
  return configuration.id
}
