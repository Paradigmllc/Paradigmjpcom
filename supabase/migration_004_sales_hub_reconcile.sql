-- ============================================================
-- paradigmjp.com Sales OS — Schema Drift Reconcile (正史化)
-- Migration: 004_sales_hub_reconcile
-- Created:   2026-05-20 (営業フロー統合 Phase 0-1)
-- Schema:    public
-- ============================================================
-- 目的:
--   migration_003 以降に Supabase MCP で直接 ALTER/CREATE された
--   スキーマ変更を「正史」として git に記録する。本番 DB には既に
--   適用済みのため、全文を冪等 (IF NOT EXISTS / DROP ... IF EXISTS)
--   で書き、新規 DB 再構築時のみ実体を生成する。
--
-- 捕捉したドリフト (2026-05-20 実DB introspection で確認):
--   1. sales_companies に region / slug 列追加 (Sprint 13/16)
--   2. sales_templates の UNIQUE を (industry, issue_code)
--      → (industry, issue_code, region) に変更 + region 列追加
--      (= jp/global 2 region × 8×7 で最大 112 行)
--   3. spine-orphan 4 テーブル (sales_companies/customers に FK だが
--      migration_003 にも lib/sales/types.ts にも未定義だった):
--        sales_activity_log / sales_calendar_events
--        sales_contracts    / sales_kpi
--
-- 所有境界 (Phase 0-2 / CLAUDE.md s10-7):
--   本ファイルが扱う sales_* は **全て paradigm-HP 所有**。
--   Appexxme 所有の leads / proposal_pages / sales_activities /
--   sales_materials / sales_flows / sales_sequences / sales_knowledge /
--   sales_documents は **別プロジェクトの資産** であり本リポジトリは触らない。
-- ============================================================

-- ─── 1. sales_companies: region / slug 列 (Sprint 13/16) ───────
ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'jp';

ALTER TABLE sales_companies DROP CONSTRAINT IF EXISTS sales_companies_region_check;
ALTER TABLE sales_companies ADD CONSTRAINT sales_companies_region_check
  CHECK (region IN ('jp', 'global'));

CREATE INDEX IF NOT EXISTS idx_sales_companies_region ON sales_companies (region);
CREATE INDEX IF NOT EXISTS idx_sales_companies_slug ON sales_companies (slug) WHERE slug IS NOT NULL;

-- ─── 2. sales_templates: region 列 + UNIQUE 拡張 ───────────────
ALTER TABLE sales_templates ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'jp';

-- 旧 UNIQUE (industry, issue_code) を region 込みに張り替え
ALTER TABLE sales_templates DROP CONSTRAINT IF EXISTS sales_templates_industry_issue_code_key;
ALTER TABLE sales_templates DROP CONSTRAINT IF EXISTS sales_templates_industry_issue_code_region_key;
ALTER TABLE sales_templates ADD CONSTRAINT sales_templates_industry_issue_code_region_key
  UNIQUE (industry, issue_code, region);

ALTER TABLE sales_templates DROP CONSTRAINT IF EXISTS sales_templates_region_check;
ALTER TABLE sales_templates ADD CONSTRAINT sales_templates_region_check
  CHECK (region IN ('jp', 'global'));

