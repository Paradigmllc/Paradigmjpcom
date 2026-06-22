#!/usr/bin/env node
/**
 * verify-db-tables.mjs — Sales OS 全テーブル実在チェック
 *
 * db-tables.ts に登録された全テーブルが本番 Supabase に存在するか検証する。
 * 不足テーブルがあればエラー終了し、レポートを出力。
 *
 * 使用法:
 *   node scripts/verify-db-tables.mjs
 *   node scripts/verify-db-tables.mjs --fix    # 不足テーブルをマイグレーションで作成試行
 *
 * 環境変数:
 *   NEXT_PUBLIC_SUPABASE_URL  or SALES_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY or SALES_SUPABASE_SERVICE_ROLE_KEY
 */

import { spawnSync } from "node:child_process";

const ALL_TABLES = [
  // CMS
  "cms_posts", "cms_services", "cms_pricing", "cms_faqs", "cms_works",
  "cms_settings", "cms_media", "cms_content_blocks",
  // Sales OS Core
  "sales_companies", "sales_customers", "sales_deliveries", "sales_templates", "sales_campaigns",
  // Contracts & KPI
  "sales_contracts", "sales_kpi", "sales_products", "sales_company_product_recommendations",
  // Activity & Sync
  "sales_activity_log", "sales_sync_logs",
  // Operator Queue
  "sales_operator_queue_items",
  // Tool Connections
  "sales_tool_connections", "sales_integration_status",
  // Enrichment & Diagnosis
  "sales_enrichment_jobs", "sales_diagnosis_events",
  // Content Templates
  "sales_content_templates",
  // AI Prompts
  "sales_ai_prompts",
  // Agent
  "sales_agent_commands", "sales_agent_events",
  // Source Tech
  "sales_source_runs", "sales_tech_stack_detections",
  // Calendar
  "sales_calendar_events",
  // Lead Batches
  "sales_lead_batches", "sales_lead_batch_items",
  // Lead Candidates
  "sales_lead_candidate_domains", "sales_lead_candidate_observations",
  "sales_lead_candidate_country_signals", "sales_lead_candidate_tech_detections",
  "sales_lead_candidate_scores", "sales_lead_candidate_runs", "sales_lead_candidate_run_items",
  "sales_passive_inventory_runs", "sales_passive_inventory_domains", "sales_passive_inventory_segments",
  // Pipeline
  "sales_pipeline_runs", "sales_pipeline_steps", "sales_artifact_manifest",
  // CRM Field Config
  "sales_crm_view_fields", "sales_crm_select_options",
  // SearXNG
  "sales_searxng_search_runs", "sales_searxng_search_results",
  // Japan Readiness
  "sales_japan_readiness_insights",
  // Video
  "sales_video_jobs",
  // Platform Health
  "sales_platform_health_snapshots",
  // Infrastructure
  "sales_infrastructure_migration",
  // Error Log
  "sales_error_log",
  // Demo
  "web_demos", "diagnostic_reports", "diagnostic_runs",
  // Notifications
  "notifications", "sales_activities", "leads",
  // MVP (legacy)
  "mvp_campaigns", "mvp_outreach_runs", "mvp_optout_tokens", "mvp_blocklist",
  "mvp_click_events", "mvp_send_quotas",
  // Form / Persona
  "form_message_templates", "paradigm_personas",
  // Legacy Automation
  "prospects", "prospect_views", "prospect_patterns", "proposal_templates",
  // Agency
  "agency_companies", "agency_presentations", "agency_videos", "agency_demo_sites",
  "agency_reports",
];

function env(name) {
  return process.env[name]?.trim() || null;
}

const FETCH_TIMEOUT_MS = Number.parseInt(process.env.VERIFY_DB_FETCH_TIMEOUT_MS || "5000", 10);
const SSH_TIMEOUT_MS = Number.parseInt(process.env.VERIFY_DB_SSH_TIMEOUT_MS || "60000", 10);

function quoteSqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function isInternalDataApiUrl(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === "supabase-rest-1" ||
      host === "kong" ||
      host === "rest" ||
      host.endsWith(".internal") ||
      (!host.includes(".") && !host.endsWith("localhost"))
    );
  } catch {
    return false;
  }
}

function createTimedFetch(timeoutMs) {
  return async (input, init = {}) => {
    const signal = init.signal ?? AbortSignal.timeout(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000);
    return fetch(input, { ...init, signal });
  };
}

function buildTableExistenceSql() {
  return `
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name = any(array[${ALL_TABLES.map(quoteSqlString).join(", ")}])
order by table_name;
`;
}

