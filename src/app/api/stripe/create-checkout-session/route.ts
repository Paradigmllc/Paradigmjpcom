/**
 * POST /api/stripe/create-checkout-session — Sprint 10-C
 *
 * 役割: 動画サブスク / 代理店 WL plan の Stripe Checkout セッションを開始.
 *       公開 endpoint (認証なし)・客が LP の「購入」ボタンから直接叩く.
 *
 * Body:  { plan: "video_basic" | "video_pro" | "video_scale" | "agency" | "agency_white", email?: string }
 * 出力:  { ok, url? (Stripe Checkout URL), error? }
 *
 * 安全性: priceId は環境変数で管理 (frontend からの直接渡しを禁止).
 */

import { NextRequest, NextResponse } from "next/server"
import { createCheckoutSession } from "@/lib/stripe"
import { normalizeReportLocale } from "@/lib/sales/routing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ───── Plan → Stripe Price ID mapping ───── */

const PRICE_MAP: Record<string, string | undefined> = {
  video_basic: process.env.STRIPE_PRICE_VIDEO_BASIC,
  video_pro: process.env.STRIPE_PRICE_VIDEO_PRO,
  video_scale: process.env.STRIPE_PRICE_VIDEO_SCALE,
  agency: process.env.STRIPE_PRICE_AGENCY,
  agency_white: process.env.STRIPE_PRICE_AGENCY_WHITE,
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { plan?: string; email?: string; locale?: string }
    if (!body?.plan || typeof body.plan !== "string") {
      return NextResponse.json(
        { ok: false, error: "plan is required" },
        { status: 400 },
      )
    }
    const priceId = PRICE_MAP[body.plan]
    if (!priceId) {
      return NextResponse.json(
        { ok: false, error: `Unknown or unconfigured plan: ${body.plan}` },
        { status: 400 },
      )
    }
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com"
    const locale = normalizeReportLocale(body.locale, "jp")
    const result = await createCheckoutSession({
      priceId,
      customerEmail: body.email,
      successUrl: `${baseUrl}/${locale}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/${locale}/${body.plan.startsWith("video") ? "video" : "agency"}`,
      mode: "subscription",
      metadata: { plan: body.plan, locale },
    })
    if (!result.ok || !result.data) {
      return NextResponse.json(
        { ok: false, error: result.error ?? "Checkout failed" },
        { status: 500 },
      )
    }
    return NextResponse.json({ ok: true, url: result.data.url, session_id: result.data.id })
  } catch (e) {
    console.error("[stripe-checkout] create session failed:", e)
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
