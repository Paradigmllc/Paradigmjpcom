-- Migration 012: Emergency IO Throttle — Disk IO Budget 枯渇対策
-- 目的: 非クリティカルなDB操作を一時停止し、IO Budget回復を待つ
-- Disk IO Budget は24時間でリセットされる
-- 復旧後は supabase/migration_013_restore_io.sql で元に戻す

-- ============================================================
-- STEP 1: pg_cron ジョブ 緊急停止 (存在する場合のみ)
-- ============================================================
DO $$ BEGIN
  PERFORM cron.unschedule(3);
EXCEPTION WHEN undefined_table OR undefined_function THEN
  RAISE NOTICE 'pg_cron not available, skipping job 3 unschedule';
END $$;

DO $$ BEGIN
  PERFORM cron.unschedule(4);
EXCEPTION WHEN undefined_table OR undefined_function THEN
  RAISE NOTICE 'pg_cron not available, skipping job 4 unschedule';
END $$;

-- ============================================================
-- STEP 2: 読み取り負荷軽減のためのインデックス追加
-- (BeforeDashboard / dashboard の集計クエリ用)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sales_companies_pipeline_status
  ON sales_companies (pipeline_status) WHERE pipeline_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_companies_created_at
  ON sales_companies (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON paradigm.audit_logs (created_at DESC);

-- ============================================================
-- 復旧確認用クエリ (手動実行)
-- ============================================================
-- Disk IO Budget がリセットされたか確認:
--   Supabase Dashboard → Reports → Disk IO Budget
-- または24時間待ってから以下のクエリで確認:
--   SELECT * FROM pg_stat_database WHERE datname = 'postgres';