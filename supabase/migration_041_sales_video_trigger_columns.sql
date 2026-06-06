-- Sales video pipeline Trigger.dev column names.
-- Legacy n8n_* columns remain for backward compatibility during rollout.

alter table public.sales_video_jobs
  add column if not exists trigger_endpoint text,
  add column if not exists trigger_run_id text;

update public.sales_video_jobs
set
  trigger_endpoint = coalesce(trigger_endpoint, n8n_workflow_url),
  trigger_run_id = coalesce(trigger_run_id, n8n_execution_id)
where trigger_endpoint is null
   or trigger_run_id is null;

comment on column public.sales_video_jobs.trigger_endpoint is
  'Trigger.dev task endpoint used to dispatch this video job.';

comment on column public.sales_video_jobs.trigger_run_id is
  'Trigger.dev run ID returned by dispatch, when available.';

comment on column public.sales_video_jobs.n8n_workflow_url is
  'Legacy compatibility column. New code writes trigger_endpoint as the source of truth.';

comment on column public.sales_video_jobs.n8n_execution_id is
  'Legacy compatibility column. New code writes trigger_run_id as the source of truth.';

notify pgrst, 'reload schema';
