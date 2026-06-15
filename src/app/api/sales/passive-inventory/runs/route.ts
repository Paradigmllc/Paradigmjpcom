import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyWebhookSecret } from "@/lib/sales/auth"
import { startPassiveInventoryRunAndDispatch } from "@/lib/sales/passive-inventory-runner"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const BodySchema = z.object({
  countryCode: z.string().trim().min(2).max(2),
  technology: z.string().trim().min(1).max(80).nullable().optional(),
  limit: z.coerce.number().int().min(1).max(10_000_000).optional(),
  segmentLimit: z.coerce.number().int().min(1).max(100_000).optional(),
  patterns: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
})

export async function POST(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr

  let body: unknown
  try {
    body = await req.json()
  } catch (error) {
    console.error("[passive-inventory/runs] invalid JSON:", error)
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 })

  try {
    const run = await startPassiveInventoryRunAndDispatch(parsed.data)
    return NextResponse.json({ ok: true, run })
  } catch (error) {
    console.error("[passive-inventory/runs] create failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Passive inventory run failed" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const authErr = verifyWebhookSecret(req)
  if (authErr) return authErr
  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase service_role not configured" }, { status: 500 })

  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 20), 1), 100)
  const { data, error } = await sb
    .from(DB_TABLES.SALES_PASSIVE_INVENTORY_RUNS)
    .select("id, status, country_code, technology, requested_limit, fetched_domains_count, stack_matched_count, geo_matched_count, cursor, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, runs: data ?? [] })
}
