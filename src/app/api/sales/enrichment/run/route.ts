import { NextRequest, NextResponse } from "next/server"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"
import type { SalesEnrichmentJob } from "@/lib/sales/enrichment-jobs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    if (!(await isSalesApiAuthorized(req))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    let limit = 3
    try {
      const body = await req.json() as { limit?: number }
      if (body.limit && typeof body.limit === "number") {
        limit = Math.max(1, Math.min(5, Math.round(body.limit)))
      }
    } catch (error) {
      console.warn("[enrichment-run] request body parse failed; using default limit:", error)
    }

    // Fire in background — enrichment is heavy (31 sources per company)
    const runEnrichment = async () => {
      try {
        const { runEnrichmentJobs } = await import("@/lib/sales/enrichment-jobs-runner")
        const jobResult = await runEnrichmentJobs(limit)
        if (jobResult.processed > 0) {
          console.warn("[enrichment-run] processed jobs:", jobResult.completed)
          return
        }

        const { getServiceSalesSupabase } = await import("@/lib/supabase")
        const { DB_TABLES } = await import("@/lib/sales/db-tables")
        const sb = getServiceSalesSupabase()
        if (!sb) return

        const { data: companies } = await sb
          .from(DB_TABLES.SALES_COMPANIES)
          .select("id, domain, company_name, region, report_locale, target_country, source, meta")
          .in("pipeline_status", ["scanning", "pending"])
          .order("created_at", { ascending: false })
          .limit(limit)

        if (!companies || companies.length === 0) {
          console.warn("[enrichment-run] no scanning/pending companies found")
          return
        }

        const { processJob } = await import("@/lib/sales/enrichment-jobs-runner")
        for (const company of companies) {
          try {
            const now = new Date().toISOString()
            const pseudoJob: SalesEnrichmentJob = {
              id: `direct-${company.id.slice(0, 8)}`, company_id: company.id,
              job_type: "company_karte", status: "queued", priority: 50,
              attempts: 0, max_attempts: 1, source: company.source,
              triggered_by: "direct_enrichment", next_run_at: now,
              started_at: null, completed_at: null, locked_at: null, lock_owner: null,
              error_message: null, input_payload: {}, result_payload: {},
              created_at: now, updated_at: now,
            }
            await processJob(sb, pseudoJob)
          } catch (e) {
            console.error("[enrichment-run] company enrichment failed:", company.domain, e)
          }
        }
      } catch (e) {
        console.error("[enrichment-run] background failed:", e)
      }
    }

    runEnrichment().catch(async (e) => {
      console.error("[enrichment-run] fatal:", e)
      try {
        const { notifyBothChannels } = await import("@/lib/notify")
        await notifyBothChannels("sales", {
          title: "⚠️ バックグラウンドエンリッチメントが致命的エラーで停止",
          message: e instanceof Error ? e.message : String(e),
          type: "enrichment_fatal",
        })
      } catch (notifyError) {
        console.warn(
          "[enrichment-run] fatal notification failed:",
          notifyError instanceof Error ? notifyError.message : String(notifyError),
        )
      }
    })

    return NextResponse.json({
      ok: true,
      status: "started",
      message: `Enrichment started in background. Processing up to ${limit} companies. Check Supabase for results.`,
    })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "request failed" },
      { status: 400 },
    )
  }
}
