-- Migration 014: Abolish pg_cron jobs — event-driven only (WW-EVENT permanent rule)
--
-- Server-load mitigation: site-wide cron / scheduled execution is abolished.
-- Notion → Supabase sync (companies / templates / customers) must run on
-- external events (Notion webhook → /api/sales/sync-*-from-notion, n8n webhook,
-- Supabase DB webhook, or a manual/operator action), NOT pg_cron.
--
-- This migration unschedules the jobs (re)created by migration_013 and any
-- earlier Notion-sync jobs. It is idempotent and safe when pg_cron is absent.
-- DO NOT re-introduce cron.schedule(...) anywhere. migration_013 is superseded.

DO $$
DECLARE
  job_name text;
  cron_job_names text[] := ARRAY[
    'companies-notion-sync',
    'templates-notion-sync',
    'customers-notion-sync',
    'sales-weekly-digest'
  ];
BEGIN
  FOREACH job_name IN ARRAY cron_job_names LOOP
    BEGIN
      PERFORM cron.unschedule(job_name);
      RAISE NOTICE 'pg_cron job unscheduled: %', job_name;
    EXCEPTION
      WHEN undefined_table OR undefined_function THEN
        RAISE NOTICE 'pg_cron not available, skipping unschedule of %', job_name;
      WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron job % not present (already removed)', job_name;
    END;
  END LOOP;
END $$;

-- Defensive: unschedule ALL remaining cron jobs so nothing keeps polling.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT jobname FROM cron.job LOOP
    BEGIN
      PERFORM cron.unschedule(r.jobname);
      RAISE NOTICE 'pg_cron residual job unscheduled: %', r.jobname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'could not unschedule residual job %', r.jobname;
    END;
  END LOOP;
EXCEPTION
  WHEN undefined_table OR undefined_function THEN
    RAISE NOTICE 'pg_cron not available, nothing to sweep';
END $$;

-- Verify (manual): SELECT * FROM cron.job;  -- expect 0 rows
