import { NextResponse } from "next/server"
import { z } from "zod"
import { getQuoteRecoveryIdentity, quoteRecoveryCanManage, writeQuoteRecoveryAudit } from "@/lib/quote-recovery/auth"
import { isQuoteRecoveryPlan, priceIdForPlan, QUOTE_RECOVERY_PLANS } from "@/lib/quote-recovery/plans"
import { getQuoteRecoveryStripe } from "@/lib/quote-recovery/stripe"
import { quoteRecoveryJsonAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const schema = z.object({ plan: z.string() })

export async function POST(request: Request) {
  if (!quoteRecoveryJsonAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin or content type" }, { status: 403 })
  try {
    const identity = await getQuoteRecoveryIdentity()
    if (!identity) return NextResponse.json({ ok: false, error: "ログインが必要です" }, { status: 401 })
    if (!quoteRecoveryCanManage(identity)) return NextResponse.json({ ok: false, error: "契約を変更する権限がありません" }, { status: 403 })
    const parsed = schema.safeParse(await request.json())
    if (!parsed.success || !isQuoteRecoveryPlan(parsed.data.plan)) {
      return NextResponse.json({ ok: false, error: "プランを確認してください" }, { status: 400 })
    }
    if (identity.organization.subscriptionStatus === "active") {
      return NextResponse.json({ ok: false, error: "契約中のプラン変更は請求ポータルから行ってください" }, { status: 409 })
    }
    const plan = parsed.data.plan
    const definition = QUOTE_RECOVERY_PLANS[plan]
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com").replace(/\/$/, "")
    const stripe = getQuoteRecoveryStripe()
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: identity.organization.stripeCustomerId ?? undefined,
      customer_email: identity.organization.stripeCustomerId ? undefined : identity.user.email,
      client_reference_id: identity.organization.id,
      line_items: [{ price: priceIdForPlan(plan), quantity: 1 }],
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      allow_promotion_codes: true,
      locale: "ja",
      success_url: `${baseUrl}/ja/quote-recovery/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/ja/quote-recovery/app?checkout=canceled`,
      metadata: {
        product: "quote_recovery",
        organization_id: identity.organization.id,
        user_id: identity.user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          product: "quote_recovery",
          organization_id: identity.organization.id,
          plan,
        },
      },
    }, {
      idempotencyKey: `qr-checkout-${identity.organization.id}-${plan}-${new Date().toISOString().slice(0, 13)}`,
    })
    if (!session.url) throw new Error("Stripe Checkout URL was not returned")
    await writeQuoteRecoveryAudit({
      organizationId: identity.organization.id,
      actorUserId: identity.user.id,
      action: "billing.checkout_created",
      targetType: "checkout_session",
      targetId: session.id,
      metadata: { plan, amount_yen: definition.monthlyPriceYen },
    })
    return NextResponse.json({ ok: true, url: session.url })
  } catch (error) {
    console.error("[quote-recovery/billing/checkout] failed:", error)
    return NextResponse.json({ ok: false, error: "決済画面を開始できませんでした" }, { status: 500 })
  }
}
