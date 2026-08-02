import { getQuoteRecoveryIdentity, getQuoteRecoveryDb } from "@/lib/quote-recovery/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export async function GET() {
  try {
    const identity = await getQuoteRecoveryIdentity()
    if (!identity) return Response.json({ ok: false, error: "ログインが必要です" }, { status: 401 })
    const { data, error } = await getQuoteRecoveryDb()
      .from("quote_recovery_quotes")
      .select("external_quote_id,customer_name,quote_date,amount,owner_name,last_contact_date,next_action_date,status,recovery_score,recovery_priority,recovery_reasons,updated_at")
      .eq("organization_id", identity.organization.id)
      .order("updated_at", { ascending: false })
      .limit(10_000)
    if (error) throw new Error(error.message)
    const header = ["見積番号", "顧客名", "見積日", "見積金額", "担当者", "最終接触日", "次回アクション日", "ステータス", "回収スコア", "優先度", "判定理由", "更新日時"]
    const rows = (data ?? []).map((row) => [row.external_quote_id, row.customer_name, row.quote_date, row.amount, row.owner_name, row.last_contact_date, row.next_action_date, row.status, row.recovery_score, row.recovery_priority, Array.isArray(row.recovery_reasons) ? row.recovery_reasons.join(" / ") : "", row.updated_at])
    const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="quote-recovery-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    console.error("[quote-recovery/export] failed:", error)
    return Response.json({ ok: false, error: "エクスポートに失敗しました" }, { status: 500 })
  }
}
