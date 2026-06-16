import { NextRequest, NextResponse } from "next/server"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { triggerEnrichmentRunner } from "@/lib/sales/enrichment-jobs"
import { DB_TABLES } from "@/lib/sales/db-tables"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { jobId } = await req.json() as { jobId: string }
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json({ ok: false, error: "jobId is required" }, { status: 400 })
    }

    const sb = getServiceSalesSupabase()
    if (!sb) {
      return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })
    }

    // Reset job to queued status
    const { error } = await sb
      .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
      .update({
        status: "queued",
        attempts: 0,
        error_message: null,
        next_run_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .in("status", ["failed", "cancelled"])

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    // Trigger immediate processing
    const trigger = await triggerEnrichmentRunner(3)

    return NextResponse.json({ ok: true, jobId, runnerTriggered: trigger.ok })
  } catch (e) {
    console.error("[enrichment-retry] failed:", e)
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const sb = getServiceSalesSupabase()
  if (!sb) return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 500 })

  const { data, error, count } = await sb
    .from(DB_TABLES.SALES_ENRICHMENT_JOBS)
    .select("id, company_id, job_type, status, attempts, max_attempts, error_message, created_at, updated_at, sales_companies(company_name, domain)", { count: "exact" })
    .in("status", ["failed"])
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const jobs = ((data ?? []) as unknown[]).map((item: unknown) => {
    const job = item as Record<string, unknown>
    const company = (Array.isArray(job.sales_companies) ? (job.sales_companies as Record<string, unknown>[])[0] : job.sales_companies) as Record<string, unknown> | null
    return {
      id: job.id,
      companyId: job.company_id,
      companyName: company?.company_name ?? null,
      domain: company?.domain ?? null,
      jobType: job.job_type,
      status: job.status,
      attempts: job.attempts,
      maxAttempts: job.max_attempts,
      errorMessage: job.error_message,
      createdAt: job.created_at,
    }
  })

  return NextResponse.json({ ok: true, total: count ?? 0, jobs })
}
