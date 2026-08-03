import { NextResponse } from "next/server"
import { z } from "zod"
import { getQuoteRecoveryDb, getQuoteRecoveryIdentity, quoteRecoveryHasPaidAccess, writeQuoteRecoveryAudit } from "@/lib/quote-recovery/auth"
import { quoteRecoveryJsonAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  if (!quoteRecoveryJsonAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin or content type" }, { status: 403 })
  try {
    const identity = await getQuoteRecoveryIdentity()
    if (!identity) return NextResponse.json({ ok: false, error: "ログインが必要です" }, { status: 401 })
    if (!quoteRecoveryHasPaidAccess(identity)) return NextResponse.json({ ok: false, error: "有効な契約が必要です" }, { status: 402 })
    const parsedId = z.string().uuid().safeParse((await params).notificationId)
    if (!parsedId.success) return NextResponse.json({ ok: false, error: "通知IDを確認してください" }, { status: 400 })
    const db = getQuoteRecoveryDb()
    const { data, error } = await db.from("quote_recovery_notifications").update({ read_at: new Date().toISOString() }).eq("id", parsedId.data).eq("organization_id", identity.organization.id).or(`user_id.is.null,user_id.eq.${identity.user.id}`).select("id").maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ ok: false, error: "通知が見つかりません" }, { status: 404 })
    await writeQuoteRecoveryAudit({ organizationId: identity.organization.id, actorUserId: identity.user.id, action: "notification.read", targetType: "notification", targetId: data.id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[quote-recovery/notifications] update failed:", error)
    return NextResponse.json({ ok: false, error: "通知を更新できませんでした" }, { status: 500 })
  }
}
