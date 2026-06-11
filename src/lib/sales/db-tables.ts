/**
 * db-tables.ts — RevenueOS Central Table Registry
 *
 * 全 Sales OS テーブル名の単一真実源 (SSOT)。
 * コード内の `.from("...")` は必ずこのファイルの定数を使用すること。
 * 生文字列でのテーブル名指定は禁止。
 *
 * 新規テーブル追加時:
 * 1. このファイルに定数を追加
 * 2. supabase/migration_XXX.sql を作成
 * 3. scripts/generate-migration-script.cjs → run-migrations.sh を再生成
 * 4. scripts/exec-migrations.cjs で本番適用
 * 5. scripts/verify-db-tables.mjs で実在確認
 */

export const DB_TABLES = {
  // ── CMS (migration_001) ──
  CMS_POSTS: "cms_posts",
  CMS_SERVICES: "cms_services",
  CMS_PRICING: "cms_pricing",
  CMS_FAQS: "cms_faqs",
  CMS_WORKS: "cms_works",
  CMS_SETTINGS: "cms_settings",
  CMS_MEDIA: "cms_media",
  CMS_CONTENT_BLOCKS: "cms_content_blocks",

  // ── Sales OS Core (migration_003) ──
  SALES_COMPANIES: "sales_companies",
  SALES_CUSTOMERS: "sales_customers",
  SALES_DELIVERIES: "sales_deliveries",
  SALES_TEMPLATES: "sales_templates",
  SALES_CAMPAIGNS: "sales_campaigns",

  // ── Contracts & KPI (migration_017, 018) ──
  SALES_CONTRACTS: "sales_contracts",
  SALES_KPI: "sales_kpi",
  SALES_PRODUCTS: "sales_products",
  SALES_COMPANY_PRODUCT_RECOMMENDATIONS: "sales_company_product_recommendations",

  // ── Activity & Sync (migration_017, 019) ──
  SALES_ACTIVITY_LOG: "sales_activity_log",
  SALES_SYNC_LOGS: "sales_sync_logs",

  // ── Operator Queue (migration_023) ──
  SALES_OPERATOR_QUEUE_ITEMS: "sales_operator_queue_items",

  // ── Tool Connections (migration_024) ──
  SALES_TOOL_CONNECTIONS: "sales_tool_connections",
  SALES_INTEGRATION_STATUS: "sales_integration_status",

  // ── Enrichment & Diagnosis (migration_015, 016) ──
  SALES_ENRICHMENT_JOBS: "sales_enrichment_jobs",
  SALES_DIAGNOSIS_EVENTS: "sales_diagnosis_events",

  // ── Content Templates (migration_022) ──
  SALES_CONTENT_TEMPLATES: "sales_content_templates",

  // ── AI Prompts (migration_038) ──
  SALES_AI_PROMPTS: "sales_ai_prompts",

  // ── Agent (migration_023) ──
  SALES_AGENT_COMMANDS: "sales_agent_commands",
  SALES_AGENT_EVENTS: "sales_agent_events",

  // ── Source Tech (migration_030) ──
  SALES_SOURCE_RUNS: "sales_source_runs",
  SALES_TECH_STACK_DETECTIONS: "sales_tech_stack_detections",

  // ── Calendar (migration_020) ──
  SALES_CALENDAR_EVENTS: "sales_calendar_events",

  // ── Lead Batches (migration_031) ──
  SALES_LEAD_BATCHES: "sales_lead_batches",
  SALES_LEAD_BATCH_ITEMS: "sales_lead_batch_items",

  // ── Pipeline (migration_036) ──
  SALES_PIPELINE_RUNS: "sales_pipeline_runs",
  SALES_PIPELINE_STEPS: "sales_pipeline_steps",
  SALES_ARTIFACT_MANIFEST: "sales_artifact_manifest",

  // ── CRM Field Config (migration_029) ──
  SALES_CRM_VIEW_FIELDS: "sales_crm_view_fields",
  SALES_CRM_SELECT_OPTIONS: "sales_crm_select_options",

  // ── SearXNG (migration_032) ──
  SALES_SEARXNG_SEARCH_RUNS: "sales_searxng_search_runs",
  SALES_SEARXNG_SEARCH_RESULTS: "sales_searxng_search_results",

  // ── Japan Readiness (migration_033) ──
  SALES_JAPAN_READINESS_INSIGHTS: "sales_japan_readiness_insights",

  // ── Video (migration_026, 027, 028) ──
  SALES_VIDEO_JOBS: "sales_video_jobs",

  // ── Platform Health (migration_025) ──
  SALES_PLATFORM_HEALTH_SNAPSHOTS: "sales_platform_health_snapshots",

  // ── Infrastructure (migration_014) ──
  SALES_INFRASTRUCTURE_MIGRATION: "sales_infrastructure_migration",

  // ── Error Log (supabase/migrations/migration_035_sales_error_log.sql) ──
  SALES_ERROR_LOG: "sales_error_log",

  // ── Demo (migration_016) ──
  WEB_DEMOS: "web_demos",
  DIAGNOSTIC_REPORTS: "diagnostic_reports",
  DIAGNOSTIC_RUNS: "diagnostic_runs",

  // ── Notifications ──
  NOTIFICATIONS: "notifications",
  SALES_ACTIVITIES: "sales_activities",
  LEADS: "leads",

  // ── MVP (legacy) ──
  MVP_CAMPAIGNS: "mvp_campaigns",
  MVP_OUTREACH_RUNS: "mvp_outreach_runs",
  MVP_OPTOUT_TOKENS: "mvp_optout_tokens",
  MVP_BLOCKLIST: "mvp_blocklist",
  MVP_CLICK_EVENTS: "mvp_click_events",
  MVP_SEND_QUOTAS: "mvp_send_quotas",

  // ── Form / Persona ──
  FORM_MESSAGE_TEMPLATES: "form_message_templates",
  PARADIGM_PERSONAS: "paradigm_personas",

  // ── Legacy Automation ──
  PROSPECTS: "prospects",
  PROSPECT_VIEWS: "prospect_views",
  PROSPECT_PATTERNS: "prospect_patterns",
  PROPOSAL_TEMPLATES: "proposal_templates",

  // ── Agency (supabase/migrations/migration_034b_sales_ssot_hub.sql) ──
  AGENCY_COMPANIES: "agency_companies",
  AGENCY_PRESENTATIONS: "agency_presentations",
  AGENCY_VIDEOS: "agency_videos",
  AGENCY_DEMO_SITES: "agency_demo_sites",
  AGENCY_REPORTS: "agency_reports",
} as const

export type DbTableName = (typeof DB_TABLES)[keyof typeof DB_TABLES]

/** 全テーブル名のフラット配列（検証スクリプト用） */
export const ALL_DB_TABLES: string[] = Object.values(DB_TABLES)
