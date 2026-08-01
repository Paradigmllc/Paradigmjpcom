import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { notifyBothChannels } from "@/lib/notify"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import {
  canAdvanceJapanOperatorCase,
  getJapanOperatorStageDefinition,
  getNextJapanOperatorStage,
  isJapanOperatorCaseStatus,
  isJapanOperatorOfferCode,
  isJapanOperatorStage,
  type JapanOperatorGateData,
} from "@/lib/sales/japan-operator-workflow"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

type JsonRecord = Record<string, unknown>

const createSchema = z.object({
  companyId: z.string().uuid(),
  offerCode: z.enum(["standard_operator_v1", "country_partner_setup_v1"]),
  actor: z.string().trim().min(2).max(120),
  owner: z.string().trim().min(2).max(120),
  note: z.string().trim().min(2).max(2000),
})

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_check"),
    caseId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
    actor: z.string().trim().min(2).max(120),
    stage: z.string(),
    checkId: z.string().regex(/^[a-z][a-z0-9_]{1,80}$/),
    checked: z.boolean(),
  }),
  z.object({
    action: z.literal("save_next_action"),
    caseId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
    actor: z.string().trim().min(2).max(120),
    owner: z.string().trim().min(2).max(120),
    nextAction: z.string().trim().min(2).max(500),
    nextActionDueAt: z.string().datetime(),
  }),
  z.object({
    action: z.literal("advance"),
    caseId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
    actor: z.string().trim().min(2).max(120),
    note: z.string().trim().min(8).max(2000),
  }),
  z.object({
    action: z.literal("set_status"),
    caseId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
    actor: z.string().trim().min(2).max(120),
    status: z.string(),
    note: z.string().trim().min(8).max(2000),
  }),
])

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function asGateData(value: unknown): JapanOperatorGateData {
  const source = asRecord(value)
  return Object.fromEntries(Object.entries(source).flatMap(([stage, checks]) => {
    if (!isJapanOperatorStage(stage)) return []
    const values = asRecord(checks)
    return [[stage, Object.fromEntries(Object.entries(values).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"))]]
  }))
}

async function loadCase(caseId: string) {
  const supabase = getServiceSalesSupabase()
  if (!supabase) return { error: "Supabase service role not configured", status: 503 as const }
  const { data, error } = await supabase
    .from(DB_TABLES.SALES_JAPAN_OPERATOR_CASES)
    .select("*")
    .eq("id", caseId)
    .single()
  if (error || !data) {
    console.error("[japan-operator-cases] case load failed:", error?.message ?? "not found")
    return { error: "Japan operator case not found", status: 404 as const }
  }
  return { data, supabase }
}

async function mutateCase(
  supabase: NonNullable<ReturnType<typeof getServiceSalesSupabase>>,
  params: JsonRecord,
) {
  const { data, error } = await supabase.rpc("sales_apply_japan_operator_action", params)
  if (error) {
    console.error("[japan-operator-cases] atomic mutation failed:", error.message)
    const conflict = /revision conflict/i.test(error.message)
    return { error: conflict ? "Case changed in another session. Reload and try again." : error.message, status: conflict ? 409 : 500 }
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return { error: "Case mutation returned no row", status: 500 }
  return { data: row }
}

async function notifyCaseChange(companyName: string, title: string, message: string, type: string, caseId: string) {
  const result = await notifyBothChannels(`${title}: ${companyName}\n${message}`, {
    title,
    message: `${companyName}: ${message}`,
    link: "/ja/admin/opportunity-briefs",
    type,
    region: "global",
    priority: 90,
    leadId: caseId,
    idempotencyKey: `${type}:${caseId}:${Date.now()}`,
  })
  if (!result.ok) console.error("[japan-operator-cases] dual notification degraded:", result)
  return result
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const supabase = getServiceSalesSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase service role not configured" }, { status: 503 })

  const [{ data: cases, error: caseError }, { data: events, error: eventError }] = await Promise.all([
    supabase
      .from(DB_TABLES.SALES_JAPAN_OPERATOR_CASES)
      .select("*, sales_companies(id, company_name, domain, source, memo, assigned_to)")
      .order("next_action_due_at", { ascending: true, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from(DB_TABLES.SALES_JAPAN_OPERATOR_EVENTS)
      .select("id, case_id, action, from_stage, to_stage, actor, note, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
  ])
  if (caseError || eventError) {
    console.error("[japan-operator-cases] list failed:", caseError?.message ?? eventError?.message)
    return NextResponse.json({ ok: false, error: "Japan operator cases could not be loaded" }, { status: 500 })
  }
  return NextResponse.json({ ok: true, cases: cases ?? [], events: events ?? [] }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const parsed = createSchema.safeParse(await req.json().catch((error) => {
    console.error("[japan-operator-cases] create JSON parse failed:", error)
    return null
  }))
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid case input", fields: parsed.error.flatten().fieldErrors }, { status: 400 })
  if (!isJapanOperatorOfferCode(parsed.data.offerCode)) return NextResponse.json({ ok: false, error: "Invalid offer code" }, { status: 400 })

  const supabase = getServiceSalesSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: "Supabase service role not configured" }, { status: 503 })
  const { data: company, error: companyError } = await supabase
    .from(DB_TABLES.SALES_COMPANIES)
    .select("id, company_name")
    .eq("id", parsed.data.companyId)
    .single()
  if (companyError || !company) return NextResponse.json({ ok: false, error: "RevenueOS company not found" }, { status: 404 })

  const { data, error } = await supabase.rpc("sales_create_japan_operator_case", {
    p_company_id: parsed.data.companyId,
    p_offer_code: parsed.data.offerCode,
    p_actor: parsed.data.actor,
    p_owner: parsed.data.owner,
    p_note: parsed.data.note,
  })
  if (error) {
    console.error("[japan-operator-cases] create failed:", error.message)
    return NextResponse.json({ ok: false, error: /unique/i.test(error.message) ? "This company already has a case" : error.message }, { status: 409 })
  }
  const operatorCase = Array.isArray(data) ? data[0] : data
  const notification = await notifyCaseChange(company.company_name, "Japan operator案件を登録", parsed.data.note, "japan_operator_case_created", operatorCase?.id ?? parsed.data.companyId)
  return NextResponse.json({ ok: true, case: operatorCase, notification }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const parsed = patchSchema.safeParse(await req.json().catch((error) => {
    console.error("[japan-operator-cases] patch JSON parse failed:", error)
    return null
  }))
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid case action", fields: parsed.error.flatten().fieldErrors }, { status: 400 })

  const loaded = await loadCase(parsed.data.caseId)
  if ("error" in loaded) return NextResponse.json({ ok: false, error: loaded.error }, { status: loaded.status })
  const { data: current, supabase } = loaded
  if (current.revision !== parsed.data.expectedRevision) return NextResponse.json({ ok: false, error: "Case changed in another session. Reload and try again." }, { status: 409 })
  if (!isJapanOperatorStage(current.stage)) return NextResponse.json({ ok: false, error: "Case has an unsupported stage" }, { status: 409 })

  const companyResult = await supabase.from(DB_TABLES.SALES_COMPANIES).select("company_name").eq("id", current.company_id).single()
  const companyName = companyResult.data?.company_name ?? current.company_id
  let mutation: Awaited<ReturnType<typeof mutateCase>>

  if (parsed.data.action === "set_check") {
    const nextStage = getNextJapanOperatorStage(current.stage)
    if (!nextStage || parsed.data.stage !== nextStage) return NextResponse.json({ ok: false, error: "Only the next stage entry gate can be edited" }, { status: 409 })
    const definition = getJapanOperatorStageDefinition(nextStage)
    const checkId = parsed.data.checkId
    if (!definition.requiredChecks.some((item) => item.id === checkId)) return NextResponse.json({ ok: false, error: "Unknown gate check" }, { status: 400 })
    const gateData = asGateData(current.gate_data)
    gateData[nextStage] = { ...(gateData[nextStage] ?? {}), [checkId]: parsed.data.checked }
    mutation = await mutateCase(supabase, {
      p_case_id: current.id,
      p_expected_revision: current.revision,
      p_action: "set_check",
      p_actor: parsed.data.actor,
      p_note: `${nextStage}.${checkId} = ${parsed.data.checked}`,
      p_gate_data: gateData,
    })
  } else if (parsed.data.action === "save_next_action") {
    mutation = await mutateCase(supabase, {
      p_case_id: current.id,
      p_expected_revision: current.revision,
      p_action: "save_next_action",
      p_actor: parsed.data.actor,
      p_note: "次アクション、期限、担当者を更新",
      p_next_action: parsed.data.nextAction,
      p_next_action_due_at: parsed.data.nextActionDueAt,
      p_owner: parsed.data.owner,
    })
  } else if (parsed.data.action === "advance") {
    const gateData = asGateData(current.gate_data)
    const decision = canAdvanceJapanOperatorCase(current.stage, gateData)
    if (!decision.ok) return NextResponse.json({ ok: false, error: decision.reason, missingChecks: decision.missing }, { status: 409 })
    mutation = await mutateCase(supabase, {
      p_case_id: current.id,
      p_expected_revision: current.revision,
      p_action: "advance",
      p_actor: parsed.data.actor,
      p_note: parsed.data.note,
      p_to_stage: decision.nextStage,
    })
    if ("data" in mutation) {
      const notification = await notifyCaseChange(companyName, "Japan operatorステージ更新", `${current.stage} → ${decision.nextStage} / ${parsed.data.note}`, "japan_operator_stage_advanced", current.id)
      return NextResponse.json({ ok: true, case: mutation.data, notification })
    }
  } else {
    if (!isJapanOperatorCaseStatus(parsed.data.status)) return NextResponse.json({ ok: false, error: "Invalid case status" }, { status: 400 })
    mutation = await mutateCase(supabase, {
      p_case_id: current.id,
      p_expected_revision: current.revision,
      p_action: "set_status",
      p_actor: parsed.data.actor,
      p_note: parsed.data.note,
      p_status: parsed.data.status,
    })
    if ("data" in mutation) {
      const notification = await notifyCaseChange(companyName, "Japan operator案件ステータス更新", `${current.status} → ${parsed.data.status} / ${parsed.data.note}`, "japan_operator_status_changed", current.id)
      return NextResponse.json({ ok: true, case: mutation.data, notification })
    }
  }

  if ("error" in mutation) return NextResponse.json({ ok: false, error: mutation.error }, { status: mutation.status })
  return NextResponse.json({ ok: true, case: mutation.data })
}
