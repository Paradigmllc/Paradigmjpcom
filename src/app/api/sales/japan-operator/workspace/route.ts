import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { notifyBothChannels } from "@/lib/notify"
import { getServiceSalesSupabase } from "@/lib/supabase"
import {
  authorizeSalesApiRequest,
  type OperatorRole,
  type SalesApiPrincipal,
} from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { createJapanOperatorContractDraft } from "@/lib/sales/japan-operator-docuseal"
import {
  workspaceActionSchema,
  type WorkspaceAction,
} from "@/lib/sales/japan-operator-workspace-schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

type SalesSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>
type ActionResult = { caseId: string | null; entity: string; record: unknown }

function can(role: OperatorRole, allowed: readonly OperatorRole[]): boolean {
  return allowed.includes(role)
}

function actor(principal: SalesApiPrincipal) {
  return { actor_key: principal.key, actor_email: principal.email, actor_role: principal.role }
}

async function insertOne(supabase: SalesSupabase, table: string, value: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).insert(value).select("*").single()
  if (error) throw new Error(error.message)
  return data
}

async function workspaceEvent(supabase: SalesSupabase, caseId: string, principal: SalesApiPrincipal, entity: string, record: unknown) {
  const caseResult = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_CASES).select("stage").eq("id", caseId).single()
  if (caseResult.error || !caseResult.data) throw new Error(caseResult.error?.message ?? "Operator case not found")
  const event = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_EVENTS).insert({
    case_id: caseId, action: "record_created", from_stage: caseResult.data.stage, to_stage: caseResult.data.stage,
    actor: principal.email ?? principal.key, actor_key: principal.key, actor_email: principal.email,
    actor_role: principal.role, auth_source: principal.authSource, note: `${entity} record created.`,
    detail: { entity, record_id: typeof record === "object" && record && "id" in record ? (record as { id: unknown }).id : null },
  })
  if (event.error) throw new Error(event.error.message)
}

async function requestOutbound(supabase: SalesSupabase, action: Extract<WorkspaceAction, { action: "request_outbound" }>, principal: SalesApiPrincipal) {
  const messageSha256 = createHash("sha256").update(action.message.normalize("NFC")).digest("hex")
  return insertOne(supabase, DB_TABLES.SALES_JAPAN_OPERATOR_APPROVALS, {
    case_id: action.caseId, approval_type: "outbound_send", stage: "human_approved", decision: "requested",
    requested_by_key: principal.key, requested_by_email: principal.email, note: action.note, expires_at: action.expiresAt,
    detail: { channel: action.channel, recipient: action.recipient, message: action.message, message_sha256: messageSha256 },
  })
}

async function approveOutbound(supabase: SalesSupabase, action: Extract<WorkspaceAction, { action: "approve_outbound" }>, principal: SalesApiPrincipal) {
  if (!can(principal.role, ["admin", "commercial_lead"])) throw new Error("Commercial lead role required")
  const approvalResult = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_APPROVALS).select("*").eq("id", action.approvalId).single()
  const approval = approvalResult.data
  if (approvalResult.error || !approval || approval.approval_type !== "outbound_send" || approval.decision !== "requested") throw new Error("Pending outbound approval not found")
  if (approval.expires_at && new Date(approval.expires_at).getTime() <= Date.now()) throw new Error("Outbound approval request has expired")
  const detail = approval.detail && typeof approval.detail === "object" ? approval.detail as Record<string, unknown> : {}
  const samePrincipal = approval.requested_by_key === principal.key
  if (samePrincipal && (principal.role !== "admin" || (action.overrideReason?.length ?? 0) < 10)) throw new Error("A different approver is required unless an admin records a detailed override")
  const caseResult = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_CASES).select("company_id").eq("id", approval.case_id).single()
  if (!caseResult.data) throw new Error("Operator case not found")
  const authorization = await insertOne(supabase, DB_TABLES.SALES_JAPAN_OPERATOR_OUTBOUND_AUTHORIZATIONS, {
    case_id: approval.case_id, company_id: caseResult.data.company_id,
    channel: detail.channel, recipient: detail.recipient, message_sha256: detail.message_sha256,
    requested_by_key: approval.requested_by_key, requested_by_email: approval.requested_by_email,
    approved_by_key: principal.key, approved_by_email: principal.email, approved_by_role: principal.role,
    override_reason: action.overrideReason ?? null, expires_at: approval.expires_at,
  })
  const update = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_APPROVALS).update({
    decision: "approved", decided_by_key: principal.key, decided_by_email: principal.email,
    decided_by_role: principal.role, decided_at: new Date().toISOString(),
  }).eq("id", action.approvalId).eq("decision", "requested")
  if (update.error) throw new Error(update.error.message)
  return { approval, authorization }
}

