-- Sales OS source acquisition and Wappalyzer technology stack metrics.

create table if not exists public.sales_tech_stack_detections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sales_companies(id) on delete cascade,
  technology_name text not null,
  technology_slug text not null,
  category text not null,
  confidence integer not null default 0 check (confidence >= 0 and confidence <= 100),
  evidence text[] not null default '{}'::text[],
  source_slug text not null default 'wappalyzer',
  server_header text,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, technology_slug, category, source_slug)
);

create index if not exists idx_sales_tech_stack_company
  on public.sales_tech_stack_detections (company_id, category, confidence desc);

create index if not exists idx_sales_tech_stack_lookup
  on public.sales_tech_stack_detections (technology_slug, category, confidence desc);

create index if not exists idx_sales_tech_stack_detected_at
  on public.sales_tech_stack_detections (detected_at desc);

create or replace function public.touch_sales_tech_stack_detections()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sales_tech_stack_detections_touch on public.sales_tech_stack_detections;
create trigger trg_sales_tech_stack_detections_touch
before update on public.sales_tech_stack_detections
for each row execute function public.touch_sales_tech_stack_detections();

alter table public.sales_tech_stack_detections enable row level security;

drop policy if exists sales_tech_stack_detections_service_role_all on public.sales_tech_stack_detections;
create policy sales_tech_stack_detections_service_role_all
  on public.sales_tech_stack_detections
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.sales_tech_stack_detections to service_role;

comment on table public.sales_tech_stack_detections is
  'Normalized Wappalyzer/OSS technology stack detections for selectable sorting and source acquisition analytics.';
