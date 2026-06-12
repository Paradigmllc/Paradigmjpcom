import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getServiceSupabase } from "@/lib/supabase"
import { Pool } from "pg"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

let pool: Pool | null = null

function getPool(): Pool | null {
  if (pool) return pool
  const uri = process.env.DATABASE_URI
  if (!uri) return null
  pool = new Pool({
    connectionString: uri,
    max: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })
  return pool
}

async function executeSql(sql: string): Promise<{ ok: boolean; error?: string }> {
  const p = getPool()
  if (!p) return { ok: false, error: "DATABASE_URI not configured" }
  try {
    await p.query(sql)
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

    // Step 1: Add missing columns via direct PostgreSQL connection
    const alterResults = await Promise.all([
      executeSql(`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS report_locale text NOT NULL DEFAULT 'ja'`),
      executeSql(`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS target_country text NOT NULL DEFAULT 'JP'`),
      executeSql(`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS template_variant text NOT NULL DEFAULT 'website_diagnostic'`),
    ])

    const colNames = ["report_locale", "target_country", "template_variant"]
    alterResults.forEach((r, i) => {
      results.push(`${colNames[i]} column: ${r.ok ? "ensured" : `FAILED: ${r.error}`}`)
    })

    // Step 2: Create reload_schema function if not exists
    const createFuncSql = `
      CREATE OR REPLACE FUNCTION public.reload_schema()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        NOTIFY pgrst, 'reload schema';
      END;
      $$;
    `
    const funcRes = await executeSql(createFuncSql)
    results.push(`reload_schema function: ${funcRes.ok ? "created" : funcRes.error}`)

    // Step 3: Call reload_schema via RPC to refresh PostgREST cache
    try {
      const { error: rpcErr } = await sb.rpc("reload_schema", {})
      results.push(`reload_schema RPC: ${rpcErr ? rpcErr.message : "SUCCESS"}`)
    } catch (e) {
      results.push(`reload_schema RPC error: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Step 4: Verify after fix (with delay for PostgREST refresh)
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
