-- Market-ready Pet Life Movie billing, delivery and retention metadata.

alter table public.pet_movie_projects
  add column if not exists customer_email text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.pet_movie_projects
  drop constraint if exists pet_movie_projects_customer_email_check;
alter table public.pet_movie_projects
  add constraint pet_movie_projects_customer_email_check
  check (customer_email is null or (char_length(customer_email) between 3 and 254 and customer_email like '%@%'));

create unique index if not exists pet_movie_projects_payment_intent_idx
  on public.pet_movie_projects(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

alter table public.pet_movie_jobs
  add column if not exists renderer_project_id text;

create unique index if not exists pet_movie_jobs_one_full_render_idx
  on public.pet_movie_jobs(project_id)
  where job_type = 'full_render' and status not in ('failed', 'cancelled');

create table if not exists public.pet_movie_deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.pet_movie_projects(id) on delete cascade,
  job_id uuid not null references public.pet_movie_jobs(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  object_key text not null unique,
  mime_type text not null check (mime_type in ('video/mp4', 'video/webm')),
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists pet_movie_deliverables_project_idx
  on public.pet_movie_deliverables(project_id, created_at desc);

alter table public.pet_movie_deliverables enable row level security;
alter table public.pet_movie_deliverables force row level security;
revoke all on public.pet_movie_deliverables from public, anon, authenticated;
grant select, insert, update, delete on public.pet_movie_deliverables to service_role;

drop policy if exists pet_movie_deliverables_service_role_all on public.pet_movie_deliverables;
create policy pet_movie_deliverables_service_role_all
  on public.pet_movie_deliverables for all to service_role using (true) with check (true);

notify pgrst, 'reload schema';
