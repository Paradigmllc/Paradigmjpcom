-- Sales OS integration inventory / quota snapshot.
-- Supabase remains the SSOT. Runtime never stores API key values, only env names
-- and status snapshots that can be shown in the dashboard.

create table if not exists sales_integration_status (
  slug text primary key,
  display_name text not null,
  category text not null,
  deployment text not null,
  status text not null default 'missing',
  configured_env text[] not null default '{}',
  missing_env text[] not null default '{}',
  optional_missing_env text[] not null default '{}',
  balance_status text not null default 'not_applicable',
  balance_label text not null default '',
  docs_url text,
  recommended boolean not null default false,
  notes text not null default '',
  checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_integration_status_status_check
    check (status in ('ready', 'missing', 'partial', 'manual', 'optional')),
  constraint sales_integration_status_balance_check
    check (balance_status in ('not_applicable', 'not_configured', 'manual', 'checkable', 'ok', 'error'))
);

alter table sales_integration_status enable row level security;

drop policy if exists sales_integration_status_service_role_all on sales_integration_status;
create policy sales_integration_status_service_role_all
  on sales_integration_status
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table sales_integration_status is
  'Integration status snapshots for Sales OS. Stores no secret values.';
