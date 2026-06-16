import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getSalesSupabaseConfig } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const auth = authorizeWebhookRequest(req.headers)
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const config = getSalesSupabaseConfig()

    if (!config) {
      return NextResponse.json({
        ok: false,
        error: "Sales Supabase service configuration is missing"
      }, { status: 503 })
    }

    const results: string[] = []
    const baseUrl = config.url.replace(/\/+$/, "")

    // Step 1: Try to query sales_companies to see current state
    const res1 = await fetch(
      `${baseUrl}/rest/v1/sales_companies?select=id,report_locale,target_country,template_variant&limit=1`,
      {
        headers: {
          apikey: config.serviceKey,
          Authorization: `Bearer ${config.serviceKey}`,
          Accept: "application/json",
        },
      }
    )
    const body1 = await res1.text()
    if (res1.ok) {
      results.push(`columns exist: ${body1.slice(0, 200)}`)
      return NextResponse.json({ ok: true, results, already_ok: true })
    }
    results.push(`current state: ${body1.slice(0, 300)}`)

    // Step 2: Try to call NOTIFY pgrst via RPC if exists
    try {
      const resNotify = await fetch(`${baseUrl}/rest/v1/rpc/reload_schema`, {
        method: "POST",
        headers: {
          apikey: config.serviceKey,
          Authorization: `Bearer ${config.serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })
      const bodyNt = await resNotify.text()
      results.push(`reload_schema RPC: ${bodyNt.slice(0, 200)}`)
    } catch (e) {
      results.push(`reload_schema RPC failed: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Step 3: Retry query to see if schema cache refreshed
    const res2 = await fetch(
      `${baseUrl}/rest/v1/sales_companies?select=id,report_locale&limit=1`,
      {
        headers: {
          apikey: config.serviceKey,
          Authorization: `Bearer ${config.serviceKey}`,
          Accept: "application/json",
        },
      }
    )
    const body2 = await res2.text()
    results.push(`after reload: ${body2.slice(0, 300)}`)

    return NextResponse.json({
      ok: res2.ok,
      source: config.source,
      results,
      done: res2.ok,
    })
  } catch (error) {
    console.error("[sales-db-check] failed:", error)
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "DB check failed"
    }, { status: 500 })
  }
}
