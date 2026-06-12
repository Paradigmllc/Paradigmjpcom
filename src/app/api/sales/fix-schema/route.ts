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

    // Check current state
    const { data: before, error: beforeErr } = await sb
      .from("sales_companies")
      .select("id, report_locale")
      .limit(1)

    if (beforeErr) {
      results.push(`BEFORE: error - ${beforeErr.message}`)
    } else {
      results.push(`BEFORE: OK - ${JSON.stringify(before?.[0] || {})}`)
    }

    // Try NOTIFY pgrst via RPC
    try {
      const { error: notifyErr } = await sb.rpc("reload_schema", {})
      if (notifyErr) {
        results.push(`reload_schema RPC: ${notifyErr.message}`)
      } else {
        results.push("reload_schema RPC: SUCCESS")
      }
    } catch (e) {
      results.push(`reload_schema RPC catch: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Check after
    const { data: after, error: afterErr } = await sb
      .from("sales_companies")
      .select("id, report_locale")
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
