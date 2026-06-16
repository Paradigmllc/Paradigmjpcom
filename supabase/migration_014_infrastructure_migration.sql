-- migration_014_infrastructure_migration.sql
-- Sales OS infrastructure migration control plane.

create table if not exists public.sales_infrastructure_migration (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  provider text not null,
  role text not null,
  status text not null default 'planned',
  monthly_cost_yen integer,
  cpu_label text,
  memory_label text,
  disk_label text,
  public_url text,
  sort_order integer not null default 100,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.sales_infrastructure_migration enable row level security;

drop policy if exists sales_infrastructure_migration_service_role_all on public.sales_infrastructure_migration;
create policy sales_infrastructure_migration_service_role_all on public.sales_infrastructure_migration for all to service_role using (true) with check (true);

grant select, insert, update, delete on public.sales_infrastructure_migration to service_role;

create index if not exists idx_sales_infra_migration_status
  on public.sales_infrastructure_migration(status, sort_order);

create or replace function public.set_sales_infra_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_sales_infrastructure_migration_updated_at
  on public.sales_infrastructure_migration;

create trigger set_sales_infrastructure_migration_updated_at
before update on public.sales_infrastructure_migration
for each row execute function public.set_sales_infra_updated_at();

insert into public.sales_infrastructure_migration (
  slug,
  title,
  provider,
  role,
  status,
  monthly_cost_yen,
  cpu_label,
  memory_label,
  disk_label,
  public_url,
  sort_order,
  notes
) values
  (
    'digitalocean-current',
    'DigitalOcean appexx-prod-01',
    'DigitalOcean',
    'current',
    'tier_blocked',
    8100,
    '4 vCPU',
    '8 GB',
    '160 GB',
    'https://cloud.digitalocean.com/droplets/555590454',
    10,
    'The current DigitalOcean account exposes no SGP1 resize target above 8GB RAM. Use the remaining credit only for temporary operation.'
  ),
  (
    'hetzner-target-cx43',
    'Hetzner CX43',
    'Hetzner',
    'target',
    'recommended',
    3000,
    '8 vCPU',
    '16 GB',
    '160 GB',
    null,
    20,
    'Recommended monthly budget target. Move Supabase OSS, NocoDB, Twenty, Appsmith, Metabase, n8n, and project workloads here in phases.'
  ),
  (
    'migration-runbook',
    'Full migration runbook',
    'Paradigm',
    'runbook',
    'ready',
    null,
    null,
    null,
    null,
    null,
    30,
    'Inventory, backup, restore, DNS cutover, 7-14 day parallel run, then cancel DigitalOcean.'
  )
on conflict (slug) do update set
  title = excluded.title,
  provider = excluded.provider,
  role = excluded.role,
  status = excluded.status,
  monthly_cost_yen = excluded.monthly_cost_yen,
  cpu_label = excluded.cpu_label,
  memory_label = excluded.memory_label,
  disk_label = excluded.disk_label,
  public_url = excluded.public_url,
  sort_order = excluded.sort_order,
  notes = excluded.notes,
  updated_at = now();