function summarizeBulkRows(rows) {
  const found = new Set(rows.map((row) => String(row).trim()).filter(Boolean));
  const missing = [];
  let ok = 0;
  for (const table of ALL_TABLES) {
    process.stdout.write(`  ${table}... `);
    if (found.has(table)) {
      console.log("OK");
      ok++;
    } else {
      console.log("MISSING");
      missing.push(table);
    }
  }
  return { ok, missing, errored: [] };
}

function postgresUri() {
  const candidates = [
    env("SALES_SUPABASE_DATABASE_URL"),
    env("SUPABASE_DATABASE_URL"),
    env("DATABASE_URI"),
    env("DATABASE_URL"),
  ];
  return candidates.find((value) => value && value.length > 0) || null;
}

async function checkTablesThroughPostgres() {
  const connectionString = postgresUri();
  if (!connectionString) return null;

  try {
    const pg = await import("pg");
    const client = new pg.default.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10_000,
      query_timeout: 30_000,
      statement_timeout: 30_000,
    });
    await client.connect();
    try {
      const { rows } = await client.query(buildTableExistenceSql());
      return summarizeBulkRows(rows.map((row) => row.table_name));
    } finally {
      await client.end().catch(() => undefined);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Direct Postgres table verification unavailable: ${message.slice(0, 180)}`);
    return null;
  }
}

function checkTablesThroughHost() {
  const sshTarget = env("PARADIGM_SUPABASE_SSH_TARGET") || "root@178.105.138.55";
  const container = resolveHostDbContainer(sshTarget);
  const result = spawnSync(
    "ssh",
    [
      "-o",
      "BatchMode=yes",
      "-o",
      "StrictHostKeyChecking=accept-new",
      sshTarget,
      "docker",
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-t",
      "-A",
    ],
    {
      input: buildTableExistenceSql(),
      encoding: "utf8",
      timeout: Number.isFinite(SSH_TIMEOUT_MS) && SSH_TIMEOUT_MS > 0 ? SSH_TIMEOUT_MS : 60000,
      maxBuffer: 1024 * 1024,
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = `${result.stderr || result.stdout || ""}`.trim();
    throw new Error(`Host DB table verification failed: ${detail.slice(0, 240)}`);
  }
  return summarizeBulkRows(String(result.stdout || "").split("\n"));
}

function resolveHostDbContainer(sshTarget) {
  const explicit = env("PARADIGM_SUPABASE_DB_CONTAINER");
  if (explicit) return explicit;

  const result = spawnSync(
    "ssh",
    [
      "-o",
      "BatchMode=yes",
      "-o",
      "StrictHostKeyChecking=accept-new",
      sshTarget,
      "docker ps --format '{{.Names}}\t{{.Image}}'",
    ],
    {
      encoding: "utf8",
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = `${result.stderr || result.stdout || ""}`.trim();
    throw new Error(`Could not list host containers: ${detail.slice(0, 180)}`);
  }

  const rows = String(result.stdout || "")
    .split("\n")
    .map((line) => {
      const [name, image] = line.split("\t");
      return { name: name?.trim() || "", image: image?.trim() || "" };
    })
    .filter((row) => row.name.length > 0);

  const exact = rows.find((row) => row.name === "paradigm-supabase-db" || row.name === "supabase-db-1");
  if (exact) return exact.name;

  const candidate = rows.find((row) => /supabase.*db|db.*supabase/i.test(row.name) && /postgres/i.test(row.image));
  if (candidate) return candidate.name;

  throw new Error("Could not resolve Supabase Postgres container on host");
}

async function createSupabaseClient() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL") || env("SALES_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY") || env("SALES_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (or SALES_*) must be set");
    return null;
  }
  try {
    const { createClient } = await import("@supabase/supabase-js");
    return {
      client: createClient(url, key, {
        auth: { persistSession: false },
        global: { fetch: createTimedFetch(FETCH_TIMEOUT_MS) },
      }),
      url,
    };
  } catch (error) {
    console.error("ERROR: @supabase/supabase-js is not installed. Run: npm install @supabase/supabase-js");
    console.error(error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function checkTable(client, tableName) {
  try {
    const { error } = await client
      .from(tableName)
      .select("count", { count: "exact", head: true })
      .limit(0);
    if (error) {
      if (/relation.*does not exist/i.test(error.message) || error.code === "42P01") {
        return { exists: false, error: "table does not exist" };
      }
      return { exists: false, error: error.message };
    }
    return { exists: true };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}

async function main() {
  const fixMode = process.argv.includes("--fix");
  console.log("DB Table Verification");
  console.log("=====================");
  console.log();

  const supabase = await createSupabaseClient();
  if (!supabase) process.exit(1);

  console.log(`Connecting to: ${supabase.url}`);
  console.log();

  if (isInternalDataApiUrl(supabase.url)) {
    console.log("Data API URL is Docker-internal from this runner; verifying through Postgres/SSH instead.");
    console.log();
    const bulk = (await checkTablesThroughPostgres()) || checkTablesThroughHost();
    printSummaryAndExit(bulk.ok, bulk.missing, bulk.errored);
    return;
  }

  const missing = [];
  const errored = [];
  let ok = 0;

  for (const table of ALL_TABLES) {
    process.stdout.write(`  ${table}... `);
    const result = await checkTable(supabase.client, table);
    if (result.exists) {
      console.log("OK");
      ok++;
    } else if (result.error === "table does not exist") {
      console.log("MISSING");
      missing.push(table);
    } else {
      console.log(`ERROR (${result.error})`);
      errored.push({ table, error: result.error });
    }
  }

  if (errored.length === ALL_TABLES.length && errored.every((item) => /fetch failed|aborted|timeout/i.test(item.error))) {
    console.log();
    console.log("Data API verification was unreachable; retrying through Postgres/SSH.");
    console.log();
    const bulk = (await checkTablesThroughPostgres()) || checkTablesThroughHost();
    printSummaryAndExit(bulk.ok, bulk.missing, bulk.errored);
    return;
  }

  printSummaryAndExit(ok, missing, errored);
}

function printSummaryAndExit(ok, missing, errored) {
  console.log();
  console.log("── Summary ──");
  console.log(`  OK:      ${ok}/${ALL_TABLES.length}`);
  console.log(`  Missing: ${missing.length}`);
  console.log(`  Errors:  ${errored.length}`);

  if (missing.length > 0) {
    console.log();
    console.log("MISSING TABLES:");
    for (const t of missing) {
      const migrationMap = {
        "cms_posts": "migration_001_cms_tables.sql",
        "cms_services": "migration_001_cms_tables.sql",
        "cms_pricing": "migration_001_cms_tables.sql",
        "cms_faqs": "migration_001_cms_tables.sql",
        "cms_works": "migration_001_cms_tables.sql",
        "cms_settings": "migration_001_cms_tables.sql",
        "cms_media": "migration_001_cms_tables.sql",
        "cms_content_blocks": "migration_001_cms_tables.sql",
        "sales_companies": "migration_003_sales_hub.sql",
        "sales_customers": "migration_003_sales_hub.sql",
        "sales_deliveries": "migration_003_sales_hub.sql",
        "sales_templates": "migration_003_sales_hub.sql",
        "sales_campaigns": "migration_003_sales_hub.sql",
        "sales_contracts": "migration_017_sales_twenty_karte_sync.sql",
        "sales_error_log": "supabase/migrations/migration_035_sales_error_log.sql",
        "sales_lead_candidate_domains": "supabase/migrations/migration_047_sales_lead_candidate_acquisition.sql",
        "sales_lead_candidate_observations": "supabase/migrations/migration_047_sales_lead_candidate_acquisition.sql",
        "sales_lead_candidate_country_signals": "supabase/migrations/migration_047_sales_lead_candidate_acquisition.sql",
        "sales_lead_candidate_tech_detections": "supabase/migrations/migration_047_sales_lead_candidate_acquisition.sql",
        "sales_lead_candidate_scores": "supabase/migrations/migration_047_sales_lead_candidate_acquisition.sql",
        "sales_lead_candidate_runs": "supabase/migrations/migration_048_sales_lead_candidate_runs.sql",
        "sales_lead_candidate_run_items": "supabase/migrations/migration_048_sales_lead_candidate_runs.sql",
        "prospects": "supabase/migrations/migration_061_release_table_parity.sql",
        "prospect_patterns": "supabase/migrations/migration_061_release_table_parity.sql",
        "agency_companies": "supabase/migrations/migration_061_release_table_parity.sql",
        "agency_presentations": "supabase/migrations/migration_061_release_table_parity.sql",
        "agency_videos": "supabase/migrations/migration_061_release_table_parity.sql",
        "agency_demo_sites": "supabase/migrations/migration_061_release_table_parity.sql",
        "agency_reports": "supabase/migrations/migration_061_release_table_parity.sql",
        "agency_outreach": "supabase/migrations/migration_034_sales_ssot_hub.sql",
        "agency_deals": "supabase/migrations/migration_034_sales_ssot_hub.sql",
      };
      const migration = migrationMap[t] || "(unknown migration)";
      console.log(`  - ${t}  ←  ${migration}`);
    }
    console.log();
    console.log("To apply missing migrations:");
    console.log("  node scripts/exec-migrations.cjs");
  }

  if (errored.length > 0) {
    console.log();
    console.log("CONNECTION ERRORS:");
    for (const e of errored) {
      console.log(`  - ${e.table}: ${e.error}`);
    }
  }

  const exitCode = missing.length > 0 || errored.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
