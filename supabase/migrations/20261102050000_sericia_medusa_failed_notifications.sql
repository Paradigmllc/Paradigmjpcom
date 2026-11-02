BEGIN;
-- Keep old notification failures visible even when newer successful changes arrive.
CREATE INDEX IF NOT EXISTS sericia_medusa_events_failed_recent
 ON public.sericia_medusa_events(received_at DESC) WHERE notification_error = true;
COMMIT;
