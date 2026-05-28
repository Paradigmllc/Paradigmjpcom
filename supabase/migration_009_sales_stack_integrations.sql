-- ============================================================
-- paradigmjp.com Sales OS - OSS stack integration control plane
-- Migration: 009_sales_stack_integrations
-- Created:   2026-05-28
-- Schema:    public
-- ============================================================
-- Purpose:
--   Supabase Cloud remains the data source of truth. Twenty, NocoDB,
--   Appsmith, and Metabase are tracked as OSS/self-hosted operational
--   surfaces so the dashboard can show one connected sales cockpit
--   instead of another isolated Notion board.
-- ============================================================

CREATE TABLE IF NOT EXISTS sales_tool_connections (
  slug text PRIMARY KEY,
  display_name text NOT NULL,
  role text NOT NULL,
  interface_type text NOT NULL,
  deployment_type text NOT NULL DEFAULT 'oss_self_hosted',
  base_url text,
  health_url text,
  status text NOT NULL DEFAULT 'planned',
  owner text,
  last_checked_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (slug IN ('supabase', 'twenty', 'nocodb', 'appsmith', 'metabase', 'notion', 'n8n')),
  CHECK (deployment_type IN ('supabase_cloud', 'oss_self_hosted', 'legacy_external')),
  CHECK (interface_type IN ('database', 'crm', 'spreadsheet', 'operator_console', 'bi', 'automation', 'legacy_workspace')),
  CHECK (status IN ('active', 'planned', 'degraded', 'disabled', 'legacy'))
);

CREATE INDEX IF NOT EXISTS idx_sales_tool_connections_status
  ON sales_tool_connections (status);

CREATE TABLE IF NOT EXISTS sales_operator_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL DEFAULT 'jp',
  company_id uuid REFERENCES sales_companies (id) ON DELETE CASCADE,
  queue_type text NOT NULL,
  priority int NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'open',
  assigned_to text,
  source_tool text REFERENCES sales_tool_connections (slug) ON DELETE SET NULL,
  target_tool text REFERENCES sales_tool_connections (slug) ON DELETE SET NULL,
  due_at timestamptz,
  completed_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (region IN ('jp', 'global')),
  CHECK (queue_type IN ('cleanse', 'call', 'form_send', 'follow_up', 'crm_update', 'meeting_prep', 'analysis')),
  CHECK (status IN ('open', 'in_progress', 'blocked', 'done', 'skipped')),
  CHECK (priority BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_sales_operator_queue_status
  ON sales_operator_queue_items (status, priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_operator_queue_company
  ON sales_operator_queue_items (company_id);
CREATE INDEX IF NOT EXISTS idx_sales_operator_queue_due
  ON sales_operator_queue_items (due_at) WHERE due_at IS NOT NULL;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['sales_tool_connections', 'sales_operator_queue_items'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_touch ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION sales_touch_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;

INSERT INTO sales_tool_connections
  (slug, display_name, role, interface_type, deployment_type, status, meta)
VALUES
  (
    'supabase',
    'Supabase Cloud',
    '全営業データの正本。PostgreSQL、RLS、API、自動化の中心。',
    'database',
    'supabase_cloud',
    'active',
    '{"data_owner":"paradigmjpcom","source_of_truth":true}'::jsonb
  ),
  (
    'nocodb',
    'NocoDB OSS',
    '大量リードの一括編集、CSV投入後のクレンジング、ステータスの高速修正。',
    'spreadsheet',
    'oss_self_hosted',
    'planned',
    '{"connects_to":"sales_companies","operator_risk":"bulk_edit_requires_guardrails"}'::jsonb
  ),
  (
    'appsmith',
    'Appsmith OSS',
    '外部オペレーター用の1件ずつ処理する専用画面。',
    'operator_console',
    'oss_self_hosted',
    'planned',
    '{"connects_to":"sales_operator_queue_items","safe_scope":"single_record_workflow"}'::jsonb
  ),
  (
    'twenty',
    'Twenty OSS',
    '商談、関係性、担当者、架電履歴を扱うCRM。',
    'crm',
    'oss_self_hosted',
    'planned',
    '{"connects_to":"sales_companies","sync_mode":"stage_and_activity_projection"}'::jsonb
  ),
  (
    'metabase',
    'Metabase OSS',
    '返信率、送信数、成約率、リスト別成果を分析するBI。',
    'bi',
    'oss_self_hosted',
    'planned',
    '{"connects_to":"sales_kpi","dashboard_scope":"executive_analytics"}'::jsonb
  ),
  (
    'n8n',
    'n8n OSS',
    '同期、通知、週次集計、外部OSSツール間のワークフロー。',
    'automation',
    'oss_self_hosted',
    'active',
    '{"connects_to":"api_sales_routes","role":"integration_bus"}'::jsonb
  ),
  (
    'notion',
    'Notion Legacy',
    '旧営業ダッシュボード。段階的に参照・同期先へ降格。',
    'legacy_workspace',
    'legacy_external',
    'legacy',
    '{"replacement":"sales_dashboard","write_policy":"deprecate_new_operations"}'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  interface_type = EXCLUDED.interface_type,
  deployment_type = EXCLUDED.deployment_type,
  meta = sales_tool_connections.meta || EXCLUDED.meta,
  updated_at = now();

ALTER TABLE sales_tool_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_operator_queue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_tool_connections_service_role_all ON sales_tool_connections;
CREATE POLICY sales_tool_connections_service_role_all
  ON sales_tool_connections FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_operator_queue_items_service_role_all ON sales_operator_queue_items;
CREATE POLICY sales_operator_queue_items_service_role_all
  ON sales_operator_queue_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE sales_tool_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE sales_operator_queue_items TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMENT ON TABLE sales_tool_connections IS
  'OSS営業スタック統合台帳。Supabase Cloudを正本に、Twenty/NocoDB/Appsmith/Metabase/n8n/Notionの役割と接続状態を管理する。';
COMMENT ON TABLE sales_operator_queue_items IS
  'オペレーター作業キュー。Appsmithなどの単一レコード作業UIが扱う安全なタスク単位。';
