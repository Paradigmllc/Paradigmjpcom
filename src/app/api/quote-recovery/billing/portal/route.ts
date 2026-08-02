import { NextResponse } from "next/server"
import { getQuoteRecoveryIdentity, quoteRecoveryCanManage, writeQuoteRecoveryAudit } from "@/lib/quote-recovery/auth"
import { getQuoteRecoveryStripe, quoteRecoveryPortalConfiguration } from "@/lib/quote-recovery/stripe"
import { quoteRecoveryMutationAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!quoteRecoveryMutationAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin" }, { status: 403 })
  try {
    const identity = await getQuoteRecoveryIdentity()
    if (!identity) return NextResponse.json({ ok: false, error: "ログインが必要です" }, { status: 401 })
    if (!quoteRecoveryCanManage(identity)) return NextResponse.json({ ok: false, error: "請求情報を管理する権限がありません" }, { status: 403 })
    if (!identity.organization.stripeCustomerId) return NextResponse.json({ ok: false, error: "Stripe顧客情報がまだ作成されていません" }, { status: 409 })
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://paradigmjp.com").replace(/\/$/, "")
    const configuration = await quoteRecoveryPortalConfiguration()
    const session = await getQuoteRecoveryStripe().billingPortal.sessions.create({
      customer: identity.organization.stripeCustomerId,
      configuration,
      return_url: `${baseUrl}/ja/quote-recovery/app?tab=billing`,
    })
    await writeQuoteRecoveryAudit({
      organizationId: identity.organization.id,
      actorUserId: identity.user.id,
      action: "billing.portal_opened",
      targetType: "organization",
      targetId: identity.organization.id,
    })
    return NextResponse.json({ ok: true, url: session.url })
  } catch (error) {
    console.error("[quote-recovery/billing/portal] failed:", error)
    return NextResponse.json({ ok: false, error: "請求ポータルを開けませんでした" }, { status: 500 })
  }
}
