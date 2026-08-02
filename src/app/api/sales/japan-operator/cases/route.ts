import { createHash } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { notifyBothChannels } from "@/lib/notify"
import { getServiceSalesSupabase } from "@/lib/supabase"
import {
  authorizeSalesApiRequest,
  type OperatorRole,
  type SalesApiPrincipal,
} from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  canAdvanceJapanOperatorCase,
  getJapanOperatorStageDefinition,
  getNextJapanOperatorStage,
  isJapanOperatorCaseStatus,
  isJapanOperatorOfferCode,
  isJapanOperatorStage,
  STANDARD_OPERATOR_TERMS,
  type JapanOperatorGateData,
} from "@/lib/sales/japan-operator-workflow"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

type JsonRecord = Record<string, unknown>
type SalesSupabase = NonNullable<ReturnType<typeof getServiceSalesSupabase>>

const evidenceSchema = z.object({
  evidenceType: z.enum(["source_url", "file", "email", "form", "contract", "invoice", "payment", "system_record", "meeting_note", "other"]),
  sourceUrl: z.string().url().max(2000).optional(),
  storagePath: z.string().trim().min(2).max(1000).optional(),
  recipient: z.string().trim().min(2).max(1000).optional(),
  channel: z.string().trim().min(2).max(80).optional(),
  content: z.string().max(50_000).optional(),
  observedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  note: z.string().trim().min(2).max(2000),
  detail: z.record(z.string(), z.unknown()).default({}),
}).refine((value) => value.sourceUrl || value.storagePath || value.content, {
  message: "URL、保存先、または証跡内容のいずれかが必要です",
})

const createSchema = z.object({
  companyId: z.string().uuid(),
  offerCode: z.enum(["standard_operator_v1", "country_partner_setup_v1"]),
  owner: z.string().trim().min(2).max(120),
  note: z.string().trim().min(2).max(2000),
})

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_check"), caseId: z.string().uuid(), expectedRevision: z.number().int().positive(),
    stage: z.string(), checkId: z.string().regex(/^[a-z][a-z0-9_]{1,80}$/), checked: z.boolean(), evidence: evidenceSchema.optional(),
  }),
  z.object({
    action: z.literal("save_next_action"), caseId: z.string().uuid(), expectedRevision: z.number().int().positive(),
    owner: z.string().trim().min(2).max(120), nextAction: z.string().trim().min(2).max(500), nextActionDueAt: z.string().datetime(),
  }),
  z.object({ action: z.literal("advance"), caseId: z.string().uuid(), expectedRevision: z.number().int().positive(), note: z.string().trim().min(8).max(2000) }),
  z.object({ action: z.literal("set_status"), caseId: z.string().uuid(), expectedRevision: z.number().int().positive(), status: z.string(), note: z.string().trim().min(8).max(2000) }),
  z.object({ action: z.literal("reopen"), caseId: z.string().uuid(), expectedRevision: z.number().int().positive(), note: z.string().trim().min(20).max(2000) }),
])

