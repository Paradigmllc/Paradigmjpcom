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

async function createSupabaseClient() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL") || env("SALES_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY") || env("SALES_SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (or SALES_*) must be set");
    return null;
  }
  try {
    const { createClient } = await import("@supabase/supabase-js");
    return { client: createClient(url, key, { auth: { persistSession: false } }), url };
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
        "agency_companies": "supabase/migrations/migration_034_sales_ssot_hub.sql",
        "agency_presentations": "supabase/migrations/migration_034_sales_ssot_hub.sql",
        "agency_videos": "supabase/migrations/migration_034_sales_ssot_hub.sql",
        "agency_demo_sites": "supabase/migrations/migration_034_sales_ssot_hub.sql",
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

  const exitCode = missing.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
