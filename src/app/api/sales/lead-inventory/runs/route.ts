import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { createLeadInventoryRun, listLeadInventoryRuns, startLeadInventoryRun } from "@/lib/sales/lead-inventory-runs"
import { recordLeadOperatorEvent } from "@/lib/sales/lead-operator-audit"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BodySchema = z.object({
  operatorName: z.string().trim().min(2).max(120),
  sourceConfigIds: z.array(z.string().uuid()).min(1).max(100).optional(),
  resumeRunId: z.string().uuid().optional(),
}).refine((value) => !(value.sourceConfigIds && value.resumeRunId), "Choose source configs or resume, not both")

export async function GET(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 20) || 20, 1), 100)
    return NextResponse.json({ ok: true, runs: await listLeadInventoryRuns(limit) })
  } catch (error) {
    console.error("[lead-inventory-runs] list route failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Inventory runs could not be loaded" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Sales Supabase not configured" }, { status: 503 })

    if (parsed.data.resumeRunId) {
      const existing = await sb.from(DB_TABLES.SALES_LEAD_INVENTORY_RUNS).select("id,status").eq("id", parsed.data.resumeRunId).single()
      if (existing.error) return NextResponse.json({ ok: false, error: existing.error.message }, { status: 404 })
      if (!["queued", "running"].includes(String(existing.data.status))) {
        return NextResponse.json({ ok: false, error: "Only a queued or interrupted running inventory run can be resumed" }, { status: 409 })
      }
      const runner = startLeadInventoryRun(parsed.data.resumeRunId)
      await recordLeadOperatorEvent({
        entityType: "run",
        entityId: parsed.data.resumeRunId,
        action: "verified_inventory_resumed",
        operatorName: parsed.data.operatorName,
      })
      return NextResponse.json({ ok: true, runId: parsed.data.resumeRunId, runner }, { status: 202 })
    }

    let query = sb.from(DB_TABLES.SALES_LEAD_SOURCE_CONFIGS)
      .select("id")
      .eq("active", true)
      .eq("terms_checked", true)
      .eq("approval_status", "approved")
      .not("source_pack_id", "is", null)
    if (parsed.data.sourceConfigIds) query = query.in("id", parsed.data.sourceConfigIds)
    const sources = await query.limit(100)
    if (sources.error) throw new Error(sources.error.message)
    const sourceConfigIds = (sources.data ?? []).map((row) => String(row.id))
    if (sourceConfigIds.length === 0) {
      return NextResponse.json({ ok: false, error: "No active, terms-confirmed and approved source packs are ready" }, { status: 409 })
    }
    if (parsed.data.sourceConfigIds && sourceConfigIds.length !== new Set(parsed.data.sourceConfigIds).size) {
      return NextResponse.json({ ok: false, error: "One or more selected source packs are not approved and active" }, { status: 409 })
    }

    const run = await createLeadInventoryRun({ operatorName: parsed.data.operatorName, sourceConfigIds })
    await recordLeadOperatorEvent({
      entityType: "run",
      entityId: run.id,
      action: "verified_inventory_started",
      operatorName: parsed.data.operatorName,
      detail: { sourceCount: sourceConfigIds.length, sendCount: 0, twentySyncCount: 0 },
    })
    const runner = startLeadInventoryRun(run.id)
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: `検証済み候補在庫を開始: ${sourceConfigIds.length}収集元`,
        message: "公式データ取込とサイト事前検査のみ開始しました。Twenty同期・文面生成・レポート生成・外部送信は実行しません。",
        link: "/ja/admin/lead-factory",
        type: "verified_lead_inventory_started",
      })
    } catch (error) {
      console.error("[lead-inventory-runs] start notification failed:", error)
    }
    return NextResponse.json({ ok: true, run, runner }, { status: 202 })
  } catch (error) {
    console.error("[lead-inventory-runs] start route failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Inventory run could not be started" }, { status: 500 })
  }
}
