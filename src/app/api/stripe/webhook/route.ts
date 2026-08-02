/**
 * POST /api/stripe/webhook — Sprint 10-C
 *
 * 役割: Stripe Webhook を受信し、subscription 状態を sales_customers に同期。
 *       署名検証 (HMAC-SHA256) で正当性を確認.
 *
 * 設定:
 *   - Stripe Dashboard で webhook endpoint を https://paradigmjp.com/api/stripe/webhook に登録
 *   - 受信イベント: checkout.session.completed / customer.subscription.{created,updated,deleted}
 *   - Coolify env に STRIPE_WEBHOOK_SECRET=whsec_... 投入
 *
 * 受信時の挙動:
 *   - checkout.session.completed: 新規顧客 (sales_customers.contract_status='トライアル')
 *   - subscription.updated:        更新 (next_invoice_date など)
 *   - subscription.deleted:        解約 (contract_status='解約済')
 */

import { NextRequest, NextResponse } from "next/server"
import { verifyStripeWebhook } from "@/lib/stripe"
import { createCustomer } from "@/lib/sales/customers"
import { getServiceSupabase } from "@/lib/supabase"
import type { ContractStatus, ContractProduct } from "@/lib/sales/types"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface StripeEvent {
  type: string
  data: {
    object: {
      id: string
      customer_email?: string | null
      customer?: string
      subscription?: string
      status?: string
      payment_status?: string
      customer_details?: { email?: string | null } | null
      payment_intent?: string | { id: string } | null
      current_period_end?: number
      metadata?: Record<string, string>
      amount_total?: number
      currency?: string
    }
  }
}

const PLAN_TO_AMOUNT: Record<string, number> = {
  video_basic: 300_000,
  video_pro: 500_000,
  video_scale: 800_000,
  agency: 1_200_000, // $8,000 ≈ ¥1.2M
  agency_white: 2_250_000, // $15,000 ≈ ¥2.25M
}

const PLAN_TO_PRODUCTS: Record<string, ContractProduct[]> = {
  video_basic: ["動画サブスク"],
  video_pro: ["動画サブスク"],
  video_scale: ["動画サブスク"],
  agency: ["動画サブスク"],
  agency_white: ["動画サブスク"],
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 503 },
    )
  }

  const signature = req.headers.get("stripe-signature") ?? ""
  if (!signature) {
    return NextResponse.json(
      { ok: false, error: "Missing stripe-signature header" },
      { status: 401 },
    )
  }

  const rawBody = await req.text()
  const verification = await verifyStripeWebhook(rawBody, signature, secret)
  if (!verification.ok || !verification.event) {
    return NextResponse.json(
      { ok: false, error: verification.error ?? "Invalid signature" },
      { status: 401 },
    )
  }

  const event = verification.event as StripeEvent
  const obj = event.data.object

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const { handlePetMovieCheckoutCompleted } = await import("@/lib/pet-life-movie/render")
        if (await handlePetMovieCheckoutCompleted(obj)) break
        // 新規顧客作成
        const plan = obj.metadata?.plan ?? ""
        const isWl = plan.startsWith("agency")
        await createCustomer({
          customer_name: obj.customer_email ?? "Anonymous customer",
          contract_products: PLAN_TO_PRODUCTS[plan] ?? ["動画サブスク"],
          monthly_amount: PLAN_TO_AMOUNT[plan] ?? 0,
          contract_start: new Date().toISOString().slice(0, 10),
          contract_status: "トライアル",
          health: "🟢 良好",
          is_white_label: isWl,
          assigned_to: null,
        })
        break
      }
      case "checkout.session.async_payment_succeeded": {
        const { handlePetMovieCheckoutCompleted } = await import("@/lib/pet-life-movie/render")
        await handlePetMovieCheckoutCompleted(obj)
        break
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const { handlePetMovieCheckoutFailed } = await import("@/lib/pet-life-movie/render")
        await handlePetMovieCheckoutFailed(obj, event.type.endsWith("expired") ? "expired" : "failed")
        break
      }
      case "charge.refunded": {
        const { handlePetMovieRefund } = await import("@/lib/pet-life-movie/render")
        await handlePetMovieRefund(obj)
        break
      }
      case "customer.subscription.updated": {
        // 状態同期
        const sb = getServiceSupabase()
        if (!sb) break
        const nextInvoiceDate = obj.current_period_end
          ? new Date(obj.current_period_end * 1000).toISOString().slice(0, 10)
          : null
        let status: ContractStatus = "継続中"
        if (obj.status === "canceled") status = "解約済"
        else if (obj.status === "past_due") status = "解約予告"
        else if (obj.status === "trialing") status = "トライアル"
        await sb
          .from(DB_TABLES.SALES_CUSTOMERS)
          .update({
            contract_status: status,
            next_invoice_date: nextInvoiceDate,
          })
          .eq("meta->>stripe_subscription_id", obj.subscription ?? obj.id)
        break
      }
      case "customer.subscription.deleted": {
        const sb = getServiceSupabase()
        if (!sb) break
        await sb
          .from(DB_TABLES.SALES_CUSTOMERS)
          .update({ contract_status: "解約済" })
          .eq("meta->>stripe_subscription_id", obj.subscription ?? obj.id)
        break
      }
      default:
        // 未知の event type は無視 (Stripe は将来の event 互換性を要求しない)
        break
    }
    return NextResponse.json({ ok: true, received: event.type })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
