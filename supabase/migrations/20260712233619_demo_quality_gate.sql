-- Demo quality gate and immutable full-site payloads.
-- Existing rows predate evidence and rights checks, so they are unpublished
-- until regenerated through the quality gate.

alter table public.theme_demo_pages
  add column if not exists site_payload jsonb,
  add column if not exists design_recipe jsonb not null default '{}'::jsonb,
  add column if not exists design_fingerprint text,
  add column if not exists structural_fingerprint text,
  add column if not exists quality_score smallint,
  add column if not exists quality_report jsonb not null default '{}'::jsonb,
  add column if not exists rights_manifest jsonb not null default '{"assets":[],"status":"unverified"}'::jsonb,
  add column if not exists generation_candidates jsonb not null default '[]'::jsonb,
  add column if not exists quality_gate_version text,
  add column if not exists publication_status text not null default 'draft',
  add column if not exists reviewed_at timestamptz;

alter table public.theme_demo_pages
  alter column is_published set default false;

alter table public.theme_demo_pages
  drop constraint if exists theme_demo_pages_theme_check;

alter table public.theme_demo_pages
  add constraint theme_demo_pages_theme_check
  check (theme in (
    'astrowind', 'screwfast', 'astroship',
    'zenith', 'aether', 'prism', 'terra', 'flux', 'vertex', 'nomad', 'apex',
    'hyper-personalized'
  ));

update public.theme_demo_pages
set publication_status = 'quality_review',
    is_published = false
where is_published = true
  and publication_status = 'draft';

alter table public.theme_demo_pages
  drop constraint if exists theme_demo_pages_quality_score_check,
  add constraint theme_demo_pages_quality_score_check
    check (quality_score is null or quality_score between 0 and 100),
  drop constraint if exists theme_demo_pages_quality_publish_check,
  add constraint theme_demo_pages_quality_publish_check
    check (
      is_published = false
      or (
          publication_status = 'published'
          and quality_score >= 90
          and quality_gate_version is not null
          and coalesce(jsonb_array_length(quality_report -> 'hardBlockers'), 0) = 0
        )
    );

-- Private review was introduced later. This migration is replayed by the
-- release gate, so only create the status constraint when it is absent and use
-- the complete current state set.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.theme_demo_pages'::regclass
      and conname = 'theme_demo_pages_publication_status_check'
  ) then
    alter table public.theme_demo_pages
      add constraint theme_demo_pages_publication_status_check
      check (
        publication_status in (
          'draft', 'quality_review', 'approved', 'published', 'rejected',
          'legacy_published', 'private_review'
        )
      );
  end if;
end
$$;

create index if not exists idx_theme_demo_pages_quality_queue
  on public.theme_demo_pages(publication_status, quality_score, updated_at desc);

create index if not exists idx_theme_demo_pages_structural_fingerprint
  on public.theme_demo_pages(structural_fingerprint)
  where structural_fingerprint is not null;

create index if not exists idx_theme_demo_pages_design_fingerprint
  on public.theme_demo_pages(design_fingerprint)
  where design_fingerprint is not null;

comment on column public.theme_demo_pages.site_payload is
  'Immutable full multi-page payload selected by the quality gate.';
comment on column public.theme_demo_pages.design_recipe is
  'Company-specific composition recipe. Shared components remain reusable.';
comment on column public.theme_demo_pages.rights_manifest is
  'Per-asset provenance and allowed usage scope. Unknown assets block publication.';

alter table public.theme_demo_pages enable row level security;

drop policy if exists "service_all" on public.theme_demo_pages;
drop policy if exists "anon_select_published" on public.theme_demo_pages;
drop policy if exists "theme_demo_pages_service_role_all" on public.theme_demo_pages;
drop policy if exists "theme_demo_pages_anon_select_published" on public.theme_demo_pages;

create policy "theme_demo_pages_service_role_all"
  on public.theme_demo_pages
  for all
  to service_role
  using (true)
  with check (true);

create policy "theme_demo_pages_anon_select_published"
  on public.theme_demo_pages
  for select
  to anon
  using (
    is_published = true
    and publication_status = 'published'
  );

revoke all on table public.theme_demo_pages from public, anon, authenticated;
grant select (slug, theme, title, blocks, meta, is_published, publication_status, quality_score)
  on public.theme_demo_pages to anon;
grant all on table public.theme_demo_pages to service_role;
