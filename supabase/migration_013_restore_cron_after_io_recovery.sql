-- Migration 013: IO Budget recovery without cron restore
-- Permanent infra rule (2026-06-20): do not restore pg_cron jobs. Notion/Supabase
-- sync must be driven by Notion webhooks, Supabase Database Webhooks, queues, or
-- explicit admin actions.

-- ============================================================
-- STEP 1: keep legacy pg_cron jobs disabled if they exist
-- ============================================================
DO $$ BEGIN
  PERFORM cron.unschedule('companies-notion-sync');
EXCEPTION WHEN undefined_table OR undefined_function THEN
  RAISE NOTICE 'pg_cron not available, skipping companies-notion-sync disable';
WHEN OTHERS THEN
  RAISE NOTICE 'companies-notion-sync was not scheduled or could not be unscheduled: %', SQLERRM;
END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('templates-notion-sync');
EXCEPTION WHEN undefined_table OR undefined_function THEN
  RAISE NOTICE 'pg_cron not available, skipping templates-notion-sync disable';
WHEN OTHERS THEN
  RAISE NOTICE 'templates-notion-sync was not scheduled or could not be unscheduled: %', SQLERRM;
END $$;

-- ============================================================
-- 実行確認: cron.job に Paradigm site automation がないこと
-- ============================================================
-- SELECT * FROM cron.job WHERE command ILIKE '%paradigmjp.com%';
