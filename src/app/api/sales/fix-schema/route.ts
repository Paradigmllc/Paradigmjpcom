import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getServiceSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const auth = authorizeWebhookRequest(req.headers)
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const sb = getServiceSupabase()
    if (!sb) {
      return NextResponse.json({ ok: false, error: "Supabase not configured" }, { status: 503 })
    }

    const results: string[] = []

    // Step 0: Check current state
    const { data: before, error: beforeErr } = await sb
      .from("sales_companies")
      .select("id, report_locale")
      .limit(1)

    if (beforeErr) {
      results.push(`BEFORE: error - ${beforeErr.message}`)
    } else {
      results.push(`BEFORE: OK - ${JSON.stringify(before?.[0] || {})}`)
    }

    // Step 1: Add missing columns via raw SQL (Supabase JS v2.39+ .sql template tag)
    try {
      const { error: e1 } = await sb.sql`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS report_locale text NOT NULL DEFAULT 'ja'`
      results.push(`report_locale column: ${e1 ? String(e1.message) : "ensured"}`)
    } catch (e) {
      results.push(`report_locale column ERROR: ${e instanceof Error ? e.message : String(e)}`)
    }

    try {
      const { error: e2 } = await sb.sql`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS target_country text NOT NULL DEFAULT 'JP'`
      results.push(`target_country column: ${e2 ? String(e2.message) : "ensured"}`)
    } catch (e) {
      results.push(`target_country column ERROR: ${e instanceof Error ? e.message : String(e)}`)
    }

    try {
      const { error: e3 } = await sb.sql`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS template_variant text NOT NULL DEFAULT 'website_diagnostic'`
      results.push(`template_variant column: ${e3 ? String(e3.message) : "ensured"}`)
    } catch (e) {
      results.push(`template_variant column ERROR: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Step 2: Reload PostgREST schema cache
    try {
      const { error: notifyErr } = await sb.sql`NOTIFY pgrst, 'reload schema'`
      if (notifyErr) {
        results.push(`NOTIFY pgrst: ${notifyErr.message}`)
      } else {
        results.push("NOTIFY pgrst: sent")
      }
    } catch (e) {
      results.push(`NOTIFY pgrst: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Step 3: Verify after fix (with small delay for PostgREST refresh)
    await new Promise((r) => setTimeout(r, 3000))

    const { data: after, error: afterErr } = await sb
      .from("sales_companies")
      .select("id, report_locale, target_country, template_variant")
      .limit(1)

    if (afterErr) {
      results.push(`AFTER: error - ${afterErr.message}`)
    } else {
      results.push(`AFTER: OK - ${JSON.stringify(after?.[0] || {})}`)
    }

    return NextResponse.json({ ok: true, results, fixed: !afterErr })
  } catch (error) {
    console.error("[sales-fix-schema] failed:", error)
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Schema fix failed"
    }, { status: 500 })
  }
}
