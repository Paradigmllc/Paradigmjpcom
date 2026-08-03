-- Audited, non-billable Pet Life Movie QA renders. These records are isolated
-- from paid jobs and deliverables so a test render can never create customer
-- payment, email, project-status, or delivery side effects.

alter table public.pet_movie_projects
  add column if not exists ai_motion_consent_at timestamptz;

-- Earlier projects could only be created after the same AI-assisted creation
-- checkbox was accepted. Backfill only when every stored asset is explicitly
-- rights-confirmed, preserving a fail-closed path for incomplete projects.
update public.pet_movie_projects as project
set ai_motion_consent_at = coalesce(project.ai_motion_consent_at, project.created_at)
where project.ai_motion_consent_at is null
  and exists (
    select 1 from public.pet_movie_assets as asset
    where asset.project_id = project.id
  )
  and not exists (
    select 1 from public.pet_movie_assets as asset
    where asset.project_id = project.id and asset.consent_confirmed is not true
  );

create table if not exists public.pet_movie_qa_renders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pet_movie_projects(id) on delete cascade,
  template_id text not null check (template_id in ('warm-keepsake', 'playful-scrapbook', 'cinematic-tribute')),
  status text not null default 'queued' check (status in ('queued', 'rendering', 'review_required', 'delivered', 'failed', 'cancelled')),
  renderer_project_id text,
  renderer_run_id text,
  output_object_key text unique,
  output_name text,
  mime_type text check (mime_type is null or mime_type = 'video/mp4'),
  size_bytes bigint check (size_bytes is null or size_bytes > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  reviewer text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pet_movie_qa_renders_project_created_idx
  on public.pet_movie_qa_renders(project_id, created_at desc);
create unique index if not exists pet_movie_qa_one_active_per_template_idx
  on public.pet_movie_qa_renders(project_id, template_id)
  where status in ('queued', 'rendering', 'review_required');

drop trigger if exists pet_movie_qa_renders_updated_at on public.pet_movie_qa_renders;
create trigger pet_movie_qa_renders_updated_at before update on public.pet_movie_qa_renders
for each row execute function public.set_pet_movie_updated_at();

alter table public.pet_movie_qa_renders enable row level security;
alter table public.pet_movie_qa_renders force row level security;
revoke all on public.pet_movie_qa_renders from public, anon, authenticated;
grant select, insert, update, delete on public.pet_movie_qa_renders to service_role;

drop policy if exists pet_movie_qa_renders_service_role_all on public.pet_movie_qa_renders;
create policy pet_movie_qa_renders_service_role_all
  on public.pet_movie_qa_renders for all to service_role using (true) with check (true);

notify pgrst, 'reload schema';
