import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import type Stripe from "stripe"
import { getQuoteRecoveryDb } from "@/lib/quote-recovery/auth"
import { QUOTE_RECOVERY_PLANS, type QuoteRecoveryPlanCode } from "@/lib/quote-recovery/plans"
import { getQuoteRecoveryStripe, quoteRecoveryWebhookSecret } from "@/lib/quote-recovery/stripe"
import { notifyBothChannels } from "@/lib/notify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SubscriptionSnapshot = Stripe.Subscription & { current_period_end?: number }

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null
}

function subscriptionPlan(subscription: SubscriptionSnapshot): QuoteRecoveryPlanCode | null {
  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) return null
  for (const [plan, definition] of Object.entries(QUOTE_RECOVERY_PLANS)) {
    if (process.env[definition.priceEnv]?.trim() === priceId) return plan as QuoteRecoveryPlanCode
  }
  return null
}

function subscriptionStatus(status: Stripe.Subscription.Status): "incomplete" | "active" | "past_due" | "unpaid" | "canceled" | "paused" {
  if (status === "active" || status === "trialing") return "active"
  if (status === "past_due") return "past_due"
  if (status === "unpaid") return "unpaid"
  if (status === "canceled") return "canceled"
  if (status === "paused") return "paused"
  return "incomplete"
}

async function syncSubscription(subscription: SubscriptionSnapshot, eventCreated: number) {
  const db = getQuoteRecoveryDb()
  const plan = subscriptionPlan(subscription)
  const definition = plan ? QUOTE_RECOVERY_PLANS[plan] : null
  const customer = customerId(subscription.customer)
  const organizationId = subscription.metadata.organization_id
  const update = {
    stripe_customer_id: customer,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0]?.price.id ?? null,
    subscription_status: subscriptionStatus(subscription.status),
    ...(plan ? { plan } : {}),
    ...(definition ? { seat_limit: definition.seatLimit, monthly_quote_limit: definition.monthlyQuoteLimit } : {}),
    current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    last_stripe_event_created: eventCreated,
    updated_at: new Date().toISOString(),
  }
  let query = db.from("quote_recovery_organizations").update(update).lte("last_stripe_event_created", eventCreated)
  query = organizationId ? query.eq("id", organizationId) : query.eq("stripe_customer_id", customer ?? "__missing__")
  const { data, error } = await query.select("id,name,subscription_status").maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

async function processStripeEvent(event: Stripe.Event) {
  const stripe = getQuoteRecoveryStripe()
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object
    if (session.metadata?.product !== "quote_recovery") return null
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id
    if (!subscriptionId) throw new Error("Checkout completed without a subscription")
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return syncSubscription(subscription as SubscriptionSnapshot, event.created)
  }
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted" || event.type === "customer.subscription.paused" || event.type === "customer.subscription.resumed") {
    const subscription = event.data.object as SubscriptionSnapshot
    if (subscription.metadata.product !== "quote_recovery") return null
    return syncSubscription(subscription, event.created)
  }
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object
    const customer = customerId(invoice.customer)
    if (!customer) return null
    const status = event.type === "invoice.paid" ? "active" : "past_due"
    const { data, error } = await getQuoteRecoveryDb()
      .from("quote_recovery_organizations")
      .update({ subscription_status: status, last_stripe_event_created: event.created, updated_at: new Date().toISOString() })
      .eq("stripe_customer_id", customer)
      .lte("last_stripe_event_created", event.created)
      .select("id,name,subscription_status")
      .maybeSingle()
    if (error) throw new Error(error.message)
    return data
  }
  return null
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  if (!signature) return NextResponse.json({ ok: false, error: "Missing Stripe signature" }, { status: 400 })
  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = getQuoteRecoveryStripe().webhooks.constructEvent(rawBody, signature, quoteRecoveryWebhookSecret())
  } catch (error) {
    console.error("[quote-recovery/stripe-webhook] signature verification failed:", error)
    return NextResponse.json({ ok: false, error: "Invalid Stripe signature" }, { status: 400 })
  }

  const db = getQuoteRecoveryDb()
  const digest = createHash("sha256").update(rawBody).digest("hex")
  const object = event.data.object as { id?: string }
  const { data: existing, error: existingError } = await db
    .from("quote_recovery_stripe_events")
    .select("processed_at")
    .eq("event_id", event.id)
    .maybeSingle()
  if (existingError) return NextResponse.json({ ok: false, error: "Webhook ledger lookup failed" }, { status: 500 })
  if (existing?.processed_at) return NextResponse.json({ ok: true, duplicate: true })
  const { error: ledgerError } = await db.from("quote_recovery_stripe_events").upsert({
    event_id: event.id,
    event_type: event.type,
    object_id: object.id ?? null,
    payload_digest: digest,
    event_created: event.created,
    processing_error: null,
  }, { onConflict: "event_id" })
  if (ledgerError) return NextResponse.json({ ok: false, error: "Webhook ledger write failed" }, { status: 500 })

  try {
    const organization = await processStripeEvent(event)
    const { error: completeError } = await db.from("quote_recovery_stripe_events").update({ processed_at: new Date().toISOString(), processing_error: null }).eq("event_id", event.id)
    if (completeError) throw new Error(completeError.message)
    if (organization && (event.type === "invoice.payment_failed" || event.type === "checkout.session.completed")) {
      await notifyBothChannels(`Quote Recovery billing: ${organization.name}`, {
        title: event.type === "invoice.payment_failed" ? "Quote Recovery 決済失敗" : "Quote Recovery 新規契約",
        message: `${organization.name} / ${organization.subscription_status}`,
        link: "https://paradigmjp.com/ja/quote-recovery/app?tab=billing",
        type: "quote_recovery_billing",
        idempotencyKey: event.id,
      })
    }
    return NextResponse.json({ ok: true, received: event.type })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[quote-recovery/stripe-webhook] processing failed:", error)
    await db.from("quote_recovery_stripe_events").update({ processing_error: message.slice(0, 2000) }).eq("event_id", event.id)
    return NextResponse.json({ ok: false, error: "Webhook processing failed" }, { status: 500 })
  }
}
