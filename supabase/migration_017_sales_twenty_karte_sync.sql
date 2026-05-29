-- Sales OS Twenty karte sync log expansion
-- Migration: 017_sales_twenty_karte_sync

alter table public.sales_sync_logs
  drop constraint if exists sales_sync_logs_direction_check;

alter table public.sales_sync_logs
  add constraint sales_sync_logs_direction_check
  check (direction in ('supabase->notion', 'notion->supabase', 'supabase->twenty', 'twenty->supabase'));

alter table public.sales_sync_logs
  drop constraint if exists sales_sync_logs_action_check;

alter table public.sales_sync_logs
  add constraint sales_sync_logs_action_check
  check (action in ('create', 'update', 'delete', 'karte_note_sync'));

comment on table public.sales_sync_logs is
  'Audit log for Notion legacy sync and Twenty CRM company-karte projection from the Supabase SSOT.';