async function validationCredit(supabase: SalesSupabase, action: Extract<WorkspaceAction, { action: "record_invoice" }>) {
  if (action.invoiceKind !== "launch" || !action.validationCreditSourceId) return 0
  const source = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_INVOICES).select("case_id, amount_minor, status, paid_at").eq("id", action.validationCreditSourceId).single()
  if (!source.data || source.data.case_id !== action.caseId || source.data.status !== "paid" || !source.data.paid_at) throw new Error("Eligible paid validation invoice not found")
  const paidAt = new Date(source.data.paid_at).getTime()
  const issuedAt = new Date(action.issuedAt ?? Date.now()).getTime()
  if (issuedAt - paidAt > 30 * 86_400_000 || issuedAt < paidAt) throw new Error("Validation credit window has expired")
  return Math.min(source.data.amount_minor, action.amountMinor)
}

async function handleAction(supabase: SalesSupabase, action: WorkspaceAction, principal: SalesApiPrincipal): Promise<ActionResult> {
  if (action.action === "request_outbound") {
    if (!can(principal.role, ["admin", "commercial_lead", "researcher", "japan_operator"])) throw new Error("Outbound request role required")
    return { caseId: action.caseId, entity: "outbound_request", record: await requestOutbound(supabase, action, principal) }
  }
  if (action.action === "approve_outbound") {
    const record = await approveOutbound(supabase, action, principal)
    return { caseId: record.approval.case_id, entity: "outbound_authorization", record }
  }
  if (action.action === "record_suppression") {
    if (principal.role === "viewer" || principal.role === "automation") throw new Error("Operator edit role required")
    const record = await insertOne(supabase, DB_TABLES.SALES_CONTACT_SUPPRESSIONS, {
      company_id: action.companyId ?? null, contact_key: action.contactKey?.toLowerCase() ?? null,
      channel: action.channel, scope: action.scope, reason_code: action.reasonCode, reason: action.reason,
      expires_at: action.expiresAt ?? null, created_by_key: principal.key, created_by_email: principal.email,
      evidence_id: action.evidenceId ?? null,
    })
    return { caseId: null, entity: "suppression", record }
  }
  if (action.action === "assign_role") {
    if (principal.role !== "admin") throw new Error("Admin role required")
    const { data, error } = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_ROLE_ASSIGNMENTS).upsert({
      principal_key: action.principalKey, principal_email: action.principalEmail ?? null,
      operator_role: action.operatorRole, active: action.active, assigned_by_key: principal.key,
      assigned_by_email: principal.email, reason: action.reason, updated_at: new Date().toISOString(),
    }, { onConflict: "principal_key" }).select("*").single()
    if (error) throw new Error(error.message)
    return { caseId: null, entity: "role_assignment", record: data }
  }
  if (action.action === "link_source") {
    if (!can(principal.role, ["admin", "commercial_lead", "researcher"])) throw new Error("Research role required")
    const { data, error } = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_SOURCE_LINKS).upsert({
      source_config_id: action.sourceConfigId, offer_code: action.offerCode, cadence_hours: action.cadenceHours,
      filters: action.filters, active: true, created_by_key: principal.key, created_by_email: principal.email,
      next_checked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }, { onConflict: "source_config_id,offer_code" }).select("*").single()
    if (error) throw new Error(error.message)
    return { caseId: null, entity: "source_link", record: data }
  }
  if (action.action === "create_contract_draft") {
    if (!can(principal.role, ["admin", "commercial_lead", "legal"])) throw new Error("Contract role required")
    const record = await createJapanOperatorContractDraft(supabase, action, principal)
    return { caseId: action.caseId, entity: "contract_draft", record }
  }
  if (action.action === "link_contract") {
    if (!can(principal.role, ["admin", "commercial_lead", "legal"])) throw new Error("Contract role required")
    const { data, error } = await supabase.rpc("sales_link_japan_operator_contract_v1", {
      p_case_id: action.caseId, p_contract_kind: action.contractKind, p_sales_contract_id: action.salesContractId,
      p_docuseal_submission_id: action.docusealSubmissionId ?? null, p_status: action.status,
      p_signed_at: action.signedAt ?? null, p_actor_key: principal.key, p_actor_email: principal.email,
      p_actor_role: principal.role, p_detail: action.detail,
    })
    if (error) throw new Error(error.message)
    return { caseId: action.caseId, entity: "contract", record: Array.isArray(data) ? data[0] : data }
  }
  if (action.action === "record_invoice") {
    if (!can(principal.role, ["admin", "finance"])) throw new Error("Finance role required")
    const credit = await validationCredit(supabase, action)
    const record = await insertOne(supabase, DB_TABLES.SALES_JAPAN_OPERATOR_INVOICES, {
      case_id: action.caseId, invoice_kind: action.invoiceKind, provider: action.provider,
      external_invoice_id: action.externalInvoiceId ?? null, external_payment_id: action.externalPaymentId ?? null,
      amount_minor: action.amountMinor, currency: action.currency.toUpperCase(), status: action.status,
      issued_at: action.issuedAt ?? null, due_at: action.dueAt ?? null, paid_at: action.paidAt ?? null,
      validation_credit_source_id: action.validationCreditSourceId ?? null, validation_credit_minor: credit,
      evidence_id: action.evidenceId ?? null, ...actor(principal),
    })
    return { caseId: action.caseId, entity: "invoice", record }
  }
  if (action.action === "upsert_sku") {
    if (!can(principal.role, ["admin", "legal", "delivery", "japan_operator"])) throw new Error("SKU readiness role required")
    const { data, error } = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_SKUS).upsert({
      case_id: action.caseId, sku: action.sku, product_name: action.productName, category: action.category,
      hs_code: action.hsCode ?? null, importer_of_record: action.importerOfRecord ?? null, seller_of_record: action.sellerOfRecord ?? null,
      labeling_status: action.labelingStatus, compliance_status: action.complianceStatus, customs_status: action.customsStatus,
      blocker_codes: action.blockerCodes, evidence_id: action.evidenceId ?? null, detail: action.detail, ...actor(principal), updated_at: new Date().toISOString(),
    }, { onConflict: "case_id,sku" }).select("*").single()
    if (error) throw new Error(error.message)
    return { caseId: action.caseId, entity: "sku", record: data }
  }
  if (action.action === "record_deliverable") {
    if (!can(principal.role, ["admin", "commercial_lead", "delivery", "japan_operator"])) throw new Error("Delivery role required")
    const accepted = action.status === "accepted"
    const record = await insertOne(supabase, DB_TABLES.SALES_JAPAN_OPERATOR_DELIVERABLES, {
      case_id: action.caseId, phase: action.phase, deliverable_type: action.deliverableType, title: action.title,
      description: action.description, owner: action.owner, due_at: action.dueAt ?? null, status: action.status,
      acceptance_criteria: action.acceptanceCriteria, accepted_at: accepted ? action.acceptedAt ?? new Date().toISOString() : null,
      accepted_by_key: accepted ? principal.key : null, evidence_id: action.evidenceId ?? null,
      change_request_of_id: action.changeRequestOfId ?? null, ...actor(principal),
    })
    return { caseId: action.caseId, entity: "deliverable", record }
  }
  if (action.action === "record_finance_period") {
    if (!can(principal.role, ["admin", "finance"])) throw new Error("Finance role required")
    const approved = ["approved", "invoiced", "paid", "locked"].includes(action.status)
    const record = await insertOne(supabase, DB_TABLES.SALES_JAPAN_OPERATOR_FINANCE_PERIODS, {
      case_id: action.caseId, period_start: action.periodStart, period_end: action.periodEnd,
      settlement_currency: action.settlementCurrency.toUpperCase(), fx_rate: action.fxRate,
      gross_minor: action.grossMinor, refund_minor: action.refundMinor, tax_minor: action.taxMinor,
      channel_fee_minor: action.channelFeeMinor, payment_fee_minor: action.paymentFeeMinor,
      fulfillment_minor: action.fulfillmentMinor, freight_duty_minor: action.freightDutyMinor,
      marketing_minor: action.marketingMinor, other_deduction_minor: action.otherDeductionMinor,
      net_revenue_minor: action.netRevenueMinor, revenue_share_minor: action.revenueShareMinor,
      retainer_minor: action.retainerMinor, payable_minor: action.payableMinor, status: action.status,
      evidence_id: action.evidenceId ?? null, approved_by_key: approved ? principal.key : null,
      approved_at: approved ? new Date().toISOString() : null, ...actor(principal),
    })
    return { caseId: action.caseId, entity: "finance_period", record }
  }
  if (action.action === "record_finance_line") {
    if (!can(principal.role, ["admin", "finance"])) throw new Error("Finance role required")
    const period = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_FINANCE_PERIODS).select("case_id,status").eq("id", action.periodId).single()
    if (!period.data || period.data.status === "locked") throw new Error("Open finance period not found")
    const record = await insertOne(supabase, DB_TABLES.SALES_JAPAN_OPERATOR_FINANCE_LINES, {
      period_id: action.periodId, external_order_id: action.externalOrderId ?? null, channel: action.channel,
      transaction_at: action.transactionAt, source_currency: action.sourceCurrency.toUpperCase(), gross_minor: action.grossMinor,
      refund_minor: action.refundMinor, tax_minor: action.taxMinor, channel_fee_minor: action.channelFeeMinor,
      payment_fee_minor: action.paymentFeeMinor, fulfillment_minor: action.fulfillmentMinor,
      freight_duty_minor: action.freightDutyMinor, marketing_minor: action.marketingMinor,
      other_deduction_minor: action.otherDeductionMinor, net_revenue_minor: action.netRevenueMinor,
      evidence_id: action.evidenceId ?? null, detail: action.detail, actor_key: principal.key,
    })
    return { caseId: period.data.case_id, entity: "finance_line", record }
  }
  if (action.action === "record_operation") {
    if (!can(principal.role, ["admin", "delivery", "japan_operator"])) throw new Error("Operations role required")
    const record = await insertOne(supabase, DB_TABLES.SALES_JAPAN_OPERATOR_OPERATIONAL_RECORDS, {
      case_id: action.caseId, record_type: action.recordType, external_ref: action.externalRef ?? null,
      sku_id: action.skuId ?? null, status: action.status, quantity: action.quantity ?? null,
      amount_minor: action.amountMinor ?? null, currency: action.currency?.toUpperCase() ?? null,
      occurred_at: action.occurredAt, due_at: action.dueAt ?? null, owner: action.owner ?? null,
      evidence_id: action.evidenceId ?? null, detail: action.detail, ...actor(principal),
    })
    return { caseId: action.caseId, entity: "operation", record }
  }
  if (action.action === "record_incident") {
    if (!can(principal.role, ["admin", "delivery", "japan_operator"])) throw new Error("Incident role required")
    const { data, error } = await supabase.rpc("sales_record_japan_operator_incident_v1", {
      p_case_id: action.caseId, p_incident_type: action.incidentType, p_severity: action.severity,
      p_title: action.title, p_description: action.description, p_occurred_at: action.occurredAt,
      p_owner: action.owner, p_evidence_id: action.evidenceId, p_actor_key: principal.key,
      p_actor_email: principal.email, p_actor_role: principal.role,
    })
    if (error) throw new Error(error.message)
    return { caseId: action.caseId, entity: "incident", record: Array.isArray(data) ? data[0] : data }
  }
  if (action.action === "record_kpi") {
    if (!can(principal.role, ["admin", "commercial_lead", "finance", "delivery"])) throw new Error("KPI review role required")
    const record = await insertOne(supabase, DB_TABLES.SALES_JAPAN_OPERATOR_KPI_PERIODS, {
      case_id: action.caseId, period_start: action.periodStart, period_end: action.periodEnd,
      metrics: action.metrics, targets: action.targets, status: action.status,
      exclusivity_decision: action.exclusivityDecision ?? null, cure_due_at: action.cureDueAt ?? null,
      evidence_id: action.evidenceId ?? null, approved_by_key: action.status === "accepted" ? principal.key : null, ...actor(principal),
    })
    return { caseId: action.caseId, entity: "kpi_period", record }
  }
  if (!can(principal.role, ["admin", "commercial_lead"])) throw new Error("Offboarding approval role required")
  const completed = action.status === "completed"
  const { data, error } = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_OFFBOARDING).upsert({
    case_id: action.caseId, status: action.status, reason: action.reason, effective_at: action.effectiveAt ?? null,
    checklist: action.checklist, evidence_id: action.evidenceId ?? null, approved_by_key: completed ? principal.key : null,
    completed_at: completed ? new Date().toISOString() : null, ...actor(principal), updated_at: new Date().toISOString(),
  }, { onConflict: "case_id" }).select("*").single()
  if (error) throw new Error(error.message)
  return { caseId: action.caseId, entity: "offboarding", record: data }
}

