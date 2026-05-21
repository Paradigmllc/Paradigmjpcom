-- ============================================================
-- Sales OS country / locale / template routing
-- Migration: 008_sales_country_locale_templates
-- Created:   2026-05-21
-- ============================================================

ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS report_locale text NOT NULL DEFAULT 'ja';
ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS target_country text NOT NULL DEFAULT 'JP';
ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS template_variant text NOT NULL DEFAULT 'website_diagnostic';

ALTER TABLE sales_companies DROP CONSTRAINT IF EXISTS sales_companies_report_locale_check;
ALTER TABLE sales_companies ADD CONSTRAINT sales_companies_report_locale_check
  CHECK (report_locale IN ('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id'));

ALTER TABLE sales_companies DROP CONSTRAINT IF EXISTS sales_companies_target_country_check;
ALTER TABLE sales_companies ADD CONSTRAINT sales_companies_target_country_check
  CHECK (target_country ~ '^[A-Z]{2}$');

ALTER TABLE sales_companies DROP CONSTRAINT IF EXISTS sales_companies_template_variant_check;
ALTER TABLE sales_companies ADD CONSTRAINT sales_companies_template_variant_check
  CHECK (template_variant IN (
    'website_diagnostic',
    'meo',
    'security',
    'japan_entry',
    'video_subscription',
    'subsidy',
    'outreach'
  ));

CREATE INDEX IF NOT EXISTS idx_sales_companies_country_locale
  ON sales_companies (target_country, report_locale);
CREATE INDEX IF NOT EXISTS idx_sales_companies_template_variant
  ON sales_companies (template_variant);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_companies_region_slug_unique
  ON sales_companies (region, slug)
  WHERE slug IS NOT NULL;

ALTER TABLE sales_templates ADD COLUMN IF NOT EXISTS template_variant text NOT NULL DEFAULT 'website_diagnostic';
ALTER TABLE sales_templates ADD COLUMN IF NOT EXISTS report_locale text NOT NULL DEFAULT 'ja';
ALTER TABLE sales_templates ADD COLUMN IF NOT EXISTS target_country text NOT NULL DEFAULT 'JP';

ALTER TABLE sales_templates DROP CONSTRAINT IF EXISTS sales_templates_template_variant_check;
ALTER TABLE sales_templates ADD CONSTRAINT sales_templates_template_variant_check
  CHECK (template_variant IN (
    'website_diagnostic',
    'meo',
    'security',
    'japan_entry',
    'video_subscription',
    'subsidy',
    'outreach'
  ));

ALTER TABLE sales_templates DROP CONSTRAINT IF EXISTS sales_templates_report_locale_check;
ALTER TABLE sales_templates ADD CONSTRAINT sales_templates_report_locale_check
  CHECK (report_locale IN ('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id'));

ALTER TABLE sales_templates DROP CONSTRAINT IF EXISTS sales_templates_target_country_check;
ALTER TABLE sales_templates ADD CONSTRAINT sales_templates_target_country_check
  CHECK (target_country ~ '^[A-Z]{2}$');

ALTER TABLE sales_templates DROP CONSTRAINT IF EXISTS sales_templates_industry_issue_code_key;
ALTER TABLE sales_templates DROP CONSTRAINT IF EXISTS sales_templates_industry_issue_region_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_templates_scope_unique
  ON sales_templates (
    region,
    template_variant,
    target_country,
    report_locale,
    industry,
    issue_code
  );

CREATE INDEX IF NOT EXISTS idx_sales_templates_scope_lookup
  ON sales_templates (
    region,
    industry,
    issue_code,
    template_variant,
    target_country,
    report_locale
  )
  WHERE is_active = true;

COMMENT ON COLUMN sales_companies.report_locale IS
  '診断レポートの表示言語 slug。/ja/report, /en/report, /ko/report などを Notion から管理する。';
COMMENT ON COLUMN sales_companies.target_country IS
  '対象国 ISO-3166 alpha-2。Notion の国別ビューとテンプレ自動適用に使う。';
COMMENT ON COLUMN sales_companies.template_variant IS
  '診断テンプレ種別。website_diagnostic/meo/security/japan_entry/video_subscription/subsidy/outreach。';
COMMENT ON COLUMN sales_templates.template_variant IS
  'テンプレ種別。企業カルテの template_variant と一致するものを優先適用する。';
COMMENT ON COLUMN sales_templates.report_locale IS
  'テンプレ表示言語。完全一致がなければ en/ja/legacy にフォールバックする。';
COMMENT ON COLUMN sales_templates.target_country IS
  'テンプレ対象国。完全一致がなければ同 region の汎用テンプレにフォールバックする。';
