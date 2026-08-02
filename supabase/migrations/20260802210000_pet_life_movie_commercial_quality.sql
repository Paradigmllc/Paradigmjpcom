-- Pet Life Movie commercial-quality consent and family-memory evidence.

alter table public.pet_movie_projects
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;

alter table public.pet_movie_projects
  drop constraint if exists pet_movie_projects_checkout_terms_check;
alter table public.pet_movie_projects
  add constraint pet_movie_projects_checkout_terms_check check (
    stripe_checkout_session_id is null
    or (terms_accepted_at is not null and char_length(coalesce(terms_version, '')) between 1 and 80)
  ) not valid;

alter table public.pet_movie_contributors
  add column if not exists memories jsonb not null default '[]'::jsonb,
  add column if not exists consent_confirmed boolean not null default false;

alter table public.pet_movie_contributors
  drop constraint if exists pet_movie_contributors_memories_check;
alter table public.pet_movie_contributors
  add constraint pet_movie_contributors_memories_check check (
    jsonb_typeof(memories) = 'array' and jsonb_array_length(memories) between 0 and 3
  );

notify pgrst, 'reload schema';
