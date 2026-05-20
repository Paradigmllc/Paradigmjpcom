-- ============================================================
-- sales_companies 重複排除キー (name_key) 追加
-- Migration: 006_company_dedup
-- Created:   2026-05-20
-- ============================================================
-- 目的: 「1 企業 = 1 行」を保証するための正規化名キー。
--   - domain は既に UNIQUE (硬い物理キー)
--   - name_key = 法人格/空白/全半角を畳んだ正規化名 (軟らかい dedup 鍵・lib/sales/dedup.ts と一致)
--   - name_key は **非 UNIQUE** (異企業の同名偶発一致で誤統合しないため・code で domain→name_key 順に照合)
-- ============================================================

ALTER TABLE sales_companies ADD COLUMN IF NOT EXISTS name_key text;

-- region + name_key で高速照合 (dedup lookup 用・非 UNIQUE)
CREATE INDEX IF NOT EXISTS idx_sales_companies_name_key
  ON sales_companies (region, name_key) WHERE name_key IS NOT NULL;

COMMENT ON COLUMN sales_companies.name_key IS
  '正規化企業名 (法人格/空白/全半角除去)・domain 無し時の dedup 鍵 (lib/sales/dedup.ts normalizeCompanyName と一致)';

-- 既存行の backfill (簡易正規化: 法人格 + 空白除去・lower)。本式の正規化は次回 upsert 時に code が上書き。
UPDATE sales_companies
SET name_key = lower(
  regexp_replace(
    regexp_replace(company_name, '(株式会社|有限会社|合同会社|㈱|㈲|\(株\)|\(有\)|Co\.,?\s*Ltd\.?|Inc\.?|LLC\.?|Corp\.?|Ltd\.?)', '', 'gi'),
    '[[:space:]　、。・,.\-_/()（）]', '', 'g'
  )
)
WHERE name_key IS NULL AND company_name IS NOT NULL;
