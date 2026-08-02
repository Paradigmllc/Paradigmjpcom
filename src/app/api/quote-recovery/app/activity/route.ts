import { NextResponse } from "next/server"
import { getQuoteRecoveryIdentity, getQuoteRecoveryDb, quoteRecoveryHasPaidAccess, writeQuoteRecoveryAudit } from "@/lib/quote-recovery/auth"
import { quoteRecoveryActivitySchema, zodCommercialError } from "@/lib/quote-recovery/commercial-schemas"
import { quoteRecoveryJsonAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!quoteRecoveryJsonAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin or content type" }, { status: 403 })
  try {
    const identity = await getQuoteRecoveryIdentity()
    if (!identity) return NextResponse.json({ ok: false, error: "ログインが必要です" }, { status: 401 })
    if (!quoteRecoveryHasPaidAccess(identity)) return NextResponse.json({ ok: false, error: "有効な契約が必要です" }, { status: 402 })
    const parsed = quoteRecoveryActivitySchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: zodCommercialError(parsed.error) }, { status: 400 })
    const db = getQuoteRecoveryDb()
    const { data: quote, error: quoteError } = await db
      .from("quote_recovery_quotes")
      .select("id")
      .eq("id", parsed.data.quoteId)
      .eq("organization_id", identity.organization.id)
      .maybeSingle()
    if (quoteError) throw new Error(quoteError.message)
    if (!quote) return NextResponse.json({ ok: false, error: "案件が見つかりません" }, { status: 404 })
    const { data, error } = await db.from("quote_recovery_activities").insert({
      organization_id: identity.organization.id,
      quote_id: quote.id,
      created_by: identity.user.id,
      activity_type: parsed.data.activityType,
      note: parsed.data.note,
      occurred_at: parsed.data.occurredAt ?? new Date().toISOString(),
    }).select("id").single()
    if (error) throw new Error(error.message)
    await writeQuoteRecoveryAudit({ organizationId: identity.organization.id, actorUserId: identity.user.id, action: "quote.activity_created", targetType: "activity", targetId: data.id, metadata: { quote_id: quote.id, type: parsed.data.activityType } })
    return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
  } catch (error) {
    console.error("[quote-recovery/activity] failed:", error)
    return NextResponse.json({ ok: false, error: "活動履歴を保存できませんでした" }, { status: 500 })
  }
}
