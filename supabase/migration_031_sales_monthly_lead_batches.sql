-- Monthly lead batch operations for pre-meeting automation.

create table if not exists public.sales_lead_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text not null default 'jp' check (region in ('jp', 'global')),
  report_locale text not null default 'ja',
  target_country text not null default 'JP',
  source text not null default 'manual_csv',
  status text not null default 'draft'
    check (status in ('draft', 'importing', 'enriching', 'qualifying', 'outreach_ready', 'completed', 'failed')),
  total_rows integer not null default 0 check (total_rows >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  enrichment_queued_count integer not null default 0 check (enrichment_queued_count >= 0),
  qualified_count integer not null default 0 check (qualified_count >= 0),
  outreach_ready_count integer not null default 0 check (outreach_ready_count >= 0),
  manual_review_count integer not null default 0 check (manual_review_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  responded_count integer not null default 0 check (responded_count >= 0),
  min_outreach_score integer not null default 70 check (min_outreach_score >= 0 and min_outreach_score <= 100),
  max_outreach_ready integer not null default 500 check (max_outreach_ready >= 1),
  dry_run_only boolean not null default true,
  error_message text,
  meta jsonb not null default '{}'::jsonb,
  created_by text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_lead_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.sales_lead_batches(id) on delete cascade,
  company_id uuid references public.sales_companies(id) on delete set null,
  row_index integer not null check (row_index >= 0),
  domain text,
  company_name text,
  status text not null default 'imported'
    check (status in (
      'imported',
      'duplicate',
      'enrichment_queued',
      'enriched',
      'qualified',
      'rejected',
      'outreach_ready',
      'manual_review',
      'sent',
      'responded',
      'error'
    )),
  qualification_score integer not null default 0 check (qualification_score >= 0 and qualification_score <= 100),
  rejection_reason text,
  quality_gate jsonb not null default '{}'::jsonb,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, row_index)
);

create index if not exists idx_sales_lead_batches_scope_status
  on public.sales_lead_batches (region, report_locale, status, created_at desc);

create index if not exists idx_sales_lead_batch_items_batch_status
  on public.sales_lead_batch_items (batch_id, status, qualification_score desc);

create index if not exists idx_sales_lead_batch_items_company
  on public.sales_lead_batch_items (company_id)
  where company_id is not null;

create or replace function public.touch_sales_lead_batches()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_sales_lead_batch_items()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sales_lead_batches_touch on public.sales_lead_batches;
create trigger trg_sales_lead_batches_touch
before update on public.sales_lead_batches
for each row execute function public.touch_sales_lead_batches();

drop trigger if exists trg_sales_lead_batch_items_touch on public.sales_lead_batch_items;
create trigger trg_sales_lead_batch_items_touch
before update on public.sales_lead_batch_items
for each row execute function public.touch_sales_lead_batch_items();

alter table public.sales_lead_batches enable row level security;
alter table public.sales_lead_batch_items enable row level security;

drop policy if exists sales_lead_batches_service_role_all on public.sales_lead_batches;
create policy sales_lead_batches_service_role_all
  on public.sales_lead_batches
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists sales_lead_batch_items_service_role_all on public.sales_lead_batch_items;
create policy sales_lead_batch_items_service_role_all
  on public.sales_lead_batch_items
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.sales_lead_batches to service_role;
grant select, insert, update, delete on table public.sales_lead_batch_items to service_role;

comment on table public.sales_lead_batches is
  'Monthly lead batch control plane for turning large CSV/source lists into qualified pre-meeting outreach candidates.';

comment on table public.sales_lead_batch_items is
  'Per-company lead-batch status, qualification score, quality gate result, and rejection reason.';
