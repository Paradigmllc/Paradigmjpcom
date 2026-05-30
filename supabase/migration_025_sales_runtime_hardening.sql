-- Sales OS runtime hardening for the self-hosted Supabase/PostgREST SSOT.
-- This migration intentionally stores no secret values.

grant usage on schema public to service_role;

grant select, insert, update, delete on table public.sales_content_templates to service_role;
grant select, insert, update, delete on table public.sales_integration_status to service_role;
grant select, insert, update, delete on table public.sales_agent_commands to service_role;
grant select, insert, update, delete on table public.sales_agent_events to service_role;

create index if not exists idx_sales_integration_status_category
  on public.sales_integration_status (category, status, checked_at desc);

create index if not exists idx_sales_integration_status_recommended
  on public.sales_integration_status (recommended, status, checked_at desc)
  where recommended = true;

create table if not exists public.sales_platform_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  component text not null,
  status text not null default 'unknown',
  summary text not null default '',
  metrics jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  constraint sales_platform_health_snapshots_component_check
    check (component in ('coolify', 'supabase_db', 'supabase_rest', 'supabase_full_stack', 'sales_app')),
  constraint sales_platform_health_snapshots_status_check
    check (status in ('healthy', 'degraded', 'blocked', 'unknown'))
);

create index if not exists idx_sales_platform_health_component
  on public.sales_platform_health_snapshots (component, checked_at desc);

alter table public.sales_platform_health_snapshots enable row level security;

drop policy if exists sales_platform_health_snapshots_service_role_all
  on public.sales_platform_health_snapshots;
create policy sales_platform_health_snapshots_service_role_all
  on public.sales_platform_health_snapshots
  for all to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.sales_platform_health_snapshots to service_role;

comment on table public.sales_platform_health_snapshots is
  'Operational health snapshots for Coolify, Supabase OSS, PostgREST, and the Sales OS app. No secrets are stored.';

notify pgrst, 'reload schema';
