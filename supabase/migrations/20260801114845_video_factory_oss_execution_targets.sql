begin;

alter table public.video_factory_engine_profiles
  add column if not exists execution_target text not null default 'control_plane'
    check (execution_target in ('control_plane', 'managed_gpu')),
  add column if not exists resolved_adapter text not null default 'oss';

create index if not exists video_factory_engine_profiles_execution_ready_idx
  on public.video_factory_engine_profiles (execution_target, ready, display_name);

-- migration_071 intentionally applies a broad service-role policy to every
-- public table. These private operator tables have narrower explicit policies,
-- so remove the broad duplicate every time the release migrations are replayed.
drop policy if exists paradigm_service_role_all
  on public.video_factory_engine_profiles;
drop policy if exists paradigm_service_role_all
  on public.video_factory_engine_events;

drop policy if exists video_factory_engine_profiles_service_role_select
  on public.video_factory_engine_profiles;
create policy video_factory_engine_profiles_service_role_select
  on public.video_factory_engine_profiles
  for select to service_role
  using (true);

drop policy if exists video_factory_engine_profiles_service_role_write
  on public.video_factory_engine_profiles;
create policy video_factory_engine_profiles_service_role_write
  on public.video_factory_engine_profiles
  for all to service_role
  using (true)
  with check (true);

drop policy if exists video_factory_engine_events_service_role_select
  on public.video_factory_engine_events;
create policy video_factory_engine_events_service_role_select
  on public.video_factory_engine_events
  for select to service_role
  using (true);

drop policy if exists video_factory_engine_events_service_role_insert
  on public.video_factory_engine_events;
create policy video_factory_engine_events_service_role_insert
  on public.video_factory_engine_events
  for insert to service_role
  with check (true);

revoke all on table public.video_factory_engine_profiles from anon, authenticated;
revoke all on table public.video_factory_engine_events from anon, authenticated;
grant select, insert, update on table public.video_factory_engine_profiles to service_role;
grant select, insert on table public.video_factory_engine_events to service_role;

comment on column public.video_factory_engine_profiles.execution_target is
  'Fail-closed execution boundary: control_plane or authenticated managed_gpu worker.';
comment on column public.video_factory_engine_profiles.resolved_adapter is
  'Adapter selected after applying the managed GPU isolation policy.';

commit;
