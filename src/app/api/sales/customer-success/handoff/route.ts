import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { runCustomerSuccessHandoff } from "@/lib/sales/customer-handoff"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export async function POST(req: NextRequest) {
  const auth = authorizeWebhookRequest(req.headers)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  let body: JsonRecord
  try {
    const parsed = await req.json()
    if (!isRecord(parsed)) return NextResponse.json({ ok: false, error: "JSON object required" }, { status: 400 })
    body = parsed
  } catch (error) {
    console.error("[customer-success-handoff] invalid JSON body:", error)
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }

  const companyId = text(body.companyId) ?? text(body.company_id)
  if (!companyId) return NextResponse.json({ ok: false, error: "companyId is required" }, { status: 400 })

  const result = await runCustomerSuccessHandoff({
    companyId,
    source: text(body.source) ?? "manual",
    contractName: text(body.contractName) ?? text(body.contract_name),
    contractProducts: stringArray(body.contractProducts) ?? stringArray(body.contract_products),
    monthlyAmountYen: numberValue(body.monthlyAmountYen) ?? numberValue(body.monthly_amount_yen),
    contractAmountYen: numberValue(body.contractAmountYen) ?? numberValue(body.contract_amount_yen),
    contractStatus: text(body.contractStatus) ?? text(body.contract_status),
    docusealSubmissionId: text(body.docusealSubmissionId) ?? text(body.docuseal_submission_id),
    docusealUrl: text(body.docusealUrl) ?? text(body.docuseal_url),
    calComUrl: text(body.calComUrl) ?? text(body.cal_com_url),
    notionPageUrl: text(body.notionPageUrl) ?? text(body.notion_page_url),
    notionPageId: text(body.notionPageId) ?? text(body.notion_page_id),
    assignedTo: text(body.assignedTo) ?? text(body.assigned_to),
    meta: isRecord(body.meta) ? body.meta : {},
  })

  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
