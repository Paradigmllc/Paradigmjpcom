import { NextRequest, NextResponse } from "next/server"
import pg from "pg"
import { isSalesApiAuthorized } from "@/lib/sales/api-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const ABOLISH_PERIODIC_JOBS_SQL = `
DO $$
DECLARE
  job_name text;
  cron_job_names text[] := ARRAY[
    'companies-notion-sync',
    'templates-notion-sync',
    'daily-sales-report',
    'weekly-sales-digest',
    'sales-company-enrichment',
    'sales-report-regenerator'
  ];
BEGIN
  FOREACH job_name IN ARRAY cron_job_names LOOP
    BEGIN
      PERFORM cron.unschedule(job_name);
      RAISE NOTICE 'pg_cron job unscheduled: %', job_name;
    EXCEPTION
      WHEN undefined_function OR undefined_table OR invalid_schema_name THEN
        RAISE NOTICE 'pg_cron not available, skipping unschedule of %', job_name;
      WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron job % not present or already removed: %', job_name, SQLERRM;
    END;
  END LOOP;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron not available, nothing to sweep';
    RETURN;
  END IF;

  FOR r IN SELECT jobname FROM cron.job LOOP
    BEGIN
      PERFORM cron.unschedule(r.jobname);
      RAISE NOTICE 'pg_cron residual job unscheduled: %', r.jobname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron residual job % could not be unscheduled: %', r.jobname, SQLERRM;
    END;
  END LOOP;
END $$;
`

interface Attempt {
  target: string
  ssl: boolean
  error: string
}

function envValue(name: string): string | null {
  const value = process.env[name]
  if (typeof value !== "string" || value.trim().length === 0) return null
  return value
}

function connectionCandidates(): string[] {
  const names = [
    "SALES_SUPABASE_DATABASE_URL",
    "SUPABASE_DATABASE_URL",
    "DATABASE_URI",
    "DATABASE_URL",
  ] as const
  const seen = new Set<string>()
  const uris: string[] = []

  for (const name of names) {
    const value = envValue(name)
    if (!value || seen.has(value)) continue
    seen.add(value)
    uris.push(value)
  }

  return uris
}

function targetLabel(connectionString: string): string {
  try {
    const url = new URL(connectionString)
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}/${url.pathname.replace(/^\//, "")}`
  } catch (error) {
    console.warn("[abolish-periodic-jobs] failed to parse connection target:", error)
    return "unparseable-db-url"
  }
}

function shouldPreferSsl(connectionString: string): boolean {
  try {
    const host = new URL(connectionString).hostname
    return !["localhost", "127.0.0.1", "host.docker.internal", "paradigm-supabase-db"].includes(host)
  } catch (error) {
    console.warn("[abolish-periodic-jobs] failed to parse ssl target:", error)
    return true
  }
}

function isSslUnsupported(error: unknown): boolean {
  const message = safeError(error).toLowerCase()
  return message.includes("does not support ssl") || message.includes("ssl off")
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 240)
}

async function runAgainstDatabase(connectionString: string, useSsl: boolean) {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  })

  await client.connect()
  try {
    await client.query("SET lock_timeout = '5s'")
    await client.query("SET statement_timeout = '30s'")

    const cronTable = await client.query<{ cron_job_table: string | null }>(
      "SELECT to_regclass('cron.job')::text AS cron_job_table",
    )
    if (!cronTable.rows[0]?.cron_job_table) {
      return {
        cronJobTable: false,
        before: 0,
        remaining: 0,
        jobs: [],
      }
    }

    const before = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM cron.job")
    await client.query(ABOLISH_PERIODIC_JOBS_SQL)
    const after = await client.query<{ jobid: number; jobname: string; active: boolean }>(
      "SELECT jobid, jobname, active FROM cron.job ORDER BY jobid",
    )

    return {
      cronJobTable: true,
      before: Number(before.rows[0]?.count ?? 0),
      remaining: after.rows.length,
      jobs: after.rows.map((job) => ({
        id: job.jobid,
        name: job.jobname,
        active: job.active,
      })),
    }
  } finally {
    await client.end()
  }
}

export async function POST(req: NextRequest) {
  if (!(await isSalesApiAuthorized(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  const candidates = connectionCandidates()
  if (candidates.length === 0) {
    console.error("[abolish-periodic-jobs] no database connection env configured")
    return NextResponse.json(
      { ok: false, error: "No database connection env configured" },
      { status: 503 },
    )
  }

  const attempts: Attempt[] = []
  for (const connectionString of candidates) {
    const target = targetLabel(connectionString)
    const sslModes = shouldPreferSsl(connectionString) ? [true, false] : [false]
    for (const useSsl of sslModes) {
      try {
        const result = await runAgainstDatabase(connectionString, useSsl)
        return NextResponse.json({ ok: true, target, ssl: useSsl, ...result })
      } catch (error) {
        const message = safeError(error)
        attempts.push({ target, ssl: useSsl, error: message })
        console.warn(`[abolish-periodic-jobs] ${target} failed with ssl=${useSsl}: ${message}`)
        if (useSsl && isSslUnsupported(error)) continue
        break
      }
    }
  }

  console.error("[abolish-periodic-jobs] all database targets failed")
  return NextResponse.json(
    { ok: false, error: "Failed to abolish periodic jobs from all configured database targets", attempts },
    { status: 500 },
  )
}
