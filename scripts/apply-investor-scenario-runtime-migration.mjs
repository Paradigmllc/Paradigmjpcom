#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import pg from "pg"

const MIGRATION_FILE = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260803013000_investor_metro_scenarios.sql",
)

function databaseUri() {
  const names = [
    "SALES_SUPABASE_DATABASE_URL",
    "SUPABASE_DATABASE_URL",
    "DATABASE_URI",
    "DATABASE_URL",
  ]
  for (const name of names) {
    const value = process.env[name]
    if (typeof value === "string" && value.trim().length > 0) return value.trim()
  }
  throw new Error("Investor scenario runtime migration requires a database connection URI")
}

function sslFor(uri) {
  const host = new URL(uri).hostname.toLowerCase()
  if (host.endsWith(".supabase.co") || host.endsWith(".pooler.supabase.com")) {
    return { rejectUnauthorized: false }
  }
  return undefined
}

async function main() {
  if (!fs.existsSync(MIGRATION_FILE)) {
    throw new Error("Investor scenario runtime migration SQL is missing from the image")
  }

  const connectionString = databaseUri()
  const client = new pg.Client({
    connectionString,
    ssl: sslFor(connectionString),
    connectionTimeoutMillis: 15_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "investor_scenario_runtime_migration",
  })

  try {
    await client.connect()
    await client.query("SET search_path TO public, extensions")
    await client.query("SET lock_timeout TO '15s'")
    await client.query("SET statement_timeout TO '180s'")
    await client.query(fs.readFileSync(MIGRATION_FILE, "utf8"))
    await client.query("NOTIFY pgrst, 'reload schema'")

    const verification = await client.query(`
      WITH sections AS (
        SELECT section.value
        FROM public.investor_metro_scenarios AS scenario
        CROSS JOIN LATERAL jsonb_array_elements(scenario.payload -> 'analysisSections') AS section(value)
        WHERE scenario.is_indexable = true
      ), paragraphs AS (
        SELECT paragraph.value #>> '{}' AS body
        FROM sections
        CROSS JOIN LATERAL jsonb_array_elements(sections.value -> 'paragraphs') AS paragraph(value)
      )
      SELECT
        (SELECT count(*)::integer FROM public.investor_metro_scenarios WHERE is_indexable = true) AS scenario_count,
        (SELECT count(DISTINCT market_slug)::integer FROM public.investor_metro_scenarios WHERE is_indexable = true) AS market_count,
        (SELECT count(DISTINCT value ->> 'title')::integer FROM sections) AS unique_section_titles,
        (SELECT count(DISTINCT body)::integer FROM paragraphs) AS unique_paragraphs,
        (SELECT min(length(body))::integer FROM paragraphs) AS minimum_paragraph_length,
        relation.relrowsecurity AS rls_enabled,
        relation.relforcerowsecurity AS force_rls,
        has_table_privilege('anon', 'public.investor_metro_scenarios', 'SELECT') AS anon_select,
        has_table_privilege('authenticated', 'public.investor_metro_scenarios', 'SELECT') AS authenticated_select
      FROM pg_class AS relation
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname = 'investor_metro_scenarios'
    `)
    const row = verification.rows[0]
    const passed = row
      && row.scenario_count === 320
      && row.market_count === 16
      && row.unique_section_titles === 1_280
      && row.unique_paragraphs === 2_560
      && row.minimum_paragraph_length >= 500
      && row.rls_enabled === true
      && row.force_rls === true
      && row.anon_select === false
      && row.authenticated_select === false

    if (!passed) {
      throw new Error(`Investor scenario runtime verification failed: ${JSON.stringify(row)}`)
    }

    console.log(
      `[runtime-migration] investor scenarios ready: ${row.scenario_count} scenarios, ${row.market_count} markets, ${row.unique_paragraphs} unique paragraphs`,
    )
  } finally {
    await client.end().catch((error) => {
      console.error("[runtime-migration] database close failed:", error)
    })
  }
}

main().catch((error) => {
  console.error("[runtime-migration] investor scenario migration failed:", error)
  process.exitCode = 1
})
