import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { runCustomerSuccessHandoff } from "@/lib/sales/customer-handoff"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function child(record: JsonRecord, key: string): JsonRecord {
  const value = record[key]
  return isRecord(value) ? value : {}
}

function text(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim().length > 0) return value.trim()
    if (typeof value === "number") return String(value)
  }
  return null
}

function statusFromDocuseal(value: string | null): string {
  const status = value?.toLowerCase() ?? ""
  if (status.includes("complete") || status.includes("signed")) return "signed"
  if (status.includes("partial")) return "partially_signed"
  if (status.includes("cancel") || status.includes("decline")) return "cancelled"
  if (status.includes("expire")) return "expired"
  if (status.includes("sent") || status.includes("open") || status.includes("view")) return "sent"
  return "draft"
}

function firstSubmitter(payload: JsonRecord): JsonRecord {
  const submitters = payload.submitters
  if (Array.isArray(submitters) && isRecord(submitters[0])) return submitters[0]
  return child(payload, "submitter")
}

function signedAt(payload: JsonRecord, submitter: JsonRecord): string | null {
  return text(payload, ["completed_at", "signed_at"]) ?? text(submitter, ["completed_at", "signed_at"])
}

export async function POST(req: NextRequest) {
  const auth = authorizeWebhookRequest(req.headers)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase service role not configured" }, { status: 503 })

  let body: JsonRecord
  try {
    const parsed = await req.json()
    if (!isRecord(parsed)) return NextResponse.json({ ok: false, error: "JSON object required" }, { status: 400 })
    body = parsed
  } catch (error) {
    console.error("[docuseal-webhook] invalid JSON body:", error)
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }

  const data = child(body, "data")
  const payload = Object.keys(data).length > 0 ? data : child(body, "submission")
  const effectivePayload = Object.keys(payload).length > 0 ? payload : body
  const submitter = firstSubmitter(effectivePayload)
  const metadata = child(effectivePayload, "metadata")
  const externalId =
    text(effectivePayload, ["id", "submission_id", "uuid"]) ??
    text(body, ["submission_id", "id"])
  const rawStatus = text(effectivePayload, ["status"]) ?? text(body, ["event_type", "event", "type"])
  const status = statusFromDocuseal(rawStatus)

  if (!externalId) {
    return NextResponse.json({ ok: false, error: "docuseal submission id required" }, { status: 400 })
  }

  const row = {
    region: text(metadata, ["region"]) === "global" ? "global" : "jp",
    contract_name:
      text(effectivePayload, ["name", "template_name", "document_name"]) ??
      text(child(effectivePayload, "template"), ["name"]) ??
      "Docuseal 契約書",
    contract_type: "other",
    currency: text(metadata, ["currency"]) ?? "JPY",
    pdf_r2_url: text(effectivePayload, ["audit_log_url", "document_url", "pdf_url"]),
    docusign_envelope_id: externalId,
    docusign_status: rawStatus,
    status,
    signer_name: text(submitter, ["name"]),
    signer_email: text(submitter, ["email"]),
    signed_at: status === "signed" ? signedAt(effectivePayload, submitter) : null,
    last_synced: new Date().toISOString(),
    meta: {
      provider: "docuseal",
      companyId: text(metadata, ["companyId", "company_id"]),
      productCode: text(metadata, ["productCode", "product_code"]),
      raw: body,
    },
  }

  const { error } = await sb
    .from(DB_TABLES.SALES_CONTRACTS)
    .upsert(row, { onConflict: "docusign_envelope_id" })

  if (error) {
    console.error("[docuseal-webhook] upsert failed:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const companyId = text(metadata, ["companyId", "company_id"])
  const productCode = text(metadata, ["productCode", "product_code"])
  if (status === "signed" && companyId) {
    const handoff = await runCustomerSuccessHandoff({
      companyId,
      source: "docuseal",
      contractName: row.contract_name,
      contractProducts: productCode ? [productCode] : null,
      contractAmountYen: Number(text(metadata, ["amountYen", "amount_yen"]) ?? NaN),
      contractStatus: "active",
      docusealSubmissionId: externalId,
      docusealUrl: row.pdf_r2_url,
      calComUrl: text(metadata, ["calComUrl", "cal_com_url"]),
      meta: { docuseal_status: rawStatus },
    })
    if (!handoff.ok) {
      console.warn("[docuseal-webhook] customer handoff failed:", handoff.error)
    }
  }

  return NextResponse.json({ ok: true, provider: "docuseal", submission_id: externalId, status })
}
