-- Evidence-gated outreach-angle experiment and industry playbook classification.
-- This migration adds metadata only; the workbench remains manual and zero-send.

ALTER TABLE public.manual_japan_entry_work
  ADD COLUMN IF NOT EXISTS message_angle_requested text NOT NULL DEFAULT 'problem',
  ADD COLUMN IF NOT EXISTS message_angle text NOT NULL DEFAULT 'problem',
  ADD COLUMN IF NOT EXISTS message_angle_fallback_reason text,
  ADD COLUMN IF NOT EXISTS outreach_playbook text NOT NULL DEFAULT 'general_online_smb';

ALTER TABLE public.manual_japan_entry_work
  DROP CONSTRAINT IF EXISTS manual_japan_entry_work_message_angle_requested_check,
  ADD CONSTRAINT manual_japan_entry_work_message_angle_requested_check
    CHECK (message_angle_requested IN ('problem', 'competitor', 'opportunity', 'mockup')),
  DROP CONSTRAINT IF EXISTS manual_japan_entry_work_message_angle_check,
  ADD CONSTRAINT manual_japan_entry_work_message_angle_check
    CHECK (message_angle IN ('problem', 'competitor', 'opportunity', 'mockup')),
  DROP CONSTRAINT IF EXISTS manual_japan_entry_work_outreach_playbook_check,
  ADD CONSTRAINT manual_japan_entry_work_outreach_playbook_check
    CHECK (outreach_playbook IN (
      'saas_ai_devtools',
      'web3_blockchain',
      'cyber_b2b_infrastructure',
      'education_membership',
      'research_data_media',
      'creator_tools',
      'gaming_tools',
      'premium_hobby_ecommerce',
      'hospitality_saas',
      'marketplace_platform',
      'general_online_smb'
    ));

CREATE INDEX IF NOT EXISTS idx_manual_japan_entry_work_angle_outcomes
  ON public.manual_japan_entry_work (message_angle, manually_sent_at, created_at DESC);

COMMENT ON COLUMN public.manual_japan_entry_work.message_angle IS
  'Effective evidence-gated first-touch angle. Unsupported competitor, opportunity, or mockup requests fall back to problem.';
COMMENT ON COLUMN public.manual_japan_entry_work.outreach_playbook IS
  'Industry-specific wording guardrail selected from public company evidence.';

NOTIFY pgrst, 'reload schema';
