begin;

create table if not exists public.video_factory_brand_kits (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  name text not null check (char_length(name) between 1 and 200),
  brand jsonb not null check (jsonb_typeof(brand) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_factory_creative_templates (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  display_name text not null check (char_length(display_name) between 2 and 120),
  description text not null check (char_length(description) between 10 and 500),
  category text not null check (category in ('social', 'brand', 'product', 'proof')),
  supported_shot_kinds jsonb not null default '[]'::jsonb
    check (jsonb_typeof(supported_shot_kinds) = 'array'),
  motion_preset text not null check (
    motion_preset in ('confident', 'editorial', 'minimal', 'energetic', 'cinematic')
  ),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.video_factory_creative_templates (
  id, display_name, description, category, supported_shot_kinds, motion_preset
) values
  ('kinetic-type', 'Kinetic Type', 'Bold typography for scroll-stopping opening and transition shots.', 'social', '["text_motion","transition"]', 'energetic'),
  ('product-spotlight', 'Product Spotlight', 'Asymmetric product and service presentation for brand and supplied assets.', 'brand', '["text_motion","supplied_edit","generative"]', 'confident'),
  ('ui-focus', 'UI Focus', 'Device-frame composition for product interfaces and technical workflows.', 'product', '["ui_capture","technical_diagram"]', 'minimal'),
  ('data-proof', 'Data Proof', 'Large-format approved evidence and chart presentation with data-safe typography.', 'proof', '["chart","technical_diagram"]', 'editorial'),
  ('social-cta', 'Social CTA', 'Focused final-frame call to action for short-form social deliverables.', 'social', '["text_motion","transition"]', 'confident')
on conflict (id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  category = excluded.category,
  supported_shot_kinds = excluded.supported_shot_kinds,
  motion_preset = excluded.motion_preset,
  active = true,
  updated_at = now();

create table if not exists public.video_factory_studio_projects (
  project_id text primary key check (project_id ~ '^[a-z0-9][a-z0-9-]{0,71}$'),
  project_name text not null check (char_length(project_name) between 3 and 120),
  template_id text not null,
  brand_kit_id text not null references public.video_factory_brand_kits(id),
  brief jsonb not null check (jsonb_typeof(brief) = 'object'),
  manifest jsonb not null check (jsonb_typeof(manifest) = 'object'),
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_factory_shot_revisions (
  id uuid primary key,
  project_id text not null references public.video_factory_studio_projects(project_id) on delete cascade,
  shot_id text not null check (shot_id ~ '^shot-[0-9]{3}$'),
  language text not null check (language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  revision integer not null check (revision >= 1),
  patch jsonb not null check (jsonb_typeof(patch) = 'object'),
  reviewer text not null check (char_length(reviewer) between 2 and 200),
  created_at timestamptz not null,
  unique (project_id, language, shot_id, revision)
);

create table if not exists public.video_factory_quality_metrics (
  id uuid primary key,
  project_id text not null references public.video_factory_studio_projects(project_id) on delete cascade,
  deliverable_name text not null,
  passed boolean not null,
  metrics jsonb not null check (jsonb_typeof(metrics) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists video_factory_shot_revisions_project_idx
  on public.video_factory_shot_revisions (project_id, created_at desc);
create index if not exists video_factory_quality_metrics_project_idx
  on public.video_factory_quality_metrics (project_id, created_at desc);

alter table public.video_factory_brand_kits enable row level security;
alter table public.video_factory_brand_kits force row level security;
alter table public.video_factory_creative_templates enable row level security;
alter table public.video_factory_creative_templates force row level security;
alter table public.video_factory_studio_projects enable row level security;
alter table public.video_factory_studio_projects force row level security;
alter table public.video_factory_shot_revisions enable row level security;
alter table public.video_factory_shot_revisions force row level security;
alter table public.video_factory_quality_metrics enable row level security;
alter table public.video_factory_quality_metrics force row level security;

revoke all on table public.video_factory_brand_kits from anon, authenticated;
revoke all on table public.video_factory_creative_templates from anon, authenticated;
revoke all on table public.video_factory_studio_projects from anon, authenticated;
revoke all on table public.video_factory_shot_revisions from anon, authenticated;
revoke all on table public.video_factory_quality_metrics from anon, authenticated;
grant select, insert, update on table public.video_factory_brand_kits to service_role;
grant select on table public.video_factory_creative_templates to service_role;
grant select, insert, update on table public.video_factory_studio_projects to service_role;
grant select, insert on table public.video_factory_shot_revisions to service_role;
grant select, insert on table public.video_factory_quality_metrics to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'video_factory_brand_kits',
    'video_factory_creative_templates',
    'video_factory_studio_projects',
    'video_factory_shot_revisions',
    'video_factory_quality_metrics'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_service_role_all', table_name);
    execute format(
      'create policy %I on public.%I for all to service_role using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')',
      table_name || '_service_role_all',
      table_name
    );
  end loop;
end
$$;

comment on table public.video_factory_brand_kits is 'Server-only brand snapshots used by commercial Video Factory projects.';
comment on table public.video_factory_creative_templates is 'Audited commercial composition template catalog.';
comment on table public.video_factory_studio_projects is 'Commercial Studio project, brief, and storyboard snapshots.';
comment on table public.video_factory_shot_revisions is 'Append-only per-shot creative revisions.';
comment on table public.video_factory_quality_metrics is 'Append-only technical and audio QA results.';

commit;
