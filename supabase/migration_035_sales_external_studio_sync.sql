-- Sales OS: allow Directus and Keystatic studio sync audit records.

-- This compatibility migration is replayed by the release gate. Never replace
-- a newer constraint with this historical value set.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sales_sync_logs'::regclass
      and conname = 'sales_sync_logs_direction_check'
  ) then
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
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sales_sync_logs'::regclass
      and conname = 'sales_sync_logs_action_check'
  ) then
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
          'external_studio_pull',
          'list_lead_sync',
          'portal_candidate_twenty_sync',
          'demo_candidate_sync'
        )
      );
  end if;
end
$$;

comment on table public.sales_sync_logs is
  'Audit log for Supabase SSOT sync with Notion legacy, Twenty CRM, Directus assets, and Keystatic demo-site studios.';
