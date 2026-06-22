-- migration_061_release_table_parity.sql
-- Release gate table parity repair for legacy proposal and agency SSOT tables.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  business_name text not null default '',
  lead_id uuid,
  template_id uuid,
  pattern_id uuid,
  demo_data jsonb not null default '{}'::jsonb,
  status text not null default 'new',
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  cta_clicked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prospects add column if not exists slug text;
alter table public.prospects add column if not exists business_name text not null default '';
alter table public.prospects add column if not exists lead_id uuid;
alter table public.prospects add column if not exists template_id uuid;
alter table public.prospects add column if not exists pattern_id uuid;
alter table public.prospects add column if not exists demo_data jsonb not null default '{}'::jsonb;
alter table public.prospects add column if not exists status text not null default 'new';
alter table public.prospects add column if not exists view_count integer not null default 0;
alter table public.prospects add column if not exists last_viewed_at timestamptz;
alter table public.prospects add column if not exists cta_clicked_at timestamptz;
alter table public.prospects add column if not exists created_at timestamptz not null default now();
alter table public.prospects add column if not exists updated_at timestamptz not null default now();
create unique index if not exists prospects_slug_unique on public.prospects(slug) where slug is not null;
create index if not exists prospects_status_idx on public.prospects(status);
create index if not exists prospects_lead_id_idx on public.prospects(lead_id);

create table if not exists public.prospect_patterns (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  description text,
  conditions jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prospect_patterns add column if not exists name text not null default '';
alter table public.prospect_patterns add column if not exists description text;
alter table public.prospect_patterns add column if not exists conditions jsonb not null default '{}'::jsonb;
alter table public.prospect_patterns add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.prospect_patterns add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.prospect_patterns add column if not exists created_at timestamptz not null default now();
alter table public.prospect_patterns add column if not exists updated_at timestamptz not null default now();

create table if not exists public.agency_companies (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  domain text unique not null,
  industry text,
  tech_stack jsonb default '{}'::jsonb,
  est_loss_mrr numeric default 0,
  status text default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.agency_presentations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.agency_companies(id) on delete cascade,
  title text not null,
  slide_content jsonb default '{}'::jsonb,
  pdf_url text,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.agency_videos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.agency_companies(id) on delete cascade,
  title text not null,
  workflow_json jsonb default '{}'::jsonb,
  video_url text,
  duration_sec integer default 0,
  status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.agency_demo_sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.agency_companies(id) on delete cascade,
  repo_url text,
  deployed_url text,
  keystatic_data jsonb default '{}'::jsonb,
  status text default 'building',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.agency_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.agency_companies(id) on delete cascade,
  slug text unique not null,
  metrics jsonb default '{}'::jsonb,
  view_count integer default 0,
  total_view_time_sec integer default 0,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.prospects enable row level security;
alter table public.prospect_patterns enable row level security;
alter table public.agency_companies enable row level security;
alter table public.agency_presentations enable row level security;
alter table public.agency_videos enable row level security;
alter table public.agency_demo_sites enable row level security;
alter table public.agency_reports enable row level security;

drop policy if exists prospects_service_role_all on public.prospects;
create policy prospects_service_role_all on public.prospects for all to service_role using (true) with check (true);
drop policy if exists prospect_patterns_service_role_all on public.prospect_patterns;
create policy prospect_patterns_service_role_all on public.prospect_patterns for all to service_role using (true) with check (true);
drop policy if exists agency_companies_service_role_all on public.agency_companies;
create policy agency_companies_service_role_all on public.agency_companies for all to service_role using (true) with check (true);
drop policy if exists agency_presentations_service_role_all on public.agency_presentations;
create policy agency_presentations_service_role_all on public.agency_presentations for all to service_role using (true) with check (true);
drop policy if exists agency_videos_service_role_all on public.agency_videos;
create policy agency_videos_service_role_all on public.agency_videos for all to service_role using (true) with check (true);
drop policy if exists agency_demo_sites_service_role_all on public.agency_demo_sites;
create policy agency_demo_sites_service_role_all on public.agency_demo_sites for all to service_role using (true) with check (true);
drop policy if exists agency_reports_service_role_all on public.agency_reports;
create policy agency_reports_service_role_all on public.agency_reports for all to service_role using (true) with check (true);
drop policy if exists agency_reports_anon_active_select on public.agency_reports;
create policy agency_reports_anon_active_select on public.agency_reports for select to anon, authenticated using (status = 'active');

grant select, insert, update, delete on public.prospects to service_role;
grant select, insert, update, delete on public.prospect_patterns to service_role;
grant select, insert, update, delete on public.agency_companies to service_role;
grant select, insert, update, delete on public.agency_presentations to service_role;
grant select, insert, update, delete on public.agency_videos to service_role;
grant select, insert, update, delete on public.agency_demo_sites to service_role;
grant select, insert, update, delete on public.agency_reports to service_role;
grant select on public.agency_reports to anon, authenticated;

drop trigger if exists set_prospects_updated_at on public.prospects;
create trigger set_prospects_updated_at before update on public.prospects for each row execute function public.set_updated_at();
drop trigger if exists set_prospect_patterns_updated_at on public.prospect_patterns;
create trigger set_prospect_patterns_updated_at before update on public.prospect_patterns for each row execute function public.set_updated_at();
drop trigger if exists set_agency_companies_updated_at on public.agency_companies;
create trigger set_agency_companies_updated_at before update on public.agency_companies for each row execute function public.set_updated_at();
drop trigger if exists set_agency_presentations_updated_at on public.agency_presentations;
create trigger set_agency_presentations_updated_at before update on public.agency_presentations for each row execute function public.set_updated_at();
drop trigger if exists set_agency_videos_updated_at on public.agency_videos;
create trigger set_agency_videos_updated_at before update on public.agency_videos for each row execute function public.set_updated_at();
drop trigger if exists set_agency_demo_sites_updated_at on public.agency_demo_sites;
create trigger set_agency_demo_sites_updated_at before update on public.agency_demo_sites for each row execute function public.set_updated_at();
drop trigger if exists set_agency_reports_updated_at on public.agency_reports;
create trigger set_agency_reports_updated_at before update on public.agency_reports for each row execute function public.set_updated_at();
