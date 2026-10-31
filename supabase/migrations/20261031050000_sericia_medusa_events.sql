BEGIN;
CREATE TABLE IF NOT EXISTS public.sericia_medusa_events (
 id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
 topic text NOT NULL CHECK (topic ~ '^(product|inventory-item|inventory-level)\.(created|updated|deleted)$'),
 entity_id text NOT NULL CHECK (entity_id ~ '^[a-zA-Z0-9_-]{1,120}$'),
 occurred_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 notification_error boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS sericia_medusa_events_recent ON public.sericia_medusa_events(received_at DESC);
ALTER TABLE public.sericia_medusa_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sericia_medusa_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.sericia_medusa_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sericia_medusa_events TO service_role;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS
 (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='sericia_medusa_events') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sericia_medusa_events;
 END IF;
END $$;
COMMIT;
