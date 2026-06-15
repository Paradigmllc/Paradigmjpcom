import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { processPassiveInventoryRun, startPassiveInventoryFallback, triggerPassiveInventoryRunner } from "@/lib/sales/passive-inventory-runner"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const ParamsSchema = z.object({ runId: z.string().uuid() })
const ProcessSchema = z.object({
  maxSegments: z.coerce.number().int().min(1).max(20).optional(),
  mode: z.enum(["dispatch", "inline", "fallback"]).optional(),
})

function parseRunId(raw: unknown) {
  return ParamsSchema.safeParse(raw)
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr
  const params = parseRunId(await ctx.params)
  if (!params.success) return NextResponse.json({ ok: false, error: params.error.flatten() }, { status: 400 })
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase service_role not configured" }, { status: 500 })

  const run = await sb
    .from(DB_TABLES.SALES_PASSIVE_INVENTORY_RUNS)
    .select("id, status, country_code, technology, requested_limit, fetched_domains_count, cname_checked_count, stack_matched_count, geo_matched_count, cursor, errors, created_at, updated_at")
    .eq("id", params.data.runId)
    .single()
  if (run.error) return NextResponse.json({ ok: false, error: run.error.message }, { status: 500 })

  const segments = await sb
    .from(DB_TABLES.SALES_PASSIVE_INVENTORY_SEGMENTS)
    .select("id, segment_key, source_kind, pattern, status, input_count, checked_count, stack_matched_count, geo_matched_count, persisted_count, failure_count, error_message, cursor, updated_at")
    .eq("run_id", params.data.runId)
    .order("created_at", { ascending: true })
  if (segments.error) return NextResponse.json({ ok: false, error: segments.error.message }, { status: 500 })

  return NextResponse.json({ ok: true, run: run.data, segments: segments.data ?? [] })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr
  const params = parseRunId(await ctx.params)
  if (!params.success) return NextResponse.json({ ok: false, error: params.error.flatten() }, { status: 400 })

  let body: unknown = {}
  try {
    body = await req.json()
  } catch (error) {
    console.warn("[passive-inventory/runs/runId] empty or invalid JSON:", error)
  }
  const parsed = ProcessSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })

  try {
    if (parsed.data.mode === "inline") {
      const result = await processPassiveInventoryRun(params.data.runId, { maxSegments: parsed.data.maxSegments })
      return NextResponse.json({ ok: true, mode: "inline", result })
    }
    if (parsed.data.mode === "fallback") {
      const fallback = startPassiveInventoryFallback(params.data.runId)
      return NextResponse.json({ ok: true, mode: "fallback", fallback })
    }
    const trigger = await triggerPassiveInventoryRunner(params.data.runId)
    const fallback = trigger.ok ? { started: false, alreadyRunning: false } : startPassiveInventoryFallback(params.data.runId)
    return NextResponse.json({ ok: trigger.ok || fallback.started || fallback.alreadyRunning, mode: "dispatch", trigger, fallback })
  } catch (error) {
    console.error("[passive-inventory/runs/runId] process failed:", params.data.runId, error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Passive inventory processing failed" }, { status: 500 })
  }
}
