-- Payload 3.90+ reads this hidden field on every local-auth user lookup.
-- Nullable/additive: preserve all existing passwords, sessions and access grants.
ALTER TABLE paradigm.users
  ADD COLUMN IF NOT EXISTS reset_password_requested_at timestamp(3) with time zone;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'paradigm' AND table_name = 'users'
      AND column_name = 'reset_password_requested_at'
      AND data_type = 'timestamp with time zone' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Payload auth reset timestamp schema mismatch';
  END IF;
END $$;
