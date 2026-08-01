-- Keep the legacy event-driven company trigger compatible with the canonical
-- source constraint, while excluding reviewed demo-only and list-only companies completely.
alter table public.sales_pipeline_runs
  drop constraint if exists sales_pipeline_runs_source_check;

alter table public.sales_pipeline_runs
  add constraint sales_pipeline_runs_source_check
  check (source in (
    'sales_os',
    'twenty',
    'twenty_csv_intake',
    'csv',
    'manual',
    'webhook',
    'batch',
    'event_driven'
  ));

create or replace function public.trg_pipeline_on_company_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_run_id uuid;
begin
  if coalesce(new.meta->>'skip_enrichment', 'false') = 'true'
    or new.source in ('reviewed_demo_manifest', 'multi_source_domains') then
    return new;
  end if;

  insert into public.sales_pipeline_runs
    (company_id, source, status, trigger_provider, requested_by, require_video, auto_sync_external_studios, input_payload, result_payload, created_at, updated_at)
  values
    (new.id, 'event_driven', 'running', 'db_trigger', 'system', false, false, '{}'::jsonb, '{}'::jsonb, now(), now())
  returning id into new_run_id;

  insert into public.sales_pipeline_steps
    (run_id, company_id, step_key, status, position, required, owner_tool, created_at, updated_at)
  values
    (new_run_id, new.id, 'supabase_normalize', 'queued', 1, true, 'pipeline', now(), now()),
    (new_run_id, new.id, 'twenty_csv_intake', 'queued', 2, true, 'pipeline', now(), now()),
    (new_run_id, new.id, 'report_generate', 'queued', 3, true, 'pipeline', now(), now()),
    (new_run_id, new.id, 'karte_generate', 'queued', 4, true, 'pipeline', now(), now()),
    (new_run_id, new.id, 'r2_manifest', 'queued', 5, true, 'pipeline', now(), now()),
    (new_run_id, new.id, 'outreach_preflight', 'queued', 6, false, 'pipeline', now(), now()),
    (new_run_id, new.id, 'outreach_send', 'queued', 7, false, 'pipeline', now(), now()),
    (new_run_id, new.id, 'twenty_writeback', 'queued', 8, true, 'pipeline', now(), now());

  return new;
end;
$$;

notify pgrst, 'reload schema';
