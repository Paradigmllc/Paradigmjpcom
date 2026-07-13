alter table public.theme_demo_pages
  add column if not exists access_mode text not null default 'public',
  add column if not exists preview_token_hash text,
  add column if not exists preview_expires_at timestamptz,
  add column if not exists asset_approval_status text not null default 'unreviewed',
  add column if not exists asset_review jsonb not null default '{"status":"unreviewed","assets":[]}'::jsonb;

alter table public.theme_demo_pages
  drop constraint if exists theme_demo_pages_publication_status_check,
  add constraint theme_demo_pages_publication_status_check
    check (publication_status in ('draft', 'quality_review', 'approved', 'published', 'rejected', 'legacy_published', 'private_review'));

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'theme_demo_pages_access_mode_check'
  ) then
    alter table public.theme_demo_pages
      add constraint theme_demo_pages_access_mode_check
      check (access_mode in ('public', 'signed_private'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'theme_demo_pages_asset_approval_check'
  ) then
    alter table public.theme_demo_pages
      add constraint theme_demo_pages_asset_approval_check
      check (asset_approval_status in ('unreviewed', 'private_proposal', 'consented', 'blocked'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'theme_demo_pages_private_access_check'
  ) then
    alter table public.theme_demo_pages
      add constraint theme_demo_pages_private_access_check
      check (
        access_mode = 'public'
        or (
          access_mode = 'signed_private'
          and is_published = false
          and preview_token_hash is not null
          and preview_expires_at is not null
        )
      );
  end if;
end $$;

create index if not exists idx_theme_demo_pages_private_expiry
  on public.theme_demo_pages (access_mode, preview_expires_at)
  where access_mode = 'signed_private';

comment on column public.theme_demo_pages.asset_review is
  'Human-reviewable source, rights, consent, and safety record for personalized demo assets.';