-- ─── 3. sales_activity_log (カルテのタイムライン・④送信ログ受け皿) ─
-- 注: Appexxme の sales_activities (→leads) とは別物。本テーブルは
--     sales_companies/customers に FK する paradigm-HP 側の活動履歴。
CREATE TABLE IF NOT EXISTS sales_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL DEFAULT 'jp',
  company_id uuid REFERENCES sales_companies (id) ON DELETE CASCADE,
  customer_id uuid REFERENCES sales_customers (id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  subject text,
  body text,
  result text,
  duration_min int,
  occurred_at timestamptz DEFAULT now(),
  assigned_to text,
  notion_page_id text UNIQUE,
  last_synced timestamptz,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (region IN ('jp', 'global')),
  CHECK (activity_type IN ('email', 'call', 'meeting', 'note', 'sms', 'linkedin', 'demo', 'follow_up')),
  CHECK (result IS NULL OR result IN ('success', 'no_answer', 'follow_up', 'declined', 'completed'))
);
CREATE INDEX IF NOT EXISTS idx_sales_activity_log_company ON sales_activity_log (company_id);
CREATE INDEX IF NOT EXISTS idx_sales_activity_log_customer ON sales_activity_log (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_activity_log_occurred ON sales_activity_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_activity_log_notion ON sales_activity_log (notion_page_id);

-- ─── 4. sales_calendar_events (Cal.com 連携) ───────────────────
CREATE TABLE IF NOT EXISTS sales_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL DEFAULT 'jp',
  company_id uuid REFERENCES sales_companies (id) ON DELETE CASCADE,
  customer_id uuid REFERENCES sales_customers (id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  cal_event_id text UNIQUE,
  cal_booking_url text,
  meeting_url text,
  status text NOT NULL DEFAULT 'scheduled',
  attendees jsonb DEFAULT '[]'::jsonb,
  outcome_notes text,
  assigned_to text,
  notion_page_id text UNIQUE,
  last_synced timestamptz,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (region IN ('jp', 'global')),
  CHECK (event_type IS NULL OR event_type IN ('discovery', 'demo', 'proposal', 'closing', 'follow_up', 'review', 'other')),
  CHECK (status IN ('scheduled', 'confirmed', 'completed', 'no_show', 'cancelled', 'rescheduled'))
);
CREATE INDEX IF NOT EXISTS idx_sales_calendar_company ON sales_calendar_events (company_id);
CREATE INDEX IF NOT EXISTS idx_sales_calendar_customer ON sales_calendar_events (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_calendar_start ON sales_calendar_events (start_at);
CREATE INDEX IF NOT EXISTS idx_sales_calendar_notion ON sales_calendar_events (notion_page_id);

-- ─── 5. sales_contracts (契約・DocuSign 連携) ──────────────────
CREATE TABLE IF NOT EXISTS sales_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL DEFAULT 'jp',
  customer_id uuid REFERENCES sales_customers (id) ON DELETE CASCADE,
  contract_name text NOT NULL,
  contract_type text,
  amount_yen bigint,
  amount_usd numeric,
  currency text DEFAULT 'JPY',
  start_date date,
  end_date date,
  auto_renew boolean DEFAULT false,
  pdf_r2_url text,
  docusign_envelope_id text,
  docusign_status text,
  status text NOT NULL DEFAULT 'draft',
  signer_name text,
  signer_email text,
  signed_at timestamptz,
  notion_page_id text UNIQUE,
  last_synced timestamptz,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (region IN ('jp', 'global')),
  CHECK (contract_type IS NULL OR contract_type IN ('web_build', 'meo', 'dx_ai', 'video_sub', 'japan_entry', 'wl_agency', 'maintenance', 'other')),
  CHECK (currency IS NULL OR currency IN ('JPY', 'USD', 'EUR', 'GBP', 'CNY', 'KRW', 'SGD')),
  CHECK (status IN ('draft', 'sent', 'partially_signed', 'signed', 'active', 'expired', 'cancelled', 'renewed'))
);
CREATE INDEX IF NOT EXISTS idx_sales_contracts_customer ON sales_contracts (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_contracts_status ON sales_contracts (status);
CREATE INDEX IF NOT EXISTS idx_sales_contracts_notion ON sales_contracts (notion_page_id);

-- ─── 6. sales_kpi (日次 KPI スナップショット) ──────────────────
CREATE TABLE IF NOT EXISTS sales_kpi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  new_leads int DEFAULT 0,
  outreach_sent int DEFAULT 0,
  replies_received int DEFAULT 0,
  meetings_booked int DEFAULT 0,
  proposals_sent int DEFAULT 0,
  deals_closed int DEFAULT 0,
  deals_lost int DEFAULT 0,
  revenue numeric DEFAULT 0,
  target_outreach int DEFAULT 20,
  target_meetings int DEFAULT 3,
  target_deals int DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sales_kpi_date ON sales_kpi (date DESC);

-- ─── 7. updated_at トリガー (updated_at を持つ 3 テーブル) ──────
-- sales_touch_updated_at() は migration_003 で定義済 (CREATE OR REPLACE で安全に再定義)
CREATE OR REPLACE FUNCTION sales_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['sales_activity_log', 'sales_calendar_events', 'sales_contracts'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_touch ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION sales_touch_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ─── 8. RLS (MM 永久ルール: 全テーブル RLS + service_role のみ) ─
ALTER TABLE sales_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_kpi ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['sales_activity_log', 'sales_calendar_events', 'sales_contracts', 'sales_kpi'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_service_role_all ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_service_role_all ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;
-- anon は policy なし = 拒否 (営業データ漏洩防止)

-- ─── 9. COMMENT (admin GUI 説明・所有境界明記) ─────────────────
COMMENT ON TABLE sales_activity_log IS '活動履歴 (paradigm-HP 所有・→sales_companies/customers・④送信ログ受け皿)';
COMMENT ON TABLE sales_calendar_events IS '商談カレンダー (paradigm-HP 所有・Cal.com 連携)';
COMMENT ON TABLE sales_contracts IS '契約 (paradigm-HP 所有・DocuSign 連携)';
COMMENT ON TABLE sales_kpi IS '日次 KPI スナップショット (paradigm-HP 所有)';
COMMENT ON COLUMN sales_companies.slug IS 'URL-safe 事業者名 (例 izakaya-en)・/report/[slug] の anchor';
COMMENT ON COLUMN sales_companies.region IS 'jp / global (s10-5 国ドリブン永久ルール)';
