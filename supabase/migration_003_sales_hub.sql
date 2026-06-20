-- ============================================================
-- paradigmjp.com Sales OS Hub — Notion × Supabase 同期基盤
-- Migration: 003_sales_hub
-- Created:   2026-05-13 (Sprint 8)
-- Schema:    public (Supabase 主スキーマ)
-- Prefix:    sales_* (旧 cms_* / payload schema / 旧 mvp_* と論理 namespace 分離)
-- ============================================================
-- 設計原則:
--   1. Supabase = truth source (Stripe / Webhook / n8n から書込)
--   2. Notion = human UI (営業マンが編集可能な field のみ逆流)
--   3. n8n = bridge (5 同期フロー / 3 workflow)
--   4. notion_page_id を Supabase 側に持つ → 冪等性確保
-- ============================================================
-- 関連: Sprint 8 設計図 (Notion 「営業MVP壁打ち②」+ Visualize 6 ファイル)
--       AE-PHP-7 (DB 化 + admin 編集可能) + s11.5 SALES-CENTER 5 drivers 準拠

-- ─── 1. sales_companies (リードDB・Supabase truth source) ───────
-- Notion 🎯 リードDB と双方向同期 (deal_stage / follow_up_date / memo / 担当者 のみ Notion 編集可)
CREATE TABLE IF NOT EXISTS sales_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  company_name text NOT NULL,
  industry text,
  prefecture text,
  -- パイプライン状態 (Supabase 主管・スキャナ/送信ジョブが自動更新)
  pipeline_status text DEFAULT 'pending',
  -- 商談ステージ (Notion 編集可・営業マンが手動更新)
  deal_stage text DEFAULT '未対応',
  -- スキャン結果
  pagespeed_mobile int,
  pagespeed_desktop int,
  detected_issues text[] DEFAULT '{}',
  -- 追跡
  report_views int DEFAULT 0,
  is_hot_lead boolean DEFAULT false,
  -- 送信履歴
  send_result text,
  sent_at timestamptz,
  report_url text,
  -- 営業アクション (Notion 編集可)
  follow_up_date date,
  memo text,
  assigned_to text,
  -- Notion 同期 anchor (削除復元用)
  notion_page_id text UNIQUE,
  -- リスト source (apollo/fumadata/gbizinfo/jgrants/outscraper/manual 等)
  source text,
  -- 拡張用 jsonb (lib/sales/companies.ts で型付き取扱)
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    pipeline_status IN (
      'pending', 'scanning', 'report_ready', 'sent', 'manual_queue'
    )
  ),
  CHECK (
    deal_stage IN (
      '未対応', '架電済', '商談中', '提案済', '成約', '失注'
    )
  ),
  CHECK (
    industry IS NULL OR industry IN (
      'beauty_salon', 'dental', 'restaurant', 'construction',
      'accounting', 'retail', 'cleaning', 'consulting'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_companies_pipeline ON sales_companies (pipeline_status);
CREATE INDEX IF NOT EXISTS idx_sales_companies_deal_stage ON sales_companies (deal_stage);
CREATE INDEX IF NOT EXISTS idx_sales_companies_is_hot ON sales_companies (is_hot_lead) WHERE is_hot_lead = true;
CREATE INDEX IF NOT EXISTS idx_sales_companies_notion_id ON sales_companies (notion_page_id);
CREATE INDEX IF NOT EXISTS idx_sales_companies_industry ON sales_companies (industry);
CREATE INDEX IF NOT EXISTS idx_sales_companies_follow_up ON sales_companies (follow_up_date) WHERE follow_up_date IS NOT NULL;

-- ─── 2. sales_customers (成約後・Notion 主管双方向) ─────────────
-- Notion 🏢 顧客ダッシュボードと双方向同期 (Notion 編集可は多め)
-- 動画サブスク WL 戦略 (Q4): is_white_label / wl_client_count を初日から保持
CREATE TABLE IF NOT EXISTS sales_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 元リードへのリレーション (companies.deal_stage='成約' になった瞬間に派生)
  company_id uuid REFERENCES sales_companies (id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  -- 契約商材 (multi)
  contract_products text[] DEFAULT '{}',
  -- MRR contribution (月額)
  monthly_amount numeric(12, 2),
  contract_start date,
  next_invoice_date date,
  contract_status text DEFAULT 'トライアル',
  health text DEFAULT '🟢 良好',
  next_meeting date,
  subsidy_status text DEFAULT '未申請',
  -- Q4 (2026-05-13): ホワイトラベル戦略フラグ
  is_white_label boolean DEFAULT false,
  wl_client_count int DEFAULT 0,
  -- 営業担当
  assigned_to text,
  -- Notion anchor
  notion_page_id text UNIQUE,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    contract_status IN ('トライアル', '継続中', '解約予告', '解約済')
  ),
  CHECK (
    health IN ('🟢 良好', '🟡 要注意', '🔴 要対応')
  ),
  CHECK (
    subsidy_status IN ('未申請', '申請中', '採択済', '非対象')
  ),
  CHECK (wl_client_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sales_customers_status ON sales_customers (contract_status);
CREATE INDEX IF NOT EXISTS idx_sales_customers_health ON sales_customers (health);
CREATE INDEX IF NOT EXISTS idx_sales_customers_company ON sales_customers (company_id);
CREATE INDEX IF NOT EXISTS idx_sales_customers_notion_id ON sales_customers (notion_page_id);
CREATE INDEX IF NOT EXISTS idx_sales_customers_wl ON sales_customers (is_white_label) WHERE is_white_label = true;
CREATE INDEX IF NOT EXISTS idx_sales_customers_next_invoice ON sales_customers (next_invoice_date);

-- ─── 3. sales_deliveries (納品物・Notion 主管 N→S) ──────────────
-- Notion 📦 納品DBから Supabase に同期 (顧客がリクエスト投入 → n8n が処理)
CREATE TABLE IF NOT EXISTS sales_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES sales_customers (id) ON DELETE CASCADE,
  delivery_name text NOT NULL,
  delivery_type text,
  status text DEFAULT '未着手',
  due_date date,
  -- 納品 URL (Cloudflare R2 等)
  delivery_url text,
  r2_path text,
  -- 制作者 (担当 or 'auto-n8n')
  created_by text,
  notion_page_id text UNIQUE,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (
    status IN ('未着手', '制作中', 'レビュー待ち', '納品済')
  ),
  CHECK (
    delivery_type IS NULL OR delivery_type IN (
      '動画(Remotion)', '動画(HyperFrames)', 'Web制作', 'MEOレポート', '提案資料'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_deliveries_customer ON sales_deliveries (customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_deliveries_status ON sales_deliveries (status);
CREATE INDEX IF NOT EXISTS idx_sales_deliveries_due ON sales_deliveries (due_date);
CREATE INDEX IF NOT EXISTS idx_sales_deliveries_notion_id ON sales_deliveries (notion_page_id);

-- ─── 4. sales_templates (業種×課題テンプレ・Notion 主管) ─────
-- Notion テンプレDBから Supabase へ webhook / one-shot 補正で upsert
-- 業種 8 × 課題 7 = 56 templates 想定 (但し全組合せ作る必要なし)
CREATE TABLE IF NOT EXISTS sales_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  industry text NOT NULL,
  issue_code text NOT NULL,
  severity text DEFAULT 'warning',
  -- レポート LP の 3-act 用 (diagnostic-report-lp.jsx 参考)
  headline text,
  pain text,
  fear text,
  loss text,
  cta_text text,
  is_active boolean DEFAULT true,
  notion_page_id text UNIQUE,
  -- webhook / one-shot 補正で更新する時刻 (drift 検知用)
  last_synced timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (industry, issue_code),
  CHECK (
    industry IN (
      'beauty_salon', 'dental', 'restaurant', 'construction',
      'accounting', 'retail', 'cleaning', 'consulting'
    )
  ),
  CHECK (
    issue_code IN (
      'speed_critical', 'ua_残存', 'ssl_expired', 'wp_outdated',
      'no_ogp', 'no_sns', 'copyright_old'
    )
  ),
  CHECK (
    severity IN ('critical', 'warning', 'info')
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_templates_industry_issue ON sales_templates (industry, issue_code);
CREATE INDEX IF NOT EXISTS idx_sales_templates_active ON sales_templates (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sales_templates_notion_id ON sales_templates (notion_page_id);

-- ─── 5. sales_sync_logs (同期ログ・debug + audit) ──────────────
-- n8n / lib/sales/sync.ts からの全同期操作を記録 (RTBF / GDPR 監査対応)
CREATE TABLE IF NOT EXISTS sales_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  direction text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  notion_page_id text,
  action text,
  status text DEFAULT 'success',
  error_message text,
  payload jsonb,
  created_at timestamptz DEFAULT now(),
  CHECK (direction IN ('supabase->notion', 'notion->supabase')),
  CHECK (entity_type IN ('company', 'customer', 'delivery', 'template')),
  CHECK (action IN ('create', 'update', 'delete')),
  CHECK (status IN ('success', 'error', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_sales_sync_logs_entity ON sales_sync_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sales_sync_logs_status ON sales_sync_logs (status) WHERE status = 'error';
CREATE INDEX IF NOT EXISTS idx_sales_sync_logs_created ON sales_sync_logs (created_at DESC);

-- ─── 6. updated_at 自動更新トリガー (全テーブル共通) ───────────
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
  FOR tbl IN SELECT unnest(ARRAY['sales_companies', 'sales_customers', 'sales_deliveries', 'sales_templates'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_touch ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION sales_touch_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ─── 7. RLS (MM 永久ルール: 全テーブル RLS 必須・最小権限) ────
-- anon = 読込ゼロ (営業データは認証必須)・service_role のみ全権
ALTER TABLE sales_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_sync_logs ENABLE ROW LEVEL SECURITY;

-- service_role: 全権 (n8n / lib/sales/* で使用)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['sales_companies', 'sales_customers', 'sales_deliveries', 'sales_templates', 'sales_sync_logs'])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I_service_role_all ON %I', tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY %I_service_role_all ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- anon は完全禁止 (営業データ漏洩防止) — policy なし = 拒否

-- ─── 8. COMMENT (admin GUI で見える description) ───────────────
COMMENT ON TABLE sales_companies IS 'リードDB (営業 OS 主軸・Notion 🎯 と双方向同期)';
COMMENT ON TABLE sales_customers IS '顧客DB (成約後・Notion 🏢 と双方向同期・WL 戦略対応)';
COMMENT ON TABLE sales_deliveries IS '納品物DB (Notion 📦 主管・n8n が自動処理)';
COMMENT ON TABLE sales_templates IS '業種×課題テンプレDB (Notion 主管・webhook/one-shot sync)';
COMMENT ON TABLE sales_sync_logs IS '同期ログ (debug + RTBF audit)';

COMMENT ON COLUMN sales_companies.notion_page_id IS 'Notion ページの一意 ID・削除復元の anchor';
COMMENT ON COLUMN sales_customers.is_white_label IS 'WL 戦略 (Sprint 8/Q4): 顧客が自分のクライアントに転売';
COMMENT ON COLUMN sales_customers.wl_client_count IS 'WL 顧客が抱える 2 次クライアント数 (pMoat 強度)';
