import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { ingestLeadCandidatesDurable } from "@/lib/sales/lead-candidate-runs"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BodySchema = z.object({
  countryCodes: z.array(z.string().length(2)).min(1).max(20),
  technology: z.string().trim().min(1).max(80).optional(),
  limitPerCountry: z.number().int().min(1).max(10_000).default(1_000),
  verifyPerCountry: z.number().int().min(1).max(5_000).default(120),
  minOpportunityScore: z.number().int().min(0).max(100).default(68),
  minSmbScore: z.number().int().min(0).max(100).default(50),
  minFormConfidence: z.number().int().min(0).max(100).default(80),
})

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const output: R[] = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      output[index] = await fn(items[index] as T)
    }
  })
  await Promise.all(workers)
  return output
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const sb = getServiceSalesSupabase()
    if (!sb) return NextResponse.json({ ok: false, error: "Sales Supabase not configured" }, { status: 503 })
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 30), 1), 100)
    const { data, error } = await sb
      .from(DB_TABLES.SALES_LEAD_CANDIDATE_RUNS)
      .select("id, country_code, technology, status, requested_limit, verify_limit, min_opportunity_score, min_smb_score, min_form_confidence, fetched_count, verified_count, scored_count, forms_checked_count, forms_qualified_count, promoted_count, twenty_synced_count, failure_count, error_message, created_at, updated_at")
      .eq("source_slug", "multi_source_domains")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, runs: data ?? [] })
  } catch (error) {
    console.error("[lead-candidate-factory] list failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Factory runs could not be loaded" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    const parsed = BodySchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 })
    const countryCodes = [...new Set(parsed.data.countryCodes.map((code) => code.toUpperCase()))]
    const runs = await mapLimit(countryCodes, 2, async (countryCode) => ingestLeadCandidatesDurable({
      countryCode,
      technology: parsed.data.technology,
      limit: parsed.data.limitPerCountry,
      verifyLimit: parsed.data.verifyPerCountry,
      promote: true,
      minOpportunityScore: parsed.data.minOpportunityScore,
      minSmbScore: parsed.data.minSmbScore,
      requireVerifiedForm: true,
      minFormConfidence: parsed.data.minFormConfidence,
      syncTwenty: true,
    }))
    const failed = runs.filter((run) => !run.ok)
    try {
      const { notifyBothChannels } = await import("@/lib/notify")
      await notifyBothChannels("sales", {
        title: `フォーム適格リスト量産: ${runs.length}地域`,
        message: `候補取得→実フォーム確認→合格企業のみTwenty同期。送信・文面生成・レポート生成は起動しません。開始失敗${failed.length}件。`,
        link: "/ja/admin/lead-factory",
        type: "form_qualified_lead_factory_started",
      })
    } catch (error) {
      console.error("[lead-candidate-factory] notification failed:", error)
    }
    return NextResponse.json({ ok: failed.length === 0, runs, failed: failed.length }, { status: failed.length === 0 ? 202 : 207 })
  } catch (error) {
    console.error("[lead-candidate-factory] start failed:", error)
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Factory could not be started" }, { status: 500 })
  }
}
