BEGIN;

ALTER TABLE public.sales_sync_logs
  DROP CONSTRAINT IF EXISTS sales_sync_logs_action_check;

ALTER TABLE public.sales_sync_logs
  ADD CONSTRAINT sales_sync_logs_action_check
  CHECK (
    action IN (
      'create',
      'update',
      'delete',
      'karte_note_sync',
      'karte_home_sync',
      'opportunity_sync',
      'external_studio_sync',
      'external_studio_pull',
      'list_lead_sync',
      'portal_candidate_twenty_sync'
    )
  );

COMMIT;
