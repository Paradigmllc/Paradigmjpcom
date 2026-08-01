-- Event-driven progress for the isolated /work durable queue.
-- The tables remain service-role only; browser clients receive authorized SSE snapshots.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'manual_japan_entry_batches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_japan_entry_batches;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'manual_japan_entry_batch_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_japan_entry_batch_items;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