function roleAllowed(role: OperatorRole, allowed: readonly OperatorRole[]): boolean {
  return allowed.includes(role)
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function asGateData(value: unknown): JapanOperatorGateData {
  const source = asRecord(value)
  return Object.fromEntries(Object.entries(source).flatMap(([stage, checks]) => {
    if (!isJapanOperatorStage(stage)) return []
    return [[stage, Object.fromEntries(Object.entries(asRecord(checks)).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"))]]
  }))
}

function principalParams(principal: SalesApiPrincipal) {
  return {
    p_actor_key: principal.key,
    p_actor_email: principal.email,
    p_actor_role: principal.role,
    p_auth_source: principal.authSource,
  }
}

async function loadCase(supabase: SalesSupabase, caseId: string) {
  const result = await supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_CASES).select("*").eq("id", caseId).single()
  if (result.error || !result.data) console.error("[japan-operator-cases] case load failed:", result.error?.message ?? "not found")
  return result
}

async function mutateCase(supabase: SalesSupabase, params: JsonRecord) {
  const { data, error } = await supabase.rpc("sales_apply_japan_operator_action_v2", params)
  if (error) {
    console.error("[japan-operator-cases] atomic mutation failed:", error.message)
    return { error: error.message, status: /revision conflict/i.test(error.message) ? 409 : 400 }
  }
  const row = Array.isArray(data) ? data[0] : data
  return row ? { data: row } : { error: "Case mutation returned no row", status: 500 }
}

async function recordEvidence(input: {
  supabase: SalesSupabase; caseId: string; stage: string; checkId: string;
  evidence: z.infer<typeof evidenceSchema>; principal: SalesApiPrincipal;
}) {
  const canonical = JSON.stringify({
    sourceUrl: input.evidence.sourceUrl ?? null, storagePath: input.evidence.storagePath ?? null,
    recipient: input.evidence.recipient ?? null, channel: input.evidence.channel ?? null,
    content: input.evidence.content ?? null, observedAt: input.evidence.observedAt, detail: input.evidence.detail,
  })
  const contentSha256 = createHash("sha256").update(canonical).digest("hex")
  const { data, error } = await input.supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_EVIDENCE).insert({
    case_id: input.caseId, stage: input.stage, check_id: input.checkId, evidence_type: input.evidence.evidenceType,
    source_url: input.evidence.sourceUrl ?? null, storage_path: input.evidence.storagePath ?? null,
    recipient: input.evidence.recipient ?? null, channel: input.evidence.channel ?? null, content_sha256: contentSha256,
    observed_at: input.evidence.observedAt, expires_at: input.evidence.expiresAt ?? null,
    verified_by_key: input.principal.key, verified_by_email: input.principal.email,
    verified_by_role: input.principal.role, auth_source: input.principal.authSource,
    note: input.evidence.note, detail: input.evidence.detail,
  }).select("id").single()
  if (error) console.error("[japan-operator-cases] evidence insert failed:", error.message)
  return { data, error }
}

async function notifyCaseChange(companyName: string, title: string, message: string, type: string, caseId: string) {
  return notifyBothChannels(`${title}: ${companyName}\n${message}`, {
    title, message: `${companyName}: ${message}`, link: "/ja/admin/opportunity-briefs", type,
    region: "global", priority: 90, leadId: caseId, idempotencyKey: `${type}:${caseId}:${Date.now()}`,
  })
}

export async function GET(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const supabase = getServiceSalesSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase service role not configured" }, { status: 503 })
  const [{ data: cases, error: caseError }, { data: events, error: eventError }] = await Promise.all([
    supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_CASES).select("*, sales_companies(id, company_name, domain, source, memo, assigned_to)").order("next_action_due_at", { ascending: true, nullsFirst: false }).order("updated_at", { ascending: false }).limit(100),
    supabase.from(DB_TABLES.SALES_JAPAN_OPERATOR_EVENTS).select("id, case_id, action, from_stage, to_stage, actor, actor_email, actor_role, note, detail, created_at").order("created_at", { ascending: false }).limit(300),
  ])
  if (caseError || eventError) {
    console.error("[japan-operator-cases] list failed:", caseError?.message ?? eventError?.message)
    return NextResponse.json({ ok: false, error: "Japan operator cases could not be loaded" }, { status: 500 })
  }
  return NextResponse.json({ ok: true, cases: cases ?? [], events: events ?? [], principal: auth.principal }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  if (!roleAllowed(auth.principal.role, ["admin", "commercial_lead"])) return NextResponse.json({ ok: false, error: "Commercial lead role required" }, { status: 403 })
  const parsed = createSchema.safeParse(await req.json().catch((error) => { console.error("[japan-operator-cases] create JSON parse failed:", error); return null }))
  if (!parsed.success || !isJapanOperatorOfferCode(parsed.data.offerCode)) return NextResponse.json({ ok: false, error: "Invalid case input", fields: parsed.success ? undefined : parsed.error.flatten().fieldErrors }, { status: 400 })
  const supabase = getServiceSalesSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase service role not configured" }, { status: 503 })
  const { data: company } = await supabase.from(DB_TABLES.SALES_COMPANIES).select("id, company_name").eq("id", parsed.data.companyId).single()
  if (!company) return NextResponse.json({ ok: false, error: "RevenueOS company not found" }, { status: 404 })
  const offerSnapshot = {
    offerCode: parsed.data.offerCode, currency: "USD", validationFee: STANDARD_OPERATOR_TERMS.validationFeeUsd,
    launchTotalFee: STANDARD_OPERATOR_TERMS.launchTotalUsd, validationCreditDays: STANDARD_OPERATOR_TERMS.validationCreditDays,
    monthlyRetainer: STANDARD_OPERATOR_TERMS.monthlyRetainerUsd, revenueShareRate: STANDARD_OPERATOR_TERMS.revenueShareRate,
  }
  const { data, error } = await supabase.rpc("sales_create_japan_operator_case_v2", {
    p_company_id: parsed.data.companyId, p_offer_code: parsed.data.offerCode, p_offer_version: "2026-08-02",
    p_offer_snapshot: offerSnapshot, ...principalParams(auth.principal), p_owner: parsed.data.owner, p_note: parsed.data.note,
  })
  if (error) { console.error("[japan-operator-cases] create failed:", error.message); return NextResponse.json({ ok: false, error: error.message }, { status: 409 }) }
  const operatorCase = Array.isArray(data) ? data[0] : data
  const notification = await notifyCaseChange(company.company_name, "Japan operator案件を登録", parsed.data.note, "japan_operator_case_created", operatorCase?.id ?? parsed.data.companyId)
  return NextResponse.json({ ok: true, case: operatorCase, notification }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeSalesApiRequest(req)
  if (!auth.ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  if (!roleAllowed(auth.principal.role, ["admin", "commercial_lead", "researcher", "finance", "legal", "delivery", "japan_operator"])) return NextResponse.json({ ok: false, error: "Operator edit role required" }, { status: 403 })
  const parsed = patchSchema.safeParse(await req.json().catch((error) => { console.error("[japan-operator-cases] patch JSON parse failed:", error); return null }))
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid case action", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  const supabase = getServiceSalesSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase service role not configured" }, { status: 503 })
  const loaded = await loadCase(supabase, parsed.data.caseId)
  if (!loaded.data) return NextResponse.json({ ok: false, error: "Japan operator case not found" }, { status: 404 })
  const current = loaded.data
  if (!isJapanOperatorStage(current.stage)) return NextResponse.json({ ok: false, error: "Case has an unsupported stage" }, { status: 409 })
  const base = { p_case_id: current.id, p_expected_revision: parsed.data.expectedRevision, ...principalParams(auth.principal) }
  let mutation: Awaited<ReturnType<typeof mutateCase>>
  if (parsed.data.action === "set_check") {
    const checkId = parsed.data.checkId
    const nextStage = getNextJapanOperatorStage(current.stage)
    if (!nextStage || parsed.data.stage !== nextStage || !getJapanOperatorStageDefinition(nextStage).requiredChecks.some((item) => item.id === checkId)) return NextResponse.json({ ok: false, error: "Only a known next-stage gate can be edited" }, { status: 409 })
    if (parsed.data.checked && !parsed.data.evidence) return NextResponse.json({ ok: false, error: "Evidence is required before completing a gate" }, { status: 400 })
    if (parsed.data.evidence) {
      const evidence = await recordEvidence({ supabase, caseId: current.id, stage: nextStage, checkId, evidence: parsed.data.evidence, principal: auth.principal })
      if (evidence.error) return NextResponse.json({ ok: false, error: evidence.error.message }, { status: 500 })
    }
    mutation = await mutateCase(supabase, { ...base, p_action: "set_check", p_note: `${nextStage}.${checkId} = ${parsed.data.checked}`, p_check_id: checkId, p_checked: parsed.data.checked })
  } else if (parsed.data.action === "save_next_action") {
    mutation = await mutateCase(supabase, { ...base, p_action: "save_next_action", p_note: "次アクション、期限、担当者を更新", p_next_action: parsed.data.nextAction, p_next_action_due_at: parsed.data.nextActionDueAt, p_owner: parsed.data.owner })
  } else if (parsed.data.action === "advance") {
    const decision = canAdvanceJapanOperatorCase(current.stage, asGateData(current.gate_data))
    if (!decision.ok) return NextResponse.json({ ok: false, error: decision.reason, missingChecks: decision.missing }, { status: 409 })
    mutation = await mutateCase(supabase, { ...base, p_action: "advance", p_note: parsed.data.note, p_to_stage: decision.nextStage })
  } else if (parsed.data.action === "reopen") {
    mutation = await mutateCase(supabase, { ...base, p_action: "reopen", p_note: parsed.data.note })
  } else {
    if (!isJapanOperatorCaseStatus(parsed.data.status)) return NextResponse.json({ ok: false, error: "Invalid case status" }, { status: 400 })
    mutation = await mutateCase(supabase, { ...base, p_action: "set_status", p_note: parsed.data.note, p_status: parsed.data.status })
  }
  if ("error" in mutation) return NextResponse.json({ ok: false, error: mutation.error }, { status: mutation.status })
  const company = await supabase.from(DB_TABLES.SALES_COMPANIES).select("company_name").eq("id", current.company_id).single()
  const notification = parsed.data.action === "set_check" || parsed.data.action === "save_next_action" ? null : await notifyCaseChange(company.data?.company_name ?? current.company_id, "Japan operator案件を更新", parsed.data.action, "japan_operator_case_updated", current.id)
  return NextResponse.json({ ok: true, case: mutation.data, notification })
}
