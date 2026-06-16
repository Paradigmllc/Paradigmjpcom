import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getServiceSalesSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const auth = authorizeWebhookRequest(req.headers)
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const sb = getServiceSalesSupabase()
    if (!sb) {
      return NextResponse.json({ ok: false, error: "Supabase service_role not configured" }, { status: 503 })
    }

    const results: string[] = []

    // 1. Ensure report_locale column exists
    const { error: colError } = await sb.rpc("run_sql", {
      query: `ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS report_locale text NOT NULL DEFAULT 'ja'`
    }).maybeSingle()
    if (colError) {
      // rpc might not exist, try direct
      results.push(`report_locale column: ${colError.message}`)
    } else {
      results.push("report_locale column: ensured")
    }

    // 2. Ensure target_country column exists
    await sb.rpc("run_sql", {
      query: `ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS target_country text NOT NULL DEFAULT 'JP'`
    }).maybeSingle()

    // 3. Ensure template_variant column exists
    await sb.rpc("run_sql", {
      query: `ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS template_variant text NOT NULL DEFAULT 'website_diagnostic'`
    }).maybeSingle()

    // 4. Reload PostgREST schema cache
    const { error: notifyError } = await sb.rpc("notify_pgrst_reload").maybeSingle()
    if (notifyError) {
      // Try NOTIFY directly if RPC doesn't exist
      try {
        await sb.rpc("run_sql", {
          query: `NOTIFY pgrst, 'reload schema'`
        }).maybeSingle()
        results.push("pgrst reload: notified")
      } catch (e) {
        console.warn("[sales-run-migration] pgrst NOTIFY fallback failed:", e)
        results.push(`pgrst reload: attempted via SQL`)
      }
    } else {
      results.push("pgrst reload: ok")
    }

    // 5. Verify columns exist by querying
    const { data: colData, error: queryError } = await sb
      .from("sales_companies")
      .select("id, report_locale, target_country, template_variant")
      .limit(1)

    if (queryError) {
      results.push(`verify: FAILED - ${queryError.message}`)
    } else {
      results.push(`verify: OK - columns accessible (sample: ${JSON.stringify(colData?.[0])})`)
    }

    return NextResponse.json({
      ok: true,
      results,
      done: !queryError
    })
  } catch (error) {
    console.error("[sales-run-migration] failed:", error)
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Migration failed"
    }, { status: 500 })
  }
}
