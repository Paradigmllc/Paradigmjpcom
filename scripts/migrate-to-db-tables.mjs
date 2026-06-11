/**
 * migrate-to-db-tables.mjs — .from("raw") → .from(DB_TABLES.CONSTANT) 一括置換
 *
 * src/ 以下の全 .ts/.tsx ファイルの .from("table_name") を DB_TABLES 定数に置換する。
 * 既に DB_TABLES を使っているファイルはスキップ。
 * ドライラン: --dry で実行すると変更せずにレポートのみ出力。
 *
 * 使用法:
 *   node scripts/migrate-to-db-tables.mjs --dry
 *   node scripts/migrate-to-db-tables.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, relative, dirname, join, extname } from "path";

const DRY = process.argv.includes("--dry");

// Table name → constant name mapping (from db-tables.ts)
const TABLE_TO_CONSTANT = {
  "cms_posts": "DB_TABLES.CMS_POSTS",
  "cms_services": "DB_TABLES.CMS_SERVICES",
  "cms_pricing": "DB_TABLES.CMS_PRICING",
  "cms_faqs": "DB_TABLES.CMS_FAQS",
  "cms_works": "DB_TABLES.CMS_WORKS",
  "cms_settings": "DB_TABLES.CMS_SETTINGS",
  "cms_media": "DB_TABLES.CMS_MEDIA",
  "cms_content_blocks": "DB_TABLES.CMS_CONTENT_BLOCKS",
  "sales_companies": "DB_TABLES.SALES_COMPANIES",
  "sales_customers": "DB_TABLES.SALES_CUSTOMERS",
  "sales_deliveries": "DB_TABLES.SALES_DELIVERIES",
  "sales_templates": "DB_TABLES.SALES_TEMPLATES",
  "sales_campaigns": "DB_TABLES.SALES_CAMPAIGNS",
  "sales_contracts": "DB_TABLES.SALES_CONTRACTS",
  "sales_kpi": "DB_TABLES.SALES_KPI",
  "sales_products": "DB_TABLES.SALES_PRODUCTS",
  "sales_company_product_recommendations": "DB_TABLES.SALES_COMPANY_PRODUCT_RECOMMENDATIONS",
  "sales_activity_log": "DB_TABLES.SALES_ACTIVITY_LOG",
  "sales_sync_logs": "DB_TABLES.SALES_SYNC_LOGS",
  "sales_operator_queue_items": "DB_TABLES.SALES_OPERATOR_QUEUE_ITEMS",
  "sales_tool_connections": "DB_TABLES.SALES_TOOL_CONNECTIONS",
  "sales_integration_status": "DB_TABLES.SALES_INTEGRATION_STATUS",
  "sales_enrichment_jobs": "DB_TABLES.SALES_ENRICHMENT_JOBS",
  "sales_diagnosis_events": "DB_TABLES.SALES_DIAGNOSIS_EVENTS",
  "sales_content_templates": "DB_TABLES.SALES_CONTENT_TEMPLATES",
  "sales_ai_prompts": "DB_TABLES.SALES_AI_PROMPTS",
  "sales_agent_commands": "DB_TABLES.SALES_AGENT_COMMANDS",
  "sales_agent_events": "DB_TABLES.SALES_AGENT_EVENTS",
  "sales_source_runs": "DB_TABLES.SALES_SOURCE_RUNS",
  "sales_tech_stack_detections": "DB_TABLES.SALES_TECH_STACK_DETECTIONS",
  "sales_calendar_events": "DB_TABLES.SALES_CALENDAR_EVENTS",
  "sales_lead_batches": "DB_TABLES.SALES_LEAD_BATCHES",
  "sales_lead_batch_items": "DB_TABLES.SALES_LEAD_BATCH_ITEMS",
  "sales_pipeline_runs": "DB_TABLES.SALES_PIPELINE_RUNS",
  "sales_pipeline_steps": "DB_TABLES.SALES_PIPELINE_STEPS",
  "sales_artifact_manifest": "DB_TABLES.SALES_ARTIFACT_MANIFEST",
  "sales_crm_view_fields": "DB_TABLES.SALES_CRM_VIEW_FIELDS",
  "sales_crm_select_options": "DB_TABLES.SALES_CRM_SELECT_OPTIONS",
  "sales_searxng_search_runs": "DB_TABLES.SALES_SEARXNG_SEARCH_RUNS",
  "sales_searxng_search_results": "DB_TABLES.SALES_SEARXNG_SEARCH_RESULTS",
  "sales_japan_readiness_insights": "DB_TABLES.SALES_JAPAN_READINESS_INSIGHTS",
  "sales_video_jobs": "DB_TABLES.SALES_VIDEO_JOBS",
  "sales_platform_health_snapshots": "DB_TABLES.SALES_PLATFORM_HEALTH_SNAPSHOTS",
  "sales_infrastructure_migration": "DB_TABLES.SALES_INFRASTRUCTURE_MIGRATION",
  "sales_error_log": "DB_TABLES.SALES_ERROR_LOG",
  "web_demos": "DB_TABLES.WEB_DEMOS",
  "diagnostic_reports": "DB_TABLES.DIAGNOSTIC_REPORTS",
  "diagnostic_runs": "DB_TABLES.DIAGNOSTIC_RUNS",
  "notifications": "DB_TABLES.NOTIFICATIONS",
  "sales_activities": "DB_TABLES.SALES_ACTIVITIES",
  "leads": "DB_TABLES.LEADS",
  "mvp_campaigns": "DB_TABLES.MVP_CAMPAIGNS",
  "mvp_outreach_runs": "DB_TABLES.MVP_OUTREACH_RUNS",
  "mvp_optout_tokens": "DB_TABLES.MVP_OPTOUT_TOKENS",
  "mvp_blocklist": "DB_TABLES.MVP_BLOCKLIST",
  "mvp_click_events": "DB_TABLES.MVP_CLICK_EVENTS",
  "mvp_send_quotas": "DB_TABLES.MVP_SEND_QUOTAS",
  "form_message_templates": "DB_TABLES.FORM_MESSAGE_TEMPLATES",
  "paradigm_personas": "DB_TABLES.PARADIGM_PERSONAS",
  "prospects": "DB_TABLES.PROSPECTS",
  "prospect_views": "DB_TABLES.PROSPECT_VIEWS",
  "prospect_patterns": "DB_TABLES.PROSPECT_PATTERNS",
  "proposal_templates": "DB_TABLES.PROPOSAL_TEMPLATES",
  "agency_companies": "DB_TABLES.AGENCY_COMPANIES",
  "agency_presentations": "DB_TABLES.AGENCY_PRESENTATIONS",
  "agency_videos": "DB_TABLES.AGENCY_VIDEOS",
  "agency_demo_sites": "DB_TABLES.AGENCY_DEMO_SITES",
  "agency_reports": "DB_TABLES.AGENCY_REPORTS",
};

// Longest keys first to avoid partial matches
const TABLE_NAMES = Object.keys(TABLE_TO_CONSTANT).sort((a, b) => b.length - a.length);

function collectFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      collectFiles(full, files);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function computeImportPath(filePath) {
  // All files are under src/, import from "@/lib/sales/db-tables"
  return `import { DB_TABLES } from "@/lib/sales/db-tables"`;
}

function processFile(filePath) {
  let content = readFileSync(filePath, "utf8");
  const original = content;

  // Skip if already imports DB_TABLES
  if (content.includes("import { DB_TABLES }")) return null;

  let replaced = 0;
  for (const tableName of TABLE_NAMES) {
    const constant = TABLE_TO_CONSTANT[tableName];
    // Match .from("table_name") or .from('table_name')
    const regex = new RegExp(`\\.from\\(["']${tableName}["']\\)`, "g");
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, `.from(${constant})`);
      replaced += matches.length;
    }
  }

  if (replaced === 0) return null;

  // Add import after the last "from" import line (end of any import statement)
  const fromRegex = /^import\s+.+from\s+["'].+["']\s*;?\s*$/gm;
  const fromMatches = content.match(fromRegex);
  if (fromMatches) {
    const lastFrom = fromMatches[fromMatches.length - 1];
    const importLine = computeImportPath(filePath);
    content = content.replace(
      new RegExp(`(${lastFrom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n)`),
      `$1${importLine}\n`
    );
  }

  return { filePath, replaced, content };
}

const srcDir = resolve("src");
const files = collectFiles(srcDir);
console.log(`Found ${files.length} TypeScript files`);
console.log(DRY ? "DRY RUN — no files will be modified" : "LIVE RUN — files will be modified");
console.log();

let totalFiles = 0;
let totalReplaced = 0;

for (const filePath of files) {
  const result = processFile(filePath);
  if (!result) continue;

  console.log(`  ${relative(".", filePath)}: ${result.replaced} replacements`);
  totalFiles++;
  totalReplaced += result.replaced;

  if (!DRY) {
    writeFileSync(filePath, result.content, "utf8");
  }
}

console.log();
console.log(`${totalFiles} files, ${totalReplaced} replacements ${DRY ? "(dry run)" : "DONE"}`);
