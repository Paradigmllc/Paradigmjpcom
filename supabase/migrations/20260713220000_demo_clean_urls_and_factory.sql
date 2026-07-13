alter table public.sales_report_factory_state
  drop constraint if exists sales_report_factory_state_factory_key_check;

alter table public.sales_report_factory_state
  add constraint sales_report_factory_state_factory_key_check
  check (factory_key in ('japan_entry_report', 'demo_generate'));

insert into public.sales_report_factory_state (factory_key)
values ('demo_generate')
on conflict (factory_key) do nothing;

create or replace function public.claim_demo_generation_drain(
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
  where factory_key = 'demo_generate'
    and (
      lease_owner = p_owner
      or lease_until is null
      or lease_until < now()
    );

  return found;
end;
$$;

create or replace function public.release_demo_generation_drain(p_owner uuid)
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
  where factory_key = 'demo_generate'
    and lease_owner = p_owner;

  return found;
end;
$$;

revoke all on function public.claim_demo_generation_drain(uuid, integer) from public;
revoke all on function public.release_demo_generation_drain(uuid) from public;
grant execute on function public.claim_demo_generation_drain(uuid, integer) to service_role;
grant execute on function public.release_demo_generation_drain(uuid) to service_role;

create unique index if not exists uq_sales_enrichment_jobs_demo_generation_key
  on public.sales_enrichment_jobs (company_id, (input_payload ->> 'generation_key'))
  where job_type = 'demo_generate'
    and input_payload ->> 'generation_key' is not null
    and status in ('queued', 'running', 'completed');

comment on function public.claim_demo_generation_drain(uuid, integer) is
  'Claims the singleton event-chain lease for bounded SMB demo generation.';

comment on index public.uq_sales_enrichment_jobs_demo_generation_key is
  'Reuses an unchanged reviewed manifest instead of spending LLM tokens on a duplicate demo.';

notify pgrst, 'reload schema';
