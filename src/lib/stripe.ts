/**
 * lib/stripe.ts — Stripe SDK wrapper (Sprint 10-C)
 *
 * 役割: 動画サブスク + WL plan 決済の Stripe Checkout / Webhook 処理。
 *       Stripe → Wise USD 口座への自動 payout (Sprint 9 env で設定済).
 *
 * 設計:
 *   1. Stripe SDK (@stripe/stripe-js は client 専用 / `stripe` パッケージは server)
 *   2. env 未設定なら fail-soft (no-op + error)
 *   3. Webhook 署名検証は `stripe.webhooks.constructEvent` で
 *
 * Note: 本実装では Stripe SDK ('stripe' パッケージ) を install せず、
 *       fetch ベースで最小実装。後で SDK install する場合は wrapper を入れ替える.
 */

const STRIPE_API = "https://api.stripe.com/v1"

const apiKey = () => process.env.STRIPE_SECRET_KEY?.trim()

interface StripeResponse<T> {
  ok: boolean
  data?: T
  error?: string
}

async function stripeFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<StripeResponse<T>> {
  const key = apiKey()
  if (!key) return { ok: false, error: "STRIPE_SECRET_KEY not set" }
  try {
    const res = await fetch(`${STRIPE_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      const text = await res.text().catch((error) => {
        console.error("[stripe] error response body could not be read:", error)
        return ""
      })
      return { ok: false, error: text || res.statusText }
    }
    const data = (await res.json()) as T
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/* ───── Checkout Session 作成 ───── */

export interface CheckoutSessionInput {
  priceId: string // Stripe Price ID (動画サブスク Pro 等)
  customerEmail?: string
  successUrl: string
  cancelUrl: string
  mode?: "subscription" | "payment"
  metadata?: Record<string, string>
}

export async function createCheckoutSession(
  input: CheckoutSessionInput,
): Promise<StripeResponse<{ id: string; url: string }>> {
  const params = new URLSearchParams()
  params.set("mode", input.mode ?? "subscription")
  params.set("line_items[0][price]", input.priceId)
  params.set("line_items[0][quantity]", "1")
  params.set("success_url", input.successUrl)
  params.set("cancel_url", input.cancelUrl)
  if (input.customerEmail) params.set("customer_email", input.customerEmail)
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) {
      params.set(`metadata[${k}]`, v)
    }
  }
  return stripeFetch<{ id: string; url: string }>("/checkout/sessions", {
    method: "POST",
    body: params.toString(),
  })
}

/* ───── Webhook 署名検証 ───── */

/**
 * Stripe Webhook signature verification (HMAC-SHA256).
 * stripe.webhooks.constructEvent の最小再実装.
 */
export async function verifyStripeWebhook(
  rawBody: string,
  signature: string,
  webhookSecret: string,
  toleranceSec: number = 300,
): Promise<{ ok: boolean; event?: unknown; error?: string }> {
  try {
    // Parse Stripe-Signature header: "t=1492774577,v1=abc123..."
    const parts = signature.split(",").reduce<Record<string, string>>((acc, p) => {
      const [k, v] = p.split("=")
      if (k && v) acc[k] = v
      return acc
    }, {})
    const timestamp = parts.t
    const expectedSig = parts.v1
    if (!timestamp || !expectedSig) {
      return { ok: false, error: "Invalid signature header" }
    }
    const tsNum = Number.parseInt(timestamp, 10)
    if (Math.abs(Date.now() / 1000 - tsNum) > toleranceSec) {
      return { ok: false, error: "Timestamp outside tolerance" }
    }
    // HMAC-SHA256
    const signedPayload = `${timestamp}.${rawBody}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload))
    const sigHex = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
    if (sigHex !== expectedSig) {
      return { ok: false, error: "Signature mismatch" }
    }
    return { ok: true, event: JSON.parse(rawBody) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export function stripeIsConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}
