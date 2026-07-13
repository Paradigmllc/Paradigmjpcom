-- Keep the event-driven company-insert trigger compatible with the canonical
-- pipeline provider constraint. This does not schedule or send outreach.
alter table public.sales_pipeline_runs
  drop constraint if exists sales_pipeline_runs_provider_check;

alter table public.sales_pipeline_runs
  add constraint sales_pipeline_runs_provider_check
  check (trigger_provider in ('trigger.dev', 'local', 'manual', 'openclaw', 'db_trigger'));

notify pgrst, 'reload schema';
