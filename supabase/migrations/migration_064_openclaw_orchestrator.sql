-- Migration 064: OpenClaw orchestrator → Trigger.dev + n8n column cleanup.
-- 2026-07-06: OpenClaw replaces Trigger.dev as the pipeline orchestrator.
-- WW-EVENT compliant: no cron/scheduled tasks. All execution is event-driven.

-- 1. Add 'openclaw' to trigger_provider CHECK constraint on sales_pipeline_runs.
alter table public.sales_pipeline_runs
  drop constraint if exists sales_pipeline_runs_provider_check;

alter table public.sales_pipeline_runs
  add constraint sales_pipeline_runs_provider_check
    check (trigger_provider in ('trigger.dev', 'local', 'manual', 'openclaw'));

-- 2. Update trigger_provider default to 'openclaw'.
alter table public.sales_pipeline_runs
  alter column trigger_provider set default 'openclaw';

-- 3. Mark n8n_workflow_url + n8n_execution_id as deprecated on sales_video_jobs.
-- These columns persist for backward compatibility with existing records.
-- They will be dropped in a future migration once all video pipeline data is migrated.
comment on column public.sales_video_jobs.n8n_workflow_url is
  'DEPRECATED 2026-07-06: n8n decommissioned (WW-EVENT). Column carries legacy data only. Will be dropped in a future migration.';

comment on column public.sales_video_jobs.n8n_execution_id is
  'DEPRECATED 2026-07-06: n8n decommissioned (WW-EVENT). Column carries legacy data only. Will be dropped in a future migration.';

-- 4. Update trigger_endpoint + trigger_run_id comments to reflect OpenClaw ownership.
comment on column public.sales_video_jobs.trigger_endpoint is
  'OpenClaw pipeline endpoint. Previously Trigger.dev (decommissioned 2026-07-06).';

comment on column public.sales_video_jobs.trigger_run_id is
  'OpenClaw pipeline run ID. Previously Trigger.dev run ID (decommissioned 2026-07-06).';

-- 5. Update sales_video_jobs table comment.
comment on table public.sales_video_jobs is
  'Video production jobs for sales videos and video subscription delivery. OpenClaw coordinates; renderers remain external or self-hosted.';

notify pgrst, 'reload schema';
