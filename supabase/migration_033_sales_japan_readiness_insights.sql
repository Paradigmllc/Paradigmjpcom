-- Sales OS Japan readiness scoring and outbound insight store
-- Migration: 033_sales_japan_readiness_insights

create table if not exists public.sales_japan_readiness_insights (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sales_companies(id) on delete cascade,
  region text not null default 'global',
  report_locale text not null default 'en',
  target_country text not null default 'JP',
  status text not null default 'generated',
  priority text not null default 'medium',
  japan_entry_score integer not null default 0,
  traffic_score integer not null default 0,
  commerce_score integer not null default 0,
  localization_gap_score integer not null default 0,
  payment_gap_score integer not null default 0,
  legal_gap_score integer not null default 0,
  creative_gap_score integer not null default 0,
  ability_to_pay_score integer not null default 0,
  monthly_visits_estimate integer,
  japan_visits_estimate integer,
  japan_share_percent numeric(8,4),
  estimated_monthly_revenue_usd integer,
  loss_amount_usd_min integer,
  loss_amount_usd_max integer,
  confidence numeric(5,4) not null default 0,
  evidence jsonb not null default '[]'::jsonb,
  gaps jsonb not null default '[]'::jsonb,
  dify_output jsonb not null default '{}'::jsonb,
  cold_email_subject text,
  cold_email_body text,
  manual_review_flags text[] not null default '{}'::text[],
  model_name text,
  engine text not null default 'local_heuristic',
  error_message text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_japan_readiness_status_check
    check (status in ('draft', 'generated', 'manual_review', 'failed')),
  constraint sales_japan_readiness_priority_check
    check (priority in ('high', 'medium', 'low')),
  constraint sales_japan_readiness_score_checks
    check (
      japan_entry_score between 0 and 100
      and traffic_score between 0 and 100
      and commerce_score between 0 and 100
      and localization_gap_score between 0 and 100
      and payment_gap_score between 0 and 100
      and legal_gap_score between 0 and 100
      and creative_gap_score between 0 and 100
      and ability_to_pay_score between 0 and 100
    ),
  constraint sales_japan_readiness_confidence_check
    check (confidence between 0 and 1),
  constraint sales_japan_readiness_loss_check
    check (
      (loss_amount_usd_min is null and loss_amount_usd_max is null)
      or (
        loss_amount_usd_min is not null
        and loss_amount_usd_max is not null
        and loss_amount_usd_min >= 0
        and loss_amount_usd_max >= loss_amount_usd_min
      )
    )
);

create unique index if not exists uniq_sales_japan_readiness_company
  on public.sales_japan_readiness_insights(company_id);

create index if not exists idx_sales_japan_readiness_scope_score
  on public.sales_japan_readiness_insights(region, report_locale, priority, japan_entry_score desc, updated_at desc);

create or replace function public.touch_sales_japan_readiness_insights()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sales_japan_readiness_insights_touch on public.sales_japan_readiness_insights;
create trigger trg_sales_japan_readiness_insights_touch
before update on public.sales_japan_readiness_insights
for each row execute function public.touch_sales_japan_readiness_insights();

alter table public.sales_japan_readiness_insights enable row level security;

drop policy if exists sales_japan_readiness_insights_service_role_all on public.sales_japan_readiness_insights;
create policy sales_japan_readiness_insights_service_role_all
  on public.sales_japan_readiness_insights
  for all to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.sales_japan_readiness_insights to service_role;

comment on table public.sales_japan_readiness_insights is
  'Latest Japan-entry readiness score, evidence, Dify draft copy, and manual-review flags per sales company.';
