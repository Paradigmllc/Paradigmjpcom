-- Sales OS content template library.
-- Covers diagnostic reports, Astro demo sites, proposal decks, and sales videos.

create table if not exists public.sales_content_templates (
  id uuid primary key default gen_random_uuid(),
  region text not null check (region in ('jp', 'global')),
  report_locale text not null check (report_locale in ('ja', 'en', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'ru', 'ar', 'vi', 'id')),
  target_country text not null check (target_country ~ '^[A-Z]{2}$'),
  industry text not null check (industry in (
    'beauty_salon',
    'dental',
    'restaurant',
    'construction',
    'accounting',
    'retail',
    'cleaning',
    'consulting'
  )),
  offer_code text not null,
  asset_type text not null check (asset_type in (
    'diagnostic_report',
    'astro_demo_site',
    'sales_deck',
    'sales_video'
  )),
  appeal_angle text not null check (appeal_angle in (
    'revenue_recovery',
    'trust_authority',
    'speed_conversion',
    'automation_dx',
    'japan_entry',
    'video_retention'
  )),
  template_variant text not null check (template_variant in (
    'website_diagnostic',
    'meo',
    'security',
    'japan_entry',
    'video_subscription',
    'subsidy',
    'outreach'
  )),
  title text not null,
  purpose text not null,
  quality_bar text not null,
  dify_selection_rule text not null,
  structure jsonb not null default '{}'::jsonb,
  prompt_template text not null,
  output_contract jsonb not null default '{}'::jsonb,
  toolchain jsonb not null default '{}'::jsonb,
  sample_copy text not null default '',
  is_active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_sales_content_templates_unique
  on public.sales_content_templates (
    report_locale,
    target_country,
    industry,
    offer_code,
    asset_type,
    appeal_angle,
    template_variant,
    version
  );

create index if not exists idx_sales_content_templates_match
  on public.sales_content_templates (
    report_locale,
    industry,
    asset_type,
    offer_code,
    appeal_angle,
    template_variant
  )
  where is_active = true;

alter table public.sales_content_templates enable row level security;

drop policy if exists sales_content_templates_service_only on public.sales_content_templates;
create policy sales_content_templates_service_only
  on public.sales_content_templates
  for all to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.sales_content_templates to service_role;
notify pgrst, 'reload schema';

comment on table public.sales_content_templates is
  'Dify/n8n template selection library for diagnostic reports, Astro demo sites, Slidev/Gotenberg decks, and ComfyUI/HyperFrames/Remotion sales videos.';
comment on column public.sales_content_templates.dify_selection_rule is
  'Human-readable rule Dify can use to choose the best language x industry x appeal x asset template.';
comment on column public.sales_content_templates.output_contract is
  'Expected JSON/Markdown/brief shape for downstream renderers such as Next.js, Astro, Slidev, Gotenberg, HyperFrames, ComfyUI, and Remotion.';
