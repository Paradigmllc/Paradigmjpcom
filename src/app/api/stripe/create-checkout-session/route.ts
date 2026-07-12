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
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  await req.text().catch((error: unknown) => {
    console.error("[stripe-checkout] retired endpoint body read failed:", error)
  })
  return NextResponse.json(
    {
      ok: false,
      error: "Legacy Stripe checkout is retired. Apply for the fixed Japan Entry package at /en/contact?intent=japan-entry.",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  )
}
