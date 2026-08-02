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
  // NOTE: CMS_CONTENT_BLOCKS has no migration in this repo. Managed by Appexxme (separate project).
  CMS_CONTENT_BLOCKS: "cms_content_blocks",

  // ── Content commerce (x402 + public Content API) ──
  CONTENT_PRODUCTS: "content_products",
  CONTENT_ACCESS_EVENTS: "content_access_events",

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
  SALES_COMPANY_PRODUCT_RECOMMENDATIONS:
    "sales_company_product_recommendations",

  // ── Activity & Sync (migration_017, 019) ──
  SALES_ACTIVITY_LOG: "sales_activity_log",
  SALES_SYNC_LOGS: "sales_sync_logs",

  // ── Operator Queue (migration_023) ──
  SALES_OPERATOR_QUEUE_ITEMS: "sales_operator_queue_items",
  SALES_CONTACT_SUBMISSIONS: "sales_contact_submissions",

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
  SALES_LEAD_CANDIDATE_DOMAINS: "sales_lead_candidate_domains",
  SALES_LEAD_CANDIDATE_OBSERVATIONS: "sales_lead_candidate_observations",
  SALES_LEAD_CANDIDATE_COUNTRY_SIGNALS: "sales_lead_candidate_country_signals",
  SALES_LEAD_CANDIDATE_TECH_DETECTIONS: "sales_lead_candidate_tech_detections",
  SALES_LEAD_CANDIDATE_SCORES: "sales_lead_candidate_scores",
  SALES_LEAD_CANDIDATE_RUNS: "sales_lead_candidate_runs",
  SALES_LEAD_CANDIDATE_RUN_ITEMS: "sales_lead_candidate_run_items",
  SALES_LEAD_SOURCE_CONFIGS: "sales_lead_source_configs",
  SALES_LEAD_SOURCE_RECORDS: "sales_lead_source_records",
  SALES_LEAD_INVENTORY_RUNS: "sales_lead_inventory_runs",
  SALES_LEAD_OPERATOR_EVENTS: "sales_lead_operator_events",
  SALES_PASSIVE_INVENTORY_RUNS: "sales_passive_inventory_runs",
  SALES_PASSIVE_INVENTORY_DOMAINS: "sales_passive_inventory_domains",
  SALES_PASSIVE_INVENTORY_SEGMENTS: "sales_passive_inventory_segments",

  // ── Pipeline (migration_036) ──
  SALES_PIPELINE_RUNS: "sales_pipeline_runs",
  SALES_PIPELINE_STEPS: "sales_pipeline_steps",
  SALES_ARTIFACT_MANIFEST: "sales_artifact_manifest",

  // ── CRM Field Config (migration_029) ──
  SALES_CRM_VIEW_FIELDS: "sales_crm_view_fields",
  SALES_CRM_SELECT_OPTIONS: "sales_crm_select_options",

  // ── Japan Readiness (migration_033) ──
  SALES_JAPAN_READINESS_INSIGHTS: "sales_japan_readiness_insights",
  SALES_JAPAN_ENTRY_PROJECTIONS: "sales_japan_entry_projections",
  SALES_INITIAL_FORM_DRAFTS: "sales_initial_form_drafts",
  SALES_REPORT_FACTORY_STATE: "sales_report_factory_state",
  SALES_JAPAN_OPERATOR_CASES: "sales_japan_operator_cases",
  SALES_JAPAN_OPERATOR_EVENTS: "sales_japan_operator_events",

  // ── Video (migration_026, 027, 028) ──
  SALES_VIDEO_JOBS: "sales_video_jobs",

  // ── Video Factory audited OSS engine catalog ──
  VIDEO_FACTORY_ENGINE_PROFILES: "video_factory_engine_profiles",
  VIDEO_FACTORY_ENGINE_EVENTS: "video_factory_engine_events",
  VIDEO_FACTORY_BRAND_KITS: "video_factory_brand_kits",
  VIDEO_FACTORY_CREATIVE_TEMPLATES: "video_factory_creative_templates",
  VIDEO_FACTORY_STUDIO_PROJECTS: "video_factory_studio_projects",
  VIDEO_FACTORY_SHOT_REVISIONS: "video_factory_shot_revisions",
  VIDEO_FACTORY_QUALITY_METRICS: "video_factory_quality_metrics",

  // ── Pipeline Metrics (migration_066) ──
  SALES_PIPELINE_METRICS: "sales_pipeline_metrics",

  // ── Platform Health (migration_025) ──
  SALES_PLATFORM_HEALTH_SNAPSHOTS: "sales_platform_health_snapshots",

  // ── Infrastructure (migration_014) ──
  SALES_INFRASTRUCTURE_MIGRATION: "sales_infrastructure_migration",

  // ── Error Log (supabase/migrations/migration_045_sales_error_log.sql) ──
  SALES_ERROR_LOG: "sales_error_log",

  // ── Theme Demo Pages (migration_058) ──
  THEME_DEMO_PAGES: "theme_demo_pages",

  // ── Demo Contact Submissions ──
  DEMO_CONTACT_SUBMISSIONS: "demo_contact_submissions",

  // Public utility runs (migration_072)
  PUBLIC_JAPAN_ENTRY_CHECKS: "public_japan_entry_checks",

  // Dedicated manual Japan Entry workbench (never part of Sales OS automation)
  MANUAL_JAPAN_ENTRY_WORK: "manual_japan_entry_work",
  MANUAL_JAPAN_ENTRY_BATCHES: "manual_japan_entry_batches",
  MANUAL_JAPAN_ENTRY_BATCH_ITEMS: "manual_japan_entry_batch_items",
  MANUAL_JAPAN_ENTRY_SOURCE_CATALOG: "manual_japan_entry_source_catalog",
  MANUAL_JAPAN_ENTRY_WORK_SOURCES: "manual_japan_entry_work_sources",

  // ── Tiny Shops of Japan / Shopify Operations (20260801212630) ──
  SHOPIFY_OPS_PRODUCTS: "shopify_ops_products",
  SHOPIFY_OPS_CONTENT_ITEMS: "shopify_ops_content_items",
  SHOPIFY_OPS_DAILY_METRICS: "shopify_ops_daily_metrics",

  // ── Demo (migration_016) ──
  WEB_DEMOS: "web_demos",
  // NOTE: These tables have no migrations in this repo. Managed by Appexxme (separate project).
  DIAGNOSTIC_REPORTS: "diagnostic_reports",
  DIAGNOSTIC_RUNS: "diagnostic_runs",

  // ── External-project tables (Appexxme / parallel project) ──
  // The following tables are referenced by code in this repo but have NO corresponding
  // migrations here. They are provisioned and managed by Appexxme or are legacy tables
  // from a previous project phase. Do NOT create migrations for them in this repo.
  NOTIFICATIONS: "notifications",
  SALES_ACTIVITIES: "sales_activities",
  LEADS: "leads",

  // ── MVP (Appexxme-managed legacy tables, no migrations in this repo) ──
  MVP_CAMPAIGNS: "mvp_campaigns",
  MVP_OUTREACH_RUNS: "mvp_outreach_runs",
  MVP_OPTOUT_TOKENS: "mvp_optout_tokens",
  MVP_BLOCKLIST: "mvp_blocklist",
  MVP_CLICK_EVENTS: "mvp_click_events",
  MVP_SEND_QUOTAS: "mvp_send_quotas",

  // ── Form / Persona (Appexxme-managed, no migrations in this repo) ──
  FORM_MESSAGE_TEMPLATES: "form_message_templates",
  PARADIGM_PERSONAS: "paradigm_personas",

  // ── Legacy Automation (previous-project tables, no migrations in this repo) ──
  PROSPECTS: "prospects",
  PROSPECT_VIEWS: "prospect_views",
  PROSPECT_PATTERNS: "prospect_patterns",
  PROPOSAL_TEMPLATES: "proposal_templates",

  // ── Agency (supabase/migrations/migration_044_sales_ssot_hub.sql) ──
  AGENCY_COMPANIES: "agency_companies",
  AGENCY_PRESENTATIONS: "agency_presentations",
  AGENCY_VIDEOS: "agency_videos",
  AGENCY_DEMO_SITES: "agency_demo_sites",
  AGENCY_REPORTS: "agency_reports",
} as const

export type DbTableName = (typeof DB_TABLES)[keyof typeof DB_TABLES]

/** 全テーブル名のフラット配列（検証スクリプト用） */
export const ALL_DB_TABLES: string[] = Object.values(DB_TABLES)