export async function GET(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const caseId = req.nextUrl.searchParams.get("caseId")
  if (!caseId || !/^[0-9a-f-]{36}$/i.test(caseId)) return NextResponse.json({ ok: false, error: "Valid caseId is required" }, { status: 400 })
  const supabase = getServiceSalesSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase service role not configured" }, { status: 503 })
  const caseResult = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_CASES).select("company_id").eq("id", caseId).single()
  if (!caseResult.data) return NextResponse.json({ ok: false, error: "Operator case not found" }, { status: 404 })
  const queries = [
    ["evidence", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_EVIDENCE).select("*").eq("case_id", caseId).order("captured_at", { ascending: false })],
    ["approvals", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_APPROVALS).select("*").eq("case_id", caseId).order("created_at", { ascending: false })],
    ["authorizations", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_OUTBOUND_AUTHORIZATIONS).select("*").eq("case_id", caseId).order("created_at", { ascending: false })],
    ["contracts", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_CONTRACT_LINKS).select("*").eq("case_id", caseId).order("updated_at", { ascending: false })],
    ["invoices", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_INVOICES).select("*").eq("case_id", caseId).order("created_at", { ascending: false })],
    ["skus", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_SKUS).select("*").eq("case_id", caseId).order("sku")],
    ["deliverables", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_DELIVERABLES).select("*").eq("case_id", caseId).order("created_at", { ascending: false })],
    ["financePeriods", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_FINANCE_PERIODS).select("*").eq("case_id", caseId).order("period_start", { ascending: false })],
    ["operations", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_OPERATIONAL_RECORDS).select("*").eq("case_id", caseId).order("occurred_at", { ascending: false }).limit(200)],
    ["incidents", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_INCIDENTS).select("*").eq("case_id", caseId).order("reported_at", { ascending: false })],
    ["kpis", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_KPI_PERIODS).select("*").eq("case_id", caseId).order("period_start", { ascending: false })],
    ["offboarding", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_OFFBOARDING).select("*").eq("case_id", caseId).maybeSingle()],
    ["suppressions", supabase.from(DB_TABLES.SALES_CONTACT_SUPPRESSIONS).select("*").or(`company_id.eq.${caseResult.data.company_id},company_id.is.null`).order("created_at", { ascending: false })],
    ["sourceLinks", supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_SOURCE_LINKS).select("*").order("next_checked_at")],
  ] as const
  const results = await Promise.all(queries.map(async ([key, query]) => [key, await query] as const))
  const failed = results.find(([, result]) => result.error)
  if (failed) { console.error(`[japan-operator-workspace] ${failed[0]} load failed:`, failed[1].error?.message); return NextResponse.json({ ok: false, error: "Operator workspace could not be loaded" }, { status: 500 }) }
  return NextResponse.json({ ok: true, principal: auth.principal, workspace: Object.fromEntries(results.map(([key, result]) => [key, result.data ?? (key === "offboarding" ? null : [])])) }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const parsed = workspaceActionSchema.safeParse(await req.json().catch((error) => { console.error("[japan-operator-workspace] invalid JSON:", error); return null }))
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid workspace action", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  const supabase = getServiceSalesSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase service role not configured" }, { status: 503 })
  try {
    const result = await handleAction(supabase, parsed.data, auth.principal)
    if (result.caseId && !["contract", "contract_draft", "incident"].includes(result.entity)) await workspaceEvent(supabase, result.caseId, auth.principal, result.entity, result.record)
    const notification = await notifyBothChannels(`Japan代理店OS: ${result.entity}を更新`, {
      title: "Japan代理店OS更新", message: `${result.entity}を${auth.principal.email ?? auth.principal.key}が更新しました。`,
      link: "/ja/admin/opportunity-briefs", type: `japan_operator_${result.entity}`, region: "global", priority: 80,
      leadId: result.caseId ?? undefined, idempotencyKey: `operator:${result.entity}:${Date.now()}`,
    })
    if (!notification.ok) console.error("[japan-operator-workspace] dual notification degraded:", notification)
    return NextResponse.json({ ok: true, result: result.record, notification }, { status: 201 })
  } catch (error) {
    console.error("[japan-operator-workspace] action failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Workspace action failed" }, { status: 400 })
  }
}
