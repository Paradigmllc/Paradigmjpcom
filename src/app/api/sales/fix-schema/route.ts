import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getServiceSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function executeSql(sql: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    return { ok: false, error: "SUPABASE_URL or SERVICE_ROLE_KEY not configured" }
  }

  try {
    const res = await fetch(`${url}/rest/v1/sql`, {
      method: "POST",
      headers: {
        "apikey": key,
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    })

    const body = await res.text()
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 300)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

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

    // Step 1: Add missing columns via REST API SQL endpoint
    const alterResults = await Promise.all([
      executeSql(`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS report_locale text NOT NULL DEFAULT 'ja'`),
      executeSql(`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS target_country text NOT NULL DEFAULT 'JP'`),
      executeSql(`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS template_variant text NOT NULL DEFAULT 'website_diagnostic'`),
    ])

    const colNames = ["report_locale", "target_country", "template_variant"]
    alterResults.forEach((r, i) => {
      results.push(`${colNames[i]} column: ${r.ok ? "ensured" : `FAILED: ${r.error}`}`)
    })

    // Step 2: Reload PostgREST schema cache
    const notifyRes = await executeSql(`NOTIFY pgrst, 'reload schema'`)
    results.push(`NOTIFY pgrst: ${notifyRes.ok ? "sent" : notifyRes.error}`)

    // Step 3: Verify after fix (with delay for PostgREST refresh)
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
