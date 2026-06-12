import { NextRequest, NextResponse } from "next/server"
import { authorizeWebhookRequest } from "@/lib/admin-auth"
import { getServiceSupabase } from "@/lib/supabase"
import { Pool } from "pg"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

let pool: Pool | null = null
let directPool: Pool | null = null

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

function getDirectPool(): Pool | null {
  if (directPool) return directPool
  const uri = process.env.DATABASE_URI
  if (!uri) return null
  try {
    const u = new URL(uri)
    const ref = u.username?.split(".")[1] || "yihdmgtxiqfdgdueolub"
    directPool = new Pool({
      host: `db.${ref}.supabase.co`,
      port: 5432,
      database: "postgres",
      user: u.username,
      password: u.password,
      ssl: { rejectUnauthorized: false },
      family: 4, // Force IPv4 — IPv6 may not be available
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    })
    return directPool
  } catch {
    return null
  }
}

async function executeSql(sql: string, useDirect = false): Promise<{ ok: boolean; error?: string }> {
  const p = useDirect ? getDirectPool() : getPool()
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

    const { data: before, error: beforeErr } = await sb
      .from("sales_companies")
      .select("id, report_locale")
      .limit(1)

    if (beforeErr) {
      results.push(`BEFORE: ${beforeErr.message}`)
    } else {
      results.push(`BEFORE: OK - ${JSON.stringify(before?.[0] || {})}`)
    }

    // Add columns
    const alterResults = await Promise.all([
      executeSql(`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS report_locale text NOT NULL DEFAULT 'ja'`),
      executeSql(`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS target_country text NOT NULL DEFAULT 'JP'`),
      executeSql(`ALTER TABLE IF EXISTS sales_companies ADD COLUMN IF NOT EXISTS template_variant text NOT NULL DEFAULT 'website_diagnostic'`),
    ])
    const colNames = ["report_locale", "target_country", "template_variant"]
    alterResults.forEach((r, i) => {
      results.push(`${colNames[i]} column: ${r.ok ? "ensured" : r.error?.slice(0, 100)}`)
    })

    // Create reload_schema function
    const funcRes = await executeSql(`
      CREATE OR REPLACE FUNCTION public.reload_schema()
      RETURNS void LANGUAGE plpgsql SECURITY DEFINER
      AS $$ BEGIN NOTIFY pgrst, 'reload schema'; END; $$;
    `)
    results.push(`reload_schema func: ${funcRes.ok ? "created" : funcRes.error?.slice(0, 100)}`)

    // Send NOTIFY via direct connection (IPv4 forced)
    const notifyRes = await executeSql(`NOTIFY pgrst, 'reload schema'`, true)
    results.push(`NOTIFY (direct IPv4): ${notifyRes.ok ? "sent" : notifyRes.error?.slice(0, 100)}`)

    await new Promise((r) => setTimeout(r, 3000))

    // Verify
    const { data: after, error: afterErr } = await sb
      .from("sales_companies")
      .select("id, report_locale, target_country, template_variant")
      .limit(1)

    if (afterErr) {
      results.push(`AFTER: ${afterErr.message}`)
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
