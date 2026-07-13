alter table public.sales_enrichment_jobs
  drop constraint if exists sales_enrichment_jobs_job_type_check;

alter table public.sales_enrichment_jobs
  add constraint sales_enrichment_jobs_job_type_check
  check (job_type in (
    'company_karte',
    'dify_diagnosis',
    'report_personalize',
    'twenty_sync',
    'demo_generate',
    'japan_entry_report'
  ));

create index if not exists idx_sales_enrichment_jobs_japan_entry_report_queue
  on public.sales_enrichment_jobs (status, priority desc, next_run_at asc, created_at asc)
  where job_type = 'japan_entry_report' and status in ('queued', 'running');

alter table public.sales_japan_entry_projections
  add column if not exists idempotency_key text;

create unique index if not exists uq_sales_japan_entry_projection_idempotency
  on public.sales_japan_entry_projections (company_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.sales_report_factory_state (
  factory_key text primary key check (factory_key = 'japan_entry_report'),
  lease_owner uuid,
  lease_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.sales_report_factory_state enable row level security;
revoke all on table public.sales_report_factory_state from anon, authenticated;
grant select, insert, update on table public.sales_report_factory_state to service_role;

insert into public.sales_report_factory_state (factory_key)
values ('japan_entry_report')
on conflict (factory_key) do nothing;

create or replace function public.claim_japan_entry_report_drain(
  p_owner uuid,
  p_lease_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_lease_seconds < 60 or p_lease_seconds > 1800 then
    raise exception 'p_lease_seconds must be between 60 and 1800';
  end if;

  update public.sales_report_factory_state
  set lease_owner = p_owner,
      lease_until = now() + make_interval(secs => p_lease_seconds),
      updated_at = now()
  where factory_key = 'japan_entry_report'
    and (
      lease_owner = p_owner
      or lease_until is null
      or lease_until < now()
    );

  return found;
end;
$$;

create or replace function public.release_japan_entry_report_drain(p_owner uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.sales_report_factory_state
  set lease_owner = null,
      lease_until = null,
      updated_at = now()
  where factory_key = 'japan_entry_report'
    and lease_owner = p_owner;

  return found;
end;
$$;

revoke all on function public.claim_japan_entry_report_drain(uuid, integer) from public;
revoke all on function public.release_japan_entry_report_drain(uuid) from public;
grant execute on function public.claim_japan_entry_report_drain(uuid, integer) to service_role;
grant execute on function public.release_japan_entry_report_drain(uuid) to service_role;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sales_enrichment_jobs'
  ) then
    alter publication supabase_realtime add table public.sales_enrichment_jobs;
  end if;
exception
  when insufficient_privilege then
    raise notice 'Skipping sales_enrichment_jobs realtime publication: insufficient privilege';
  when undefined_object then
    raise notice 'Skipping sales_enrichment_jobs realtime publication: publication is unavailable';
end
$$;

comment on column public.sales_japan_entry_projections.idempotency_key is
  'Retry-safe generation key. A report-factory job reuses its saved projection instead of generating duplicates.';

comment on table public.sales_enrichment_jobs is
  'Event-driven enrichment, reviewed demo and Japan Entry Opportunity Brief generation queue. No form submission is performed by report jobs.';

comment on table public.sales_report_factory_state is
  'Single event-chain lease for Japan Entry report generation. Prevents duplicate drain workers without cron or polling.';
