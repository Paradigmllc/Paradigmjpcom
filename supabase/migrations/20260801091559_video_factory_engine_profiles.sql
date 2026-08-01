begin;

create table if not exists public.video_factory_engine_profiles (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  display_name text not null check (char_length(display_name) between 2 and 100),
  summary text not null check (char_length(summary) between 10 and 500),
  category text not null check (category in (
    'composition', 'video', 'image', 'people', 'audio', 'enhancement', 'three_d'
  )),
  runtime text not null check (runtime in ('builtin', 'comfyui', 'external_cli')),
  adapter text not null,
  source_url text not null check (source_url ~ '^https://'),
  revision text not null check (revision ~ '^[a-f0-9]{40}$'),
  code_license text not null,
  model_license text not null,
  commercial_policy text not null check (
    commercial_policy in ('allowed', 'review_required', 'noncommercial')
  ),
  approval text not null check (approval in ('approved', 'pending', 'blocked')),
  install_mode text not null check (install_mode in ('bundled', 'on_demand')),
  command_env text check (command_env is null or command_env ~ '^[A-Z][A-Z0-9_]+$'),
  gpu_required boolean not null default false,
  min_vram_gb numeric(6,2) not null default 0 check (min_vram_gb >= 0),
  recommended_vram_gb numeric(6,2) not null default 0 check (
    recommended_vram_gb >= min_vram_gb
  ),
  capabilities jsonb not null default '[]'::jsonb check (jsonb_typeof(capabilities) = 'array'),
  shot_kinds jsonb not null default '[]'::jsonb check (jsonb_typeof(shot_kinds) = 'array'),
  workflow_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(workflow_ids) = 'array'),
  model_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(model_ids) = 'array'),
  ready boolean not null default false,
  reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(reasons) = 'array'),
  reviewed_by text,
  reviewed_at timestamptz,
  block_reason text,
  notes text,
  catalog_version integer not null check (catalog_version >= 1),
  catalog_updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_factory_engine_profiles_category_ready_idx
  on public.video_factory_engine_profiles (category, ready, display_name);

create table if not exists public.video_factory_engine_events (
  id uuid primary key,
  event_type text not null check (event_type in (
    'catalog_synced', 'profile_selected', 'profile_started', 'profile_progress',
    'profile_completed', 'profile_failed'
  )),
  profile_id text check (
    profile_id is null or profile_id ~ '^[a-z0-9][a-z0-9-]{2,79}$'
  ),
  run_id uuid,
  project_id text,
  state text not null,
  progress smallint check (progress between 0 and 100),
  message text not null check (char_length(message) between 1 and 2000),
  error text,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists video_factory_engine_events_created_at_idx
  on public.video_factory_engine_events (created_at desc);
create index if not exists video_factory_engine_events_profile_created_idx
  on public.video_factory_engine_events (profile_id, created_at desc);
create index if not exists video_factory_engine_events_run_idx
  on public.video_factory_engine_events (run_id, created_at desc)
  where run_id is not null;

alter table public.video_factory_engine_profiles enable row level security;
alter table public.video_factory_engine_profiles force row level security;
alter table public.video_factory_engine_events enable row level security;
alter table public.video_factory_engine_events force row level security;

revoke all on table public.video_factory_engine_profiles from anon, authenticated;
revoke all on table public.video_factory_engine_events from anon, authenticated;
grant select, insert, update on table public.video_factory_engine_profiles to service_role;
grant select, insert on table public.video_factory_engine_events to service_role;

drop policy if exists video_factory_engine_profiles_service_role_select
  on public.video_factory_engine_profiles;
create policy video_factory_engine_profiles_service_role_select
  on public.video_factory_engine_profiles
  for select to service_role
  using ((select auth.role()) = 'service_role');

drop policy if exists video_factory_engine_profiles_service_role_write
  on public.video_factory_engine_profiles;
create policy video_factory_engine_profiles_service_role_write
  on public.video_factory_engine_profiles
  for all to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists video_factory_engine_events_service_role_select
  on public.video_factory_engine_events;
create policy video_factory_engine_events_service_role_select
  on public.video_factory_engine_events
  for select to service_role
  using ((select auth.role()) = 'service_role');

drop policy if exists video_factory_engine_events_service_role_insert
  on public.video_factory_engine_events;
create policy video_factory_engine_events_service_role_insert
  on public.video_factory_engine_events
  for insert to service_role
  with check ((select auth.role()) = 'service_role');

comment on table public.video_factory_engine_profiles is
  'Server-only mirror of the audited Video Factory OSS engine catalog.';
comment on table public.video_factory_engine_events is
  'Append-only Video Factory engine selection, progress, completion, and failure events.';

commit;
