-- Restore missing subscription objects required by the deployed Realtime v2.102.3.
-- Matches upstream migrations; preserves existing subscriptions and grants.
SET LOCAL lock_timeout = '5s';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'realtime.subscription'::regclass AND contype = 'p') THEN
    ALTER TABLE realtime.subscription ADD CONSTRAINT pk_subscription PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'realtime.subscription'::regclass AND tgname = 'tr_check_filters') THEN
    CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription
      FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS subscription_subscription_id_entity_filters_action_filter_selected_columns_key
  ON realtime.subscription (subscription_id, entity, filters, action_filter, coalesce(selected_columns, '{}'));
CREATE INDEX IF NOT EXISTS ix_realtime_subscription_entity ON realtime.subscription USING hash (entity);
