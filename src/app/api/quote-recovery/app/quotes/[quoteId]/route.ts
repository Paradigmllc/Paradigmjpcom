import { NextResponse } from "next/server"
import { getQuoteRecoveryDb, getQuoteRecoveryIdentity, quoteRecoveryHasPaidAccess, writeQuoteRecoveryAudit } from "@/lib/quote-recovery/auth"
import { quoteRecoveryQuoteUpdateSchema, zodCommercialError } from "@/lib/quote-recovery/commercial-schemas"
import { quoteRecoveryJsonAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Context = { params: Promise<{ quoteId: string }> }

export async function PATCH(request: Request, context: Context) {
  if (!quoteRecoveryJsonAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin or content type" }, { status: 403 })
  try {
    const identity = await getQuoteRecoveryIdentity()
    if (!identity) return NextResponse.json({ ok: false, error: "ログインが必要です" }, { status: 401 })
    if (!quoteRecoveryHasPaidAccess(identity)) return NextResponse.json({ ok: false, error: "有効な契約が必要です" }, { status: 402 })
    const parsed = quoteRecoveryQuoteUpdateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: zodCommercialError(parsed.error) }, { status: 400 })
    const { quoteId } = await context.params
    const db = getQuoteRecoveryDb()
    const { data: current, error: lookupError } = await db.from("quote_recovery_quotes")
      .select("id,status,owner_name,next_action_date")
      .eq("id", quoteId)
      .eq("organization_id", identity.organization.id)
      .maybeSingle()
    if (lookupError) throw new Error(lookupError.message)
    if (!current) return NextResponse.json({ ok: false, error: "案件が見つかりません" }, { status: 404 })

    const { data: quote, error: updateError } = await db.from("quote_recovery_quotes").update({
      owner_name: parsed.data.ownerName || null,
      next_action_date: parsed.data.nextActionDate,
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    }).eq("id", quoteId).eq("organization_id", identity.organization.id)
      .select("id,status,owner_name,next_action_date,updated_at").single()
    if (updateError) throw new Error(updateError.message)

    const changes = {
      status: [current.status, quote.status],
      owner_name: [current.owner_name, quote.owner_name],
      next_action_date: [current.next_action_date, quote.next_action_date],
    }
    if (parsed.data.note) {
      const { error: activityError } = await db.from("quote_recovery_activities").insert({
        organization_id: identity.organization.id,
        quote_id: quoteId,
        created_by: identity.user.id,
        activity_type: parsed.data.activityType ?? "note",
        note: parsed.data.note,
        occurred_at: new Date().toISOString(),
      })
      if (activityError) throw new Error(activityError.message)
    }
    await writeQuoteRecoveryAudit({ organizationId: identity.organization.id, actorUserId: identity.user.id, action: "quote.updated", targetType: "quote", targetId: quoteId, metadata: changes })
    return NextResponse.json({ ok: true, quote })
  } catch (error) {
    console.error("[quote-recovery/quote-update] failed:", error)
    return NextResponse.json({ ok: false, error: "案件を更新できませんでした" }, { status: 500 })
  }
}
