-- Sales OS: record Twenty HOME field synchronization separately from legacy note sync.

alter table public.sales_sync_logs
  drop constraint if exists sales_sync_logs_action_check;

alter table public.sales_sync_logs
  add constraint sales_sync_logs_action_check
  check (action in ('create', 'update', 'delete', 'karte_note_sync', 'karte_home_sync', 'opportunity_sync'));
