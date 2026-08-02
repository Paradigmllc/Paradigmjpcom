import { NextResponse } from "next/server"
import { diagnoseQuote, diagnoseQuotes } from "@/lib/quote-recovery/diagnosis"
import type { QuoteInput } from "@/lib/quote-recovery/types"
import { getQuoteRecoveryIdentity, getQuoteRecoveryDb, quoteRecoveryHasPaidAccess, writeQuoteRecoveryAudit } from "@/lib/quote-recovery/auth"
import { quoteRecoveryImportSchema, zodCommercialError } from "@/lib/quote-recovery/commercial-schemas"
import { quoteRecoveryJsonAllowed } from "@/lib/quote-recovery/http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function monthStart(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`
}

export async function POST(request: Request) {
  if (!quoteRecoveryJsonAllowed(request)) return NextResponse.json({ ok: false, error: "Invalid request origin or content type" }, { status: 403 })
  const length = Number(request.headers.get("content-length") ?? "0")
  if (length > 2_500_000) return NextResponse.json({ ok: false, error: "CSVデータが大きすぎます" }, { status: 413 })
  try {
    const identity = await getQuoteRecoveryIdentity()
    if (!identity) return NextResponse.json({ ok: false, error: "ログインが必要です" }, { status: 401 })
    if (!quoteRecoveryHasPaidAccess(identity)) return NextResponse.json({ ok: false, error: "有効な契約が必要です", billingRequired: true }, { status: 402 })
    const parsed = quoteRecoveryImportSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: zodCommercialError(parsed.error) }, { status: 400 })
    const uniqueRows = Array.from(new Map(parsed.data.rows.map((row) => [row.quoteId, row])).values())
    const db = getQuoteRecoveryDb()
    const periodStart = monthStart()
    const { data: usage, error: usageError } = await db
      .from("quote_recovery_usage_monthly")
      .select("quote_row_count")
      .eq("organization_id", identity.organization.id)
      .eq("period_start", periodStart)
      .maybeSingle()
    if (usageError) throw new Error(usageError.message)
    const used = Number(usage?.quote_row_count ?? 0)
    if (used + uniqueRows.length > identity.organization.monthlyQuoteLimit) {
      return NextResponse.json({ ok: false, error: `月間上限${identity.organization.monthlyQuoteLimit.toLocaleString("ja-JP")}件を超えます`, limitExceeded: true }, { status: 409 })
    }

    const rows: QuoteInput[] = uniqueRows.map((row) => ({
      quoteId: row.quoteId,
      companyName: row.companyName,
      quoteDate: row.quoteDate,
      amount: row.amount,
      owner: row.owner ?? null,
      lastContactDate: row.lastContactDate ?? null,
      nextActionDate: row.nextActionDate ?? null,
      status: row.status ?? "open",
    }))
    const diagnosis = diagnoseQuotes(rows)
    const { data: importRow, error: importError } = await db.from("quote_recovery_imports").insert({
      organization_id: identity.organization.id,
      imported_by: identity.user.id,
      file_name: parsed.data.fileName,
      source_rows: parsed.data.rows.length,
      imported_rows: rows.length,
      rejected_rows: parsed.data.rows.length - rows.length,
      open_amount: diagnosis.openAmount,
      stale_amount: diagnosis.staleAmount,
    }).select("id").single()
    if (importError) throw new Error(importError.message)

    const quoteRows = rows.map((row) => {
      const diagnosed = diagnoseQuote(row)
      return {
        organization_id: identity.organization.id,
        import_id: importRow.id,
        external_quote_id: row.quoteId,
        customer_name: row.companyName,
        quote_date: row.quoteDate,
        amount: row.amount,
        owner_name: row.owner,
        last_contact_date: row.lastContactDate,
        next_action_date: row.nextActionDate,
        status: row.status,
        recovery_score: diagnosed.score,
        recovery_priority: diagnosed.priority,
        recovery_reasons: diagnosed.reasons,
        created_by: identity.user.id,
        updated_at: new Date().toISOString(),
      }
    })
    const { error: quoteError } = await db.from("quote_recovery_quotes").upsert(quoteRows, { onConflict: "organization_id,external_quote_id" })
    if (quoteError) throw new Error(quoteError.message)
    const { error: usageWriteError } = await db.rpc("quote_recovery_record_usage", {
      p_organization_id: identity.organization.id,
      p_period_start: periodStart,
      p_quote_rows: rows.length,
    })
    if (usageWriteError) throw new Error(usageWriteError.message)
    const { error: notificationError } = await db.from("quote_recovery_notifications").insert({
      organization_id: identity.organization.id,
      user_id: identity.user.id,
      notification_type: "import_completed",
      title: "見積CSVの取込が完了しました",
      message: `${rows.length}件を取込み、放置見積${diagnosis.staleAmount.toLocaleString("ja-JP")}円を検出しました。`,
      link: "/ja/quote-recovery/app?tab=quotes",
      delivery_status: { database: "delivered" },
    })
    if (notificationError) console.error("[quote-recovery/import] notification failed:", notificationError.message)
    await writeQuoteRecoveryAudit({
      organizationId: identity.organization.id,
      actorUserId: identity.user.id,
      action: "quotes.imported",
      targetType: "import",
      targetId: importRow.id,
      metadata: { imported_rows: rows.length, stale_amount: diagnosis.staleAmount },
    })
    return NextResponse.json({ ok: true, importId: importRow.id, diagnosis })
  } catch (error) {
    console.error("[quote-recovery/import] failed:", error)
    return NextResponse.json({ ok: false, error: "見積データを保存できませんでした" }, { status: 500 })
  }
}
