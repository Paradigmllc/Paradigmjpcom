import Stripe from "stripe"

interface StripeResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

let stripeClient: Stripe | null = null

function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not configured")
  if (!stripeClient) {
    stripeClient = new Stripe(apiKey, {
      maxNetworkRetries: 2,
      timeout: 20_000,
      telemetry: false,
    })
  }
  return stripeClient
}

export interface CheckoutSessionInput {
  priceId: string
  customerEmail?: string
  successUrl: string
  cancelUrl: string
  mode?: "subscription" | "payment"
  metadata?: Record<string, string>
  idempotencyKey?: string
}

export async function createCheckoutSession(
  input: CheckoutSessionInput,
): Promise<StripeResponse<{ id: string; url: string }>> {
  try {
    const session = await getStripeClient().checkout.sessions.create({
      mode: input.mode ?? "subscription",
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer_email: input.customerEmail,
      metadata: input.metadata,
      payment_intent_data: input.mode === "payment"
        ? {
            receipt_email: input.customerEmail,
            metadata: input.metadata,
          }
        : undefined,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    }, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined)
    if (!session.url) return { ok: false, error: "Stripe did not return a Checkout URL" }
    return { ok: true, data: { id: session.id, url: session.url } }
  } catch (error) {
    console.error("[stripe] Checkout Session creation failed", error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function verifyStripeWebhook(
  rawBody: string,
  signature: string,
  webhookSecret: string,
): Promise<{ ok: boolean; event?: Stripe.Event; error?: string }> {
  try {
    const event = await getStripeClient().webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    )
    return { ok: true, event }
  } catch (error) {
    console.error("[stripe] Webhook signature verification failed", error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export function stripeIsConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}
