alter table public.theme_demo_pages
  drop constraint if exists theme_demo_pages_access_mode_check,
  drop constraint if exists theme_demo_pages_private_access_check;

alter table public.theme_demo_pages
  add constraint theme_demo_pages_access_mode_check
    check (access_mode in ('public', 'signed_private', 'temporary_unlisted')),
  add constraint theme_demo_pages_private_access_check
    check (
      access_mode = 'public'
      or (
        access_mode = 'signed_private'
        and is_published = false
        and preview_token_hash is not null
        and preview_expires_at is not null
      )
      or (
        access_mode = 'temporary_unlisted'
        and is_published = false
        and preview_token_hash is null
        and preview_expires_at is not null
      )
    );

create index if not exists idx_theme_demo_pages_temporary_unlisted_expiry
  on public.theme_demo_pages (preview_expires_at)
  where access_mode = 'temporary_unlisted';

comment on column public.theme_demo_pages.access_mode is
  'public: published; signed_private: token required; temporary_unlisted: clean noindex URL available until preview_expires_at.';
