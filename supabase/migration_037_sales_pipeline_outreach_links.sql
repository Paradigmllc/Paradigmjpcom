-- Sales OS pipeline link pass.
-- Keeps Supabase as the SSOT across pipeline runs, outreach, replies, video jobs, and sync logs.

alter table public.sales_pipeline_steps
  drop constraint if exists sales_pipeline_steps_key_check;

alter table public.sales_pipeline_steps
  add constraint sales_pipeline_steps_key_check
  check (step_key in (
    'twenty_csv_intake',
    'supabase_normalize',
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

alter table public.sales_activity_log
  add column if not exists pipeline_run_id uuid references public.sales_pipeline_runs (id) on delete set null;

alter table public.sales_operator_queue_items
  add column if not exists pipeline_run_id uuid references public.sales_pipeline_runs (id) on delete set null;

alter table public.sales_video_jobs
  add column if not exists pipeline_run_id uuid references public.sales_pipeline_runs (id) on delete set null;

alter table public.sales_sync_logs
  add column if not exists pipeline_run_id uuid references public.sales_pipeline_runs (id) on delete set null;

create index if not exists idx_sales_activity_log_pipeline_run
  on public.sales_activity_log (pipeline_run_id, occurred_at desc)
  where pipeline_run_id is not null;

create index if not exists idx_sales_operator_queue_pipeline_run
  on public.sales_operator_queue_items (pipeline_run_id, status, priority desc)
  where pipeline_run_id is not null;

create index if not exists idx_sales_video_jobs_pipeline_run
  on public.sales_video_jobs (pipeline_run_id, status, created_at desc)
  where pipeline_run_id is not null;

create index if not exists idx_sales_sync_logs_pipeline_run
  on public.sales_sync_logs (pipeline_run_id, created_at desc)
  where pipeline_run_id is not null;

comment on column public.sales_activity_log.pipeline_run_id is
  'Sales OS pipeline run that produced or received this activity, when applicable.';

comment on column public.sales_operator_queue_items.pipeline_run_id is
  'Pipeline run that requires human review or follow-up, when applicable.';

comment on column public.sales_video_jobs.pipeline_run_id is
  'Pipeline run waiting for this video job, when applicable.';

comment on column public.sales_sync_logs.pipeline_run_id is
  'Pipeline run that caused this external sync, when applicable.';

notify pgrst, 'reload schema';
