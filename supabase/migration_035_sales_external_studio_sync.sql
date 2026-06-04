-- Sales OS: allow Directus and Keystatic studio sync audit records.

alter table public.sales_sync_logs
  drop constraint if exists sales_sync_logs_direction_check;

alter table public.sales_sync_logs
  add constraint sales_sync_logs_direction_check
  check (
    direction in (
      'supabase->notion',
      'notion->supabase',
      'supabase->twenty',
      'twenty->supabase',
      'supabase->directus',
      'directus->supabase',
      'supabase->keystatic',
      'keystatic->supabase'
    )
  );

alter table public.sales_sync_logs
  drop constraint if exists sales_sync_logs_action_check;

alter table public.sales_sync_logs
  add constraint sales_sync_logs_action_check
  check (
    action in (
      'create',
      'update',
      'delete',
      'karte_note_sync',
      'karte_home_sync',
      'opportunity_sync',
      'external_studio_sync',
      'external_studio_pull'
    )
  );

comment on table public.sales_sync_logs is
  'Audit log for Supabase SSOT sync with Notion legacy, Twenty CRM, Directus assets, and Keystatic demo-site studios.';
