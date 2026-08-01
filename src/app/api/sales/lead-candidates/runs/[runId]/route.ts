import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { recordLeadOperatorEvent } from "@/lib/sales/lead-operator-audit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function boundedInteger(value: string | null, fallback: number, maximum: number): number {
  const parsed = Number(value ?? fallback)
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 1), maximum) : fallback
}

export async function GET(req: NextRequest, context: { params: Promise<{ runId: string }> }) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const { runId } = await context.params
    if (!z.string().uuid().safeParse(runId).success) return NextResponse.json({ ok: false, error: "Invalid run ID" }, { status: 400 })
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Supabase service_role not configured" }, { status: 503 })

    const { data: run, error } = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).select("*").eq("id", runId).single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 })
    const { data: recentFailures } = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
      .select("domain, error_message, attempts, updated_at")
      .eq("run_id", runId)
      .eq("status", "failed")
      .order("updated_at", { ascending: false })
      .limit(20)

    const limit = boundedInteger(req.nextUrl.searchParams.get("limit"), 100, 100)
    const page = boundedInteger(req.nextUrl.searchParams.get("page"), 1, 10_000)
    const reviewStatus = req.nextUrl.searchParams.get("reviewStatus")
    const allowedReviewStatuses = new Set(["not_required", "pending", "promoting", "approved", "rejected", "promotion_failed"])
    let itemsQuery = sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUN_ITEMS)
      .select("id, company_name, domain, source_page_url, status, quality_status, quality_reasons, quality_gate, opportunity_score, form_url, form_method, form_confidence, form_verified, form_checked_at, form_qualification_reason, review_status, reviewed_by, reviewed_at, review_note, promotion_attempts, promotion_error, twenty_synced, updated_at", { count: "exact" })
      .eq("run_id", runId)
      .order("updated_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1)
    if (reviewStatus && allowedReviewStatuses.has(reviewStatus)) itemsQuery = itemsQuery.eq("review_status", reviewStatus)
    const { data: recentItems, error: itemsError, count: itemTotal } = await itemsQuery
    if (itemsError) console.error("[lead-candidates/runs] recent items failed:", itemsError.message)

    const events = await sb.from(DB_TABLES.SALES_LEAD_OPERATOR_EVENTS)
      .select("id, entity_type, entity_id, action, operator_name, detail, created_at")
      .eq("run_id", runId)
      .order("created_at", { ascending: false })
      .limit(30)
    if (events.error) console.error("[lead-candidates/runs] operator events failed:", events.error.message)

    return NextResponse.json({ ok: true, run, recentItems: recentItems ?? [], itemTotal: itemTotal ?? 0, page, limit, recentFailures: recentFailures ?? [], operatorEvents: events.data ?? [] })
  } catch (error) {
    console.error("[lead-candidates/runs] status request failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Run status request failed" }, { status: 500 })
  }
}

const PatchSchema = z.object({
  action: z.literal("cancel"),
  operatorName: z.string().trim().min(2).max(120),
  note: z.string().trim().min(3).max(500),
})

export async function PATCH(req: NextRequest, context: { params: Promise<{ runId: string }> }) {
  const { runId } = await context.params
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    if (!z.string().uuid().safeParse(runId).success) return NextResponse.json({ ok: false, error: "Invalid run ID" }, { status: 400 })
    const parsed = PatchSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Supabase service_role not configured" }, { status: 503 })
    await recordLeadOperatorEvent({ runId, entityType: "run", entityId: runId, action: "run_cancellation_requested", operatorName: parsed.data.operatorName, detail: { note: parsed.data.note } })
    const updated = await sb.from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS).update({
      cancel_requested: true,
      status: "cancelled",
      completed_at: new Date().toISOString(),
    }).eq("id", runId).in("status", ["queued", "running", "partial", "failed"]).select("id").maybeSingle()
    if (updated.error) throw new Error(updated.error.message)
    if (!updated.data) return NextResponse.json({ ok: false, error: "Completed or already cancelled runs cannot be cancelled" }, { status: 409 })
    await recordLeadOperatorEvent({ runId, entityType: "run", entityId: runId, action: "run_cancelled", operatorName: parsed.data.operatorName, detail: { note: parsed.data.note } })
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", { title: "Lead Factoryラン停止", message: `${runId}を停止しました。外部送信は実行されていません。`, link: "/ja/admin/lead-factory", type: "lead_factory_run_cancelled" })
    } catch (error) {
      console.error("[lead-candidates/runs] cancellation notification failed:", error)
    }
    return NextResponse.json({ ok: true, runId, status: "cancelled" })
  } catch (error) {
    console.error("[lead-candidates/runs] cancellation failed:", runId, error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Run cancellation failed" }, { status: 500 })
  }
}
