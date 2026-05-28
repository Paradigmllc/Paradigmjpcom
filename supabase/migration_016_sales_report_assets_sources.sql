-- Sales OS report assets and source coverage
-- Migration: 016_sales_report_assets_sources

create table if not exists public.web_demos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sales_companies (id) on delete set null,
  slug text not null unique,
  name text not null,
  html_content text,
  html text,
  source text not null default 'sales_enrichment',
  is_published boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  viewed_count integer not null default 0,
  cta_click_count integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_source_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sales_companies (id) on delete cascade,
  source_slug text not null,
  category text not null,
  status text not null,
  score integer not null default 0,
  details jsonb not null default '{}'::jsonb,
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_source_runs_status_check
    check (status in ('collected', 'configured', 'queued', 'missing', 'disabled', 'not_applicable', 'error')),
  constraint sales_source_runs_score_check
    check (score between 0 and 100)
);

create unique index if not exists uniq_sales_source_runs_company_source
  on public.sales_source_runs (company_id, source_slug);

create index if not exists idx_sales_source_runs_company_status
  on public.sales_source_runs (company_id, status, measured_at desc);

drop trigger if exists trg_web_demos_touch on public.web_demos;
create trigger trg_web_demos_touch
before update on public.web_demos
for each row execute function public.sales_touch_updated_at();

drop trigger if exists trg_sales_source_runs_touch on public.sales_source_runs;
create trigger trg_sales_source_runs_touch
before update on public.sales_source_runs
for each row execute function public.sales_touch_updated_at();

alter table public.web_demos enable row level security;
alter table public.sales_source_runs enable row level security;

drop policy if exists web_demos_service_role_all on public.web_demos;
create policy web_demos_service_role_all
  on public.web_demos for all to service_role
  using (true) with check (true);

drop policy if exists sales_source_runs_service_role_all on public.sales_source_runs;
create policy sales_source_runs_service_role_all
  on public.sales_source_runs for all to service_role
  using (true) with check (true);

grant select, insert, update, delete on table public.web_demos to service_role;
grant select, insert, update, delete on table public.sales_source_runs to service_role;

insert into public.sales_tool_connections
  (slug, display_name, role, interface_type, deployment_type, base_url, health_url, status, owner, meta)
values
  (
    'supabase',
    'Supabase OSS',
    'Sales OS SSOT: PostgreSQL, Auth-ready API, RLS, PostgREST, and enrichment queues.',
    'database',
    'oss_self_hosted',
    'https://supabase-paradigm.139.59.250.5.sslip.io',
    'https://supabase-paradigm.139.59.250.5.sslip.io/rest/v1/',
    'active',
    'Paradigm',
    '{"source_of_truth":true,"migration":"cloud_to_oss"}'::jsonb
  ),
  (
    'nocodb',
    'NocoDB OSS',
    'Bulk CSV cleaning and spreadsheet-style edits against the Supabase SSOT.',
    'spreadsheet',
    'oss_self_hosted',
    'https://nocodb-paradigm.139.59.250.5.sslip.io',
    null,
    'active',
    'Paradigm',
    '{"connects_to":"sales_companies","safe_use":"bulk edit only, Supabase remains SSOT"}'::jsonb
  ),
  (
    'appsmith',
    'Appsmith OSS',
    'Operator cockpit for one-record-at-a-time calling, form sending, and manual review.',
    'operator_console',
    'oss_self_hosted',
    'https://appsmith-paradigm.139.59.250.5.sslip.io',
    null,
    'active',
    'Paradigm',
    '{"connects_to":"sales_operator_queue_items","guardrail":"single-record workflow"}'::jsonb
  ),
  (
    'twenty',
    'Twenty OSS',
    'CRM relationship layer for companies, people, stages, activity history, and deal flow.',
    'crm',
    'oss_self_hosted',
    'https://twenty-paradigm.139.59.250.5.sslip.io',
    null,
    'active',
    'Paradigm',
    '{"sync_mode":"projection_from_supabase","write_policy":"CRM edits reconcile back to SSOT"}'::jsonb
  ),
  (
    'metabase',
    'Metabase OSS',
    'BI dashboards for reply rate, conversion, source quality, and operator productivity.',
    'bi',
    'oss_self_hosted',
    'https://metabase.appexx.me',
    null,
    'active',
    'Paradigm',
    '{"connects_to":"sales_source_runs and sales_companies"}'::jsonb
  ),
  (
    'n8n',
    'n8n OSS',
    'Workflow bus for enrichment, notifications, source fan-out, and scheduled outreach.',
    'automation',
    'oss_self_hosted',
    'https://n8n.appexx.me',
    null,
    'active',
    'Paradigm',
    '{"role":"integration_bus","fallback_runner":"/api/sales/enrichment/run"}'::jsonb
  )
on conflict (slug) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  interface_type = excluded.interface_type,
  deployment_type = excluded.deployment_type,
  base_url = excluded.base_url,
  health_url = excluded.health_url,
  status = excluded.status,
  owner = excluded.owner,
  meta = sales_tool_connections.meta || excluded.meta,
  updated_at = now();

comment on table public.web_demos is
  'Published Astro-style replacement demo pages shown from /d/[slug].';

comment on table public.sales_source_runs is
  'Per-company coverage ledger showing which OSS/API sources successfully contributed evidence to the sales report.';
