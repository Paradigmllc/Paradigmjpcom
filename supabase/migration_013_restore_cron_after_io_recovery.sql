-- Migration 013: IO Budget 復旧後の cron ジョブ再開
-- migration_012 の逆操作。Disk IO Budget リセット後に実行する

-- ============================================================
-- STEP 1: pg_cron ジョブ 再スケジュール（間隔を長くして負荷低減）
-- ============================================================
DO $$ BEGIN
  PERFORM cron.schedule(
    'companies-notion-sync',
    '30 minutes',
    $$ 
    -- Notion → Supabase companies 同期（30分毎に緩和）
    SELECT net.http_post(
      url:='https://paradigmjp.com/api/sales/sync-companies-from-notion',
      headers:='{"Content-Type": "application/json", "x-webhook-secret": "' || current_setting('app.n8n_webhook_secret', true) || '"}'::jsonb
    );
    $$
  );
EXCEPTION WHEN undefined_table OR undefined_function THEN
  RAISE NOTICE 'pg_cron not available, skipping job reschedule';
END $$;

DO $$ BEGIN
  PERFORM cron.schedule(
    'templates-notion-sync',
    '60 minutes',
    $$
    -- Notion → Supabase templates 同期（1時間毎）
    SELECT net.http_post(
      url:='https://paradigmjp.com/api/sales/sync-templates-from-notion',
      headers:='{"Content-Type": "application/json", "x-webhook-secret": "' || current_setting('app.n8n_webhook_secret', true) || '"}'::jsonb
    );
    $$
  );
EXCEPTION WHEN undefined_table OR undefined_function THEN
  RAISE NOTICE 'pg_cron not available, skipping job reschedule';
END $$;

-- ============================================================
-- 実行確認
-- ============================================================
-- SELECT * FROM cron.job;