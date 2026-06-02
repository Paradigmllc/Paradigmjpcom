-- SearxNG lead-source run ledger for top-of-funnel search acquisition.

create table if not exists public.sales_searxng_search_runs (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  region text not null default 'global' check (region in ('jp', 'global')),
  report_locale text not null default 'en',
  target_country text not null default 'US',
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'imported')),
  engines text[] not null default '{}'::text[],
  categories text[] not null default '{"general"}'::text[],
  language text not null default 'en',
  safesearch integer not null default 1 check (safesearch >= 0 and safesearch <= 2),
  time_range text check (time_range is null or time_range in ('day', 'month', 'year')),
  pages_requested integer not null default 1 check (pages_requested >= 1 and pages_requested <= 5),
  total_results integer not null default 0 check (total_results >= 0),
  unique_domains integer not null default 0 check (unique_domains >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  batch_id uuid references public.sales_lead_batches(id) on delete set null,
  error_message text,
  meta jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_searxng_search_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sales_searxng_search_runs(id) on delete cascade,
  result_index integer not null check (result_index >= 0),
  url text not null,
  domain text not null,
  title text not null,
  snippet text not null default '',
  engine text,
  category text,
  score integer not null default 0 check (score >= 0 and score <= 100),
  status text not null default 'ready'
    check (status in ('ready', 'duplicate', 'rejected', 'imported')),
  rejection_reason text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, domain)
);

create index if not exists idx_sales_searxng_runs_scope_status
  on public.sales_searxng_search_runs (region, report_locale, status, created_at desc);

create index if not exists idx_sales_searxng_results_run_score
  on public.sales_searxng_search_results (run_id, status, score desc);

create index if not exists idx_sales_searxng_results_domain
  on public.sales_searxng_search_results (domain);

create or replace function public.touch_sales_searxng_search_runs()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_sales_searxng_search_results()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sales_searxng_search_runs_touch on public.sales_searxng_search_runs;
create trigger trg_sales_searxng_search_runs_touch
before update on public.sales_searxng_search_runs
for each row execute function public.touch_sales_searxng_search_runs();

drop trigger if exists trg_sales_searxng_search_results_touch on public.sales_searxng_search_results;
create trigger trg_sales_searxng_search_results_touch
before update on public.sales_searxng_search_results
for each row execute function public.touch_sales_searxng_search_results();

alter table public.sales_searxng_search_runs enable row level security;
alter table public.sales_searxng_search_results enable row level security;

drop policy if exists sales_searxng_search_runs_service_role_all on public.sales_searxng_search_runs;
create policy sales_searxng_search_runs_service_role_all
  on public.sales_searxng_search_runs
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists sales_searxng_search_results_service_role_all on public.sales_searxng_search_results;
create policy sales_searxng_search_results_service_role_all
  on public.sales_searxng_search_results
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.sales_searxng_search_runs to service_role;
grant select, insert, update, delete on table public.sales_searxng_search_results to service_role;

comment on table public.sales_searxng_search_runs is
  'SearxNG search executions used as the top-of-funnel source for overseas SMB outreach.';

comment on table public.sales_searxng_search_results is
  'Normalized and scored SearxNG results before import into monthly lead batches.';
