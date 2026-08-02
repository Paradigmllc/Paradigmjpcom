import { createHash } from "node:crypto"
import { notifyBothChannels } from "@/lib/notify"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"

export type StripeOperatorObject = {
  id: string
  payment_intent?: string | null
  payment_status?: string
  amount_total?: number
  currency?: string
  metadata?: Record<string, string>
}

function metadataValue(metadata: Record<string, string>, ...keys: string[]): string | null {
  for (const key of keys) if (metadata[key]?.trim()) return metadata[key].trim()
  return null
}

export async function recordJapanOperatorStripePayment(
  eventType: string,
  object: StripeOperatorObject,
  rawBody: string,
): Promise<{ handled: boolean; invoiceId?: string }> {
  const metadata = object.metadata ?? {}
  const caseId = metadataValue(metadata, "japanOperatorCaseId", "japan_operator_case_id", "operatorCaseId")
  if (!caseId) return { handled: false }
  const invoiceKind = metadataValue(metadata, "operatorInvoiceKind", "operator_invoice_kind") ?? "validation"
  if (!["validation", "launch", "retainer", "revenue_share", "expense", "adjustment"].includes(invoiceKind)) throw new Error("Invalid Japan operator invoice kind")
  const supabase = getServiceSalesSupabase()
  if (!supabase) throw new Error("Supabase service role not configured")
  const now = new Date().toISOString()
  const paid = eventType === "checkout.session.async_payment_succeeded" || object.payment_status === "paid"
  const contentSha256 = createHash("sha256").update(rawBody).digest("hex")
  const evidenceInsert = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_EVIDENCE).insert({
    case_id: caseId, stage: invoiceKind === "validation" ? "paid_validation" : "launch_sow",
    check_id: invoiceKind === "validation" ? "invoice_paid" : "validation_credit_applied",
    evidence_type: "payment", source_url: null, storage_path: null, recipient: "stripe", channel: "stripe_webhook",
    content_sha256: contentSha256, observed_at: now, verified_by_key: "automation:stripe", verified_by_email: null,
    verified_by_role: "automation", auth_source: "webhook", note: `Stripe ${eventType} verified for ${object.id}.`,
    detail: { stripe_session_id: object.id, payment_intent: object.payment_intent ?? null, payment_status: object.payment_status ?? null },
    idempotency_key: `stripe:${eventType}:${object.id}`,
  }).select("id").single()
  let evidence = evidenceInsert.data
  if (evidenceInsert.error?.code === "23505") {
    const existing = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_EVIDENCE).select("id").eq("idempotency_key", `stripe:${eventType}:${object.id}`).single()
    if (existing.error) throw new Error(existing.error.message)
    evidence = existing.data
  } else if (evidenceInsert.error) {
    throw new Error(evidenceInsert.error.message)
  }
  if (!evidence) throw new Error("Payment evidence could not be stored")

  let creditSourceId: string | null = metadataValue(metadata, "validationInvoiceId", "validation_invoice_id")
  let creditMinor = 0
  if (invoiceKind === "launch" && creditSourceId) {
    const source = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_INVOICES).select("case_id,amount_minor,status,paid_at").eq("id", creditSourceId).single()
    if (!source.data || source.data.case_id !== caseId || source.data.status !== "paid" || !source.data.paid_at || Date.now() - new Date(source.data.paid_at).getTime() > 30 * 86_400_000) {
      creditSourceId = null
    } else {
      creditMinor = Math.min(source.data.amount_minor, object.amount_total ?? 0)
    }
  }
  const { data: invoice, error: invoiceError } = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_INVOICES).upsert({
    case_id: caseId, invoice_kind: invoiceKind, provider: "stripe", external_invoice_id: object.id,
    external_payment_id: object.payment_intent ?? object.id, amount_minor: object.amount_total ?? 0,
    currency: (object.currency ?? "usd").toUpperCase(), status: paid ? "paid" : "open",
    issued_at: now, paid_at: paid ? now : null, validation_credit_source_id: creditSourceId,
    validation_credit_minor: creditMinor, evidence_id: evidence.id, actor_key: "automation:stripe",
    actor_email: null, actor_role: "automation", detail: { event_type: eventType }, updated_at: now,
  }, { onConflict: "provider,external_invoice_id" }).select("id").single()
  if (invoiceError || !invoice) throw new Error(invoiceError?.message ?? "Operator invoice could not be stored")
  const notification = await notifyBothChannels(`Japan代理店OS: Stripe入金 ${object.id}`, {
    title: "Japan代理店OS入金", message: `${invoiceKind} / ${(object.amount_total ?? 0).toLocaleString()} ${(object.currency ?? "usd").toUpperCase()}`,
    link: "/ja/admin/opportunity-briefs", type: "japan_operator_payment", region: "global", priority: 95,
    leadId: caseId, idempotencyKey: `operator-payment:${object.id}`,
  })
  if (!notification.ok) console.error("[japan-operator-stripe] dual notification degraded:", notification)
  return { handled: true, invoiceId: invoice.id }
}
