-- Pet Life Movie MVP: anonymous projects, private assets, render jobs and funnel events.
-- All browser access goes through authenticated Next.js route handlers. Raw access
-- and invite tokens are never stored; only SHA-256 hashes are persisted.

create extension if not exists pgcrypto;

create table if not exists public.pet_movie_projects (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  access_token_hash text not null unique,
  share_slug text not null unique,
  pet_name text not null check (char_length(pet_name) between 1 and 80),
  pet_species text not null check (pet_species in ('dog', 'cat')),
  occasion text not null check (occasion in ('life', 'birthday', 'adoption', 'growth', 'memorial')),
  locale text not null check (locale in ('ja', 'en', 'es', 'pt')),
  mood text not null check (mood in ('warm', 'playful', 'cinematic', 'gentle')),
  time_together text not null default '',
  memories jsonb not null default '[]'::jsonb check (jsonb_typeof(memories) = 'array'),
  status text not null default 'draft' check (status in (
    'draft', 'uploaded', 'analyzing', 'storyboard_ready', 'preview_generating',
    'preview_ready', 'payment_required', 'full_rendering', 'quality_check',
    'delivered', 'expired', 'deleted'
  )),
  plan text check (plan is null or plan in ('mini', 'story', 'cinema')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'refunded', 'failed')),
  stripe_checkout_session_id text unique,
  storyboard jsonb,
  preview_url text,
  delivery_url text,
  privacy text not null default 'unlisted' check (privacy in ('private', 'unlisted')),
  share_enabled boolean not null default true,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_movie_contributors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pet_movie_projects(id) on delete cascade,
  invite_token_hash text not null unique,
  display_name text not null check (char_length(display_name) between 1 and 80),
  email text,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pet_movie_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pet_movie_projects(id) on delete cascade,
  contributor_id uuid references public.pet_movie_contributors(id) on delete set null,
  object_key text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')),
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  sort_order integer not null check (sort_order between 0 and 49),
  consent_confirmed boolean not null default false,
  upload_status text not null default 'pending' check (upload_status in ('pending', 'uploaded', 'failed')),
  analysis jsonb not null default '{}'::jsonb check (jsonb_typeof(analysis) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_movie_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pet_movie_projects(id) on delete cascade,
  job_type text not null check (job_type in ('preview', 'full_render', 'asset_analysis')),
  status text not null default 'queued' check (status in ('queued', 'running', 'waiting_renderer', 'succeeded', 'failed', 'cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  pipeline jsonb not null default '{}'::jsonb check (jsonb_typeof(pipeline) = 'object'),
  trigger_run_id text,
  output_url text,
  error_message text,
  attempt_count integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_movie_events (
  id bigint generated always as identity primary key,
  project_id uuid references public.pet_movie_projects(id) on delete cascade,
  event_type text not null,
  locale text not null default 'en',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists pet_movie_assets_project_sort_idx on public.pet_movie_assets(project_id, sort_order);
create index if not exists pet_movie_jobs_project_created_idx on public.pet_movie_jobs(project_id, created_at desc);
create index if not exists pet_movie_contributors_project_idx on public.pet_movie_contributors(project_id);
create index if not exists pet_movie_events_project_created_idx on public.pet_movie_events(project_id, created_at desc);
create index if not exists pet_movie_projects_owner_idx on public.pet_movie_projects(owner_user_id) where owner_user_id is not null;

create or replace function public.set_pet_movie_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pet_movie_projects_updated_at on public.pet_movie_projects;
create trigger pet_movie_projects_updated_at before update on public.pet_movie_projects
for each row execute function public.set_pet_movie_updated_at();

drop trigger if exists pet_movie_assets_updated_at on public.pet_movie_assets;
create trigger pet_movie_assets_updated_at before update on public.pet_movie_assets
for each row execute function public.set_pet_movie_updated_at();

drop trigger if exists pet_movie_jobs_updated_at on public.pet_movie_jobs;
create trigger pet_movie_jobs_updated_at before update on public.pet_movie_jobs
for each row execute function public.set_pet_movie_updated_at();

alter table public.pet_movie_projects enable row level security;
alter table public.pet_movie_contributors enable row level security;
alter table public.pet_movie_assets enable row level security;
alter table public.pet_movie_jobs enable row level security;
alter table public.pet_movie_events enable row level security;
alter table public.pet_movie_projects force row level security;
alter table public.pet_movie_contributors force row level security;
alter table public.pet_movie_assets force row level security;
alter table public.pet_movie_jobs force row level security;
alter table public.pet_movie_events force row level security;

revoke all on public.pet_movie_projects from public, anon, authenticated;
revoke all on public.pet_movie_contributors from public, anon, authenticated;
revoke all on public.pet_movie_assets from public, anon, authenticated;
revoke all on public.pet_movie_jobs from public, anon, authenticated;
revoke all on public.pet_movie_events from public, anon, authenticated;
revoke all on function public.set_pet_movie_updated_at() from public, anon, authenticated;

grant select, insert, update, delete on public.pet_movie_projects to service_role;
grant select, insert, update, delete on public.pet_movie_contributors to service_role;
grant select, insert, update, delete on public.pet_movie_assets to service_role;
grant select, insert, update, delete on public.pet_movie_jobs to service_role;
grant select, insert, update, delete on public.pet_movie_events to service_role;
grant usage, select on sequence public.pet_movie_events_id_seq to service_role;

drop policy if exists pet_movie_projects_service_role_all on public.pet_movie_projects;
create policy pet_movie_projects_service_role_all on public.pet_movie_projects for all to service_role using (true) with check (true);
drop policy if exists pet_movie_contributors_service_role_all on public.pet_movie_contributors;
create policy pet_movie_contributors_service_role_all on public.pet_movie_contributors for all to service_role using (true) with check (true);
drop policy if exists pet_movie_assets_service_role_all on public.pet_movie_assets;
create policy pet_movie_assets_service_role_all on public.pet_movie_assets for all to service_role using (true) with check (true);
drop policy if exists pet_movie_jobs_service_role_all on public.pet_movie_jobs;
create policy pet_movie_jobs_service_role_all on public.pet_movie_jobs for all to service_role using (true) with check (true);
drop policy if exists pet_movie_events_service_role_all on public.pet_movie_events;
create policy pet_movie_events_service_role_all on public.pet_movie_events for all to service_role using (true) with check (true);

notify pgrst, 'reload schema';
