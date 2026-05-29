-- Sales OS products and Twenty opportunity projection
-- Migration: 018_sales_products_opportunity_sync

alter table public.sales_sync_logs
  drop constraint if exists sales_sync_logs_action_check;

alter table public.sales_sync_logs
  add constraint sales_sync_logs_action_check
  check (action in ('create', 'update', 'delete', 'karte_note_sync', 'opportunity_sync'));

alter table public.sales_tool_connections
  drop constraint if exists sales_tool_connections_slug_check;

alter table public.sales_tool_connections
  add constraint sales_tool_connections_slug_check
  check (slug in ('supabase', 'twenty', 'nocodb', 'appsmith', 'metabase', 'n8n', 'calcom', 'docuseal', 'notion'));

alter table public.sales_tool_connections
  drop constraint if exists sales_tool_connections_interface_type_check;

alter table public.sales_tool_connections
  add constraint sales_tool_connections_interface_type_check
  check (interface_type in ('database', 'crm', 'spreadsheet', 'operator_console', 'bi', 'automation', 'scheduling', 'contract', 'legacy_workspace'));

create table if not exists public.sales_products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  market_scope text not null,
  template_variant text not null,
  default_currency text not null default 'JPY',
  default_amount_yen integer not null default 0,
  is_subscription boolean not null default false,
  description text,
  sort_order integer not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_products_market_scope_check check (market_scope in ('jp', 'global')),
  constraint sales_products_amount_check check (default_amount_yen >= 0)
);

create table if not exists public.sales_company_product_recommendations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sales_companies (id) on delete cascade,
  product_id uuid not null references public.sales_products (id) on delete restrict,
  priority integer not null default 1,
  fit_score integer not null default 70,
  reason text not null,
  status text not null default 'recommended',
  twenty_opportunity_id text,
  source text not null default 'company_karte',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_company_product_priority_check check (priority between 1 and 10),
  constraint sales_company_product_fit_score_check check (fit_score between 0 and 100),
  constraint sales_company_product_status_check check (status in ('recommended', 'assigned', 'opportunity_created', 'dismissed'))
);

create unique index if not exists uniq_sales_company_product_recommendation
  on public.sales_company_product_recommendations (company_id, product_id);

create index if not exists idx_sales_company_product_company_status
  on public.sales_company_product_recommendations (company_id, status, priority);

drop trigger if exists trg_sales_products_touch on public.sales_products;
create trigger trg_sales_products_touch
before update on public.sales_products
for each row execute function public.sales_touch_updated_at();

drop trigger if exists trg_sales_company_product_recommendations_touch on public.sales_company_product_recommendations;
create trigger trg_sales_company_product_recommendations_touch
before update on public.sales_company_product_recommendations
for each row execute function public.sales_touch_updated_at();

alter table public.sales_products enable row level security;
alter table public.sales_company_product_recommendations enable row level security;

drop policy if exists sales_products_service_role_all on public.sales_products;
create policy sales_products_service_role_all
  on public.sales_products for all to service_role
  using (true) with check (true);

drop policy if exists sales_company_product_recommendations_service_role_all on public.sales_company_product_recommendations;
create policy sales_company_product_recommendations_service_role_all
  on public.sales_company_product_recommendations for all to service_role
  using (true) with check (true);

grant select, insert, update, delete on table public.sales_products to service_role;
grant select, insert, update, delete on table public.sales_company_product_recommendations to service_role;

insert into public.sales_products
  (code, display_name, market_scope, template_variant, default_currency, default_amount_yen, is_subscription, description, sort_order, meta)
values
  (
    'jp_web_production',
    'Web制作',
    'jp',
    'website_diagnostic',
    'JPY',
    450000,
    false,
    '日本国内向けの診断レポート、フォーム改善、Astro差し替えデモを起点にしたWeb制作商材。',
    10,
    '{"primary_region":"jp","twenty_stage":"NEW"}'::jsonb
  ),
  (
    'jp_dx_package',
    'DXパッケージ',
    'jp',
    'outreach',
    'JPY',
    650000,
    false,
    '日本国内向けの業務改善、営業自動化、AI導入をまとめたDXパッケージ。',
    20,
    '{"primary_region":"jp","twenty_stage":"NEW"}'::jsonb
  ),
  (
    'global_jaas',
    'Japan Entry Package (JaaS)',
    'global',
    'japan_entry',
    'JPY',
    300000,
    false,
    '海外SMB向けの日本市場参入診断、ローカライズ、LP、営業導線構築パッケージ。',
    30,
    '{"primary_region":"global","twenty_stage":"NEW"}'::jsonb
  ),
  (
    'global_video_subscription',
    '動画納品サブスク',
    'global',
    'video_subscription',
    'JPY',
    250000,
    true,
    '海外SMB向けの動画制作、字幕、短尺動画、営業資料化を継続提供するサブスクリプション。',
    40,
    '{"primary_region":"global","twenty_stage":"NEW"}'::jsonb
  )
on conflict (code) do update set
  display_name = excluded.display_name,
  market_scope = excluded.market_scope,
  template_variant = excluded.template_variant,
  default_currency = excluded.default_currency,
  default_amount_yen = excluded.default_amount_yen,
  is_subscription = excluded.is_subscription,
  description = excluded.description,
  sort_order = excluded.sort_order,
  meta = public.sales_products.meta || excluded.meta,
  updated_at = now();

insert into public.sales_tool_connections
  (slug, display_name, role, interface_type, deployment_type, base_url, health_url, status, owner, meta)
values
  (
    'calcom',
    'Cal.com OSS',
    '商談予約、診断後の30分相談、担当者別カレンダー割り当て。',
    'scheduling',
    'oss_self_hosted',
    'https://cal.paradigmjp.com',
    null,
    'active',
    'Paradigm',
    '{"connects_to":"sales_calendar_events","dns":"cal.paradigmjp.com"}'::jsonb
  ),
  (
    'docuseal',
    'Docuseal OSS',
    '契約書、申込書、NDA、発注書の電子署名と契約ステータス管理。',
    'contract',
    'oss_self_hosted',
    'https://docuseal.paradigmjp.com',
    null,
    'active',
    'Paradigm',
    '{"connects_to":"sales_contracts","dns":"docuseal.paradigmjp.com"}'::jsonb
  ),
  (
    'notion',
    'Notion Legacy',
    '営業OSからは外し、顧客共有ページや個別ドキュメント用途に限定。',
    'legacy_workspace',
    'legacy_external',
    null,
    null,
    'disabled',
    'Paradigm',
    '{"replacement":"twenty_supabase_sales_os","write_policy":"do_not_use_for_sales_ssot"}'::jsonb
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
  meta = public.sales_tool_connections.meta || excluded.meta,
  updated_at = now();

comment on table public.sales_products is
  'Sales OS product/package master. Supabase remains the SSOT; Twenty Opportunities are projections.';

comment on table public.sales_company_product_recommendations is
  'Per-company product fit ledger generated from company karte evidence and projected to Twenty Opportunities.';
