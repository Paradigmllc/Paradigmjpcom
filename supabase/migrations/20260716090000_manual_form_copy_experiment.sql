-- Four-cell manual inquiry-form copy experiment and operator-recorded outcomes.
-- This records manual activity only. The application still has no delivery path.

ALTER TABLE public.manual_japan_entry_work
  ADD COLUMN IF NOT EXISTS message_variant_requested text NOT NULL DEFAULT 'estimate_off_price_off',
  ADD COLUMN IF NOT EXISTS message_variant text NOT NULL DEFAULT 'estimate_off_price_off',
  ADD COLUMN IF NOT EXISTS message_variant_fallback_reason text,
  ADD COLUMN IF NOT EXISTS manually_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reply_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS founder_forwarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS meeting_converted_at timestamptz;

ALTER TABLE public.manual_japan_entry_work
  DROP CONSTRAINT IF EXISTS manual_japan_entry_work_message_variant_requested_check,
  ADD CONSTRAINT manual_japan_entry_work_message_variant_requested_check
    CHECK (message_variant_requested IN (
      'estimate_off_price_off',
      'estimate_on_price_off',
      'estimate_off_price_on',
      'estimate_on_price_on'
    )),
  DROP CONSTRAINT IF EXISTS manual_japan_entry_work_message_variant_check,
  ADD CONSTRAINT manual_japan_entry_work_message_variant_check
    CHECK (message_variant IN (
      'estimate_off_price_off',
      'estimate_on_price_off',
      'estimate_off_price_on',
      'estimate_on_price_on'
    )),
  DROP CONSTRAINT IF EXISTS manual_japan_entry_work_outcome_requires_manual_send,
  ADD CONSTRAINT manual_japan_entry_work_outcome_requires_manual_send
    CHECK (
      manually_sent_at IS NOT NULL
      OR (reply_received_at IS NULL AND founder_forwarded_at IS NULL AND meeting_converted_at IS NULL)
    );

CREATE INDEX IF NOT EXISTS idx_manual_japan_entry_work_variant_outcomes
  ON public.manual_japan_entry_work (message_variant, manually_sent_at, created_at DESC);

COMMENT ON COLUMN public.manual_japan_entry_work.manually_sent_at IS
  'Operator-recorded manual form submission. Never set by an automated delivery path.';

NOTIFY pgrst, 'reload schema';
