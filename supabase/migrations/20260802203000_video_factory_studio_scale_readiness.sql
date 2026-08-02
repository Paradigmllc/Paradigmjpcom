begin;

create table if not exists public.video_factory_studio_readiness_snapshots (
  id uuid primary key,
  schema_version integer not null check (schema_version >= 1),
  environment text not null check (char_length(environment) between 2 and 40),
  status text not null check (status in ('ready', 'conditional', 'blocked')),
  score integer not null check (score between 0 and 100),
  template_count integer not null check (template_count >= 0),
  ready_capabilities integer not null check (ready_capabilities >= 0),
  conditional_capabilities integer not null check (conditional_capabilities >= 0),
  blocked_capabilities integer not null check (blocked_capabilities >= 0),
  queue_backend text not null check (char_length(queue_backend) between 2 and 40),
  safe_parallel_jobs integer not null check (safe_parallel_jobs between 1 and 8),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  generated_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (
    ready_capabilities + conditional_capabilities + blocked_capabilities = 10
  )
);

create index if not exists video_factory_studio_readiness_created_idx
  on public.video_factory_studio_readiness_snapshots (created_at desc);

alter table public.video_factory_studio_readiness_snapshots enable row level security;
alter table public.video_factory_studio_readiness_snapshots force row level security;

revoke all on table public.video_factory_studio_readiness_snapshots
  from public, anon, authenticated, service_role;
grant select, insert on table public.video_factory_studio_readiness_snapshots to service_role;

drop policy if exists video_factory_studio_readiness_service_select
  on public.video_factory_studio_readiness_snapshots;
create policy video_factory_studio_readiness_service_select
  on public.video_factory_studio_readiness_snapshots
  for select
  to service_role
  using (true);

drop policy if exists video_factory_studio_readiness_service_insert
  on public.video_factory_studio_readiness_snapshots;
create policy video_factory_studio_readiness_service_insert
  on public.video_factory_studio_readiness_snapshots
  for insert
  to service_role
  with check (true);

comment on table public.video_factory_studio_readiness_snapshots is
  'Append-only evidence of Video Factory capability, quality gates, and safe scale capacity.';

commit;
