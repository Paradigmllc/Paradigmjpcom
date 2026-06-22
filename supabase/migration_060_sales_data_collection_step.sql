-- Add data_collection step to sales_pipeline_steps key constraint.
-- Multi-source data collection (crt.sh, SSL Labs, Mozilla Observatory,
-- OverPass API, Google Trends, SearXNG) for sales pipeline companies.

alter table public.sales_pipeline_steps
  drop constraint if exists sales_pipeline_steps_key_check;

alter table public.sales_pipeline_steps
  add constraint sales_pipeline_steps_key_check
  check (step_key in (
    'twenty_csv_intake',
    'supabase_normalize',
    'data_collection',
    'karte_generate',
    'report_generate',
    'video_generate',
    'r2_manifest',
    'external_studio_sync',
    'twenty_writeback',
    'outreach_preflight',
    'outreach_send',
    'reply_capture',
    'follow_up_queue'
  ));

notify pgrst, 'reload schema';
