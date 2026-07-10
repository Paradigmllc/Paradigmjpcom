-- migration_068_contact_submission_atomicity.sql
-- Atomically consumes a signed contact challenge, creates exactly one lead,
-- and creates exactly one durable operator notification outbox item.

BEGIN;

CREATE TABLE IF NOT EXISTS public.sales_contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  challenge_hash text NOT NULL UNIQUE,
  lead_id uuid UNIQUE REFERENCES public.leads (id) ON DELETE RESTRICT,
  operator_queue_item_id uuid UNIQUE REFERENCES public.sales_operator_queue_items (id) ON DELETE RESTRICT,
  notification_status text NOT NULL DEFAULT 'pending',
  notification_attempts integer NOT NULL DEFAULT 0,
  notification_lease_until timestamptz,
  notification_claim_token uuid,
  notification_last_error text,
  notification_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_contact_submissions_idempotency_key_check
    CHECK (idempotency_key ~ '^[a-f0-9]{64}$'),
  CONSTRAINT sales_contact_submissions_challenge_hash_check
    CHECK (challenge_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT sales_contact_submissions_notification_status_check
    CHECK (notification_status IN ('pending', 'processing', 'complete', 'degraded')),
  CONSTRAINT sales_contact_submissions_notification_attempts_check
    CHECK (notification_attempts >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sales_contact_submissions_notification_retry
  ON public.sales_contact_submissions (notification_status, notification_lease_until)
  WHERE notification_status IN ('pending', 'processing', 'degraded');

ALTER TABLE public.sales_contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_contact_submissions_service_role_all
  ON public.sales_contact_submissions;
CREATE POLICY sales_contact_submissions_service_role_all
  ON public.sales_contact_submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.sales_contact_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_contact_submissions TO service_role;

CREATE OR REPLACE FUNCTION public.sales_create_contact_submission(
  p_idempotency_key text,
  p_challenge_hash text,
  p_lead jsonb,
  p_notification jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_submission_id uuid;
  v_lead_id uuid;
  v_lead_meta jsonb;
  v_queue_id uuid;
  v_created boolean := false;
  v_notification_claimed boolean := false;
  v_notification_status text;
  v_notification_lease_until timestamptz;
  v_priority integer;
  v_region text;
  v_business_name text;
  v_email text;
  v_notification_title text;
  v_notification_claim_token uuid;
BEGIN
  IF p_idempotency_key IS NULL OR p_idempotency_key !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid contact idempotency key';
  END IF;
  IF p_challenge_hash IS NULL OR p_challenge_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid contact challenge hash';
  END IF;
  IF jsonb_typeof(p_lead) IS DISTINCT FROM 'object' OR jsonb_typeof(p_notification) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'contact lead and notification payloads must be objects';
  END IF;
  v_region := NULLIF(btrim(p_lead->>'region'), '');
  v_business_name := NULLIF(btrim(p_lead->>'business_name'), '');
  v_email := lower(NULLIF(btrim(p_lead->>'email'), ''));
  v_notification_title := NULLIF(btrim(p_notification->>'title'), '');
  IF v_region IS NULL OR v_region <> ALL (
    ARRAY['ja', 'ko', 'zh', 'en', 'europe', 'es', 'pt', 'ru', 'ar', 'sea', 'africa', 'others']
  ) THEN
    RAISE EXCEPTION 'invalid contact lead region';
  END IF;
  IF v_business_name IS NULL OR v_email IS NULL OR v_notification_title IS NULL THEN
    RAISE EXCEPTION 'contact business_name, email, and notification title are required';
  END IF;

  INSERT INTO public.sales_contact_submissions (
    idempotency_key,
    challenge_hash
  ) VALUES (
    p_idempotency_key,
    p_challenge_hash
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_submission_id;

  IF v_submission_id IS NULL THEN
    SELECT
      submission.id,
      submission.lead_id,
      submission.operator_queue_item_id,
      submission.notification_status,
      submission.notification_lease_until
    INTO
      v_submission_id,
      v_lead_id,
      v_queue_id,
      v_notification_status,
      v_notification_lease_until
    FROM public.sales_contact_submissions AS submission
    WHERE submission.idempotency_key = p_idempotency_key
    FOR UPDATE;

    IF v_submission_id IS NULL OR v_lead_id IS NULL THEN
      RAISE EXCEPTION 'contact submission reservation is incomplete';
    END IF;

    SELECT COALESCE(leads.meta, '{}'::jsonb)
    INTO v_lead_meta
    FROM public.leads AS leads
    WHERE leads.id = v_lead_id;

    IF v_notification_status IN ('pending', 'degraded')
      OR (
        v_notification_status = 'processing'
        AND COALESCE(v_notification_lease_until, '-infinity'::timestamptz) <= now()
      )
    THEN
      UPDATE public.sales_contact_submissions
      SET
        notification_status = 'processing',
        notification_attempts = notification_attempts + 1,
        notification_lease_until = now() + interval '60 seconds',
        notification_claim_token = gen_random_uuid(),
        notification_last_error = NULL,
        updated_at = now()
      WHERE id = v_submission_id
      RETURNING notification_claim_token INTO v_notification_claim_token;
      v_notification_claimed := true;
      v_notification_status := 'processing';
    END IF;

    RETURN jsonb_build_object(
      'lead_id', v_lead_id,
      'lead_meta', COALESCE(v_lead_meta, '{}'::jsonb),
      'operator_queue_item_id', v_queue_id,
      'created', false,
      'notification_claimed', v_notification_claimed,
      'notification_claim_token', v_notification_claim_token,
      'notification_status', v_notification_status
    );
  END IF;

  v_created := true;
  INSERT INTO public.leads (
    business_name,
    email,
    phone,
    country,
    industry,
    pipeline_stage,
    region,
    meta
  ) VALUES (
    v_business_name,
    v_email,
    NULLIF(p_lead->>'phone', ''),
    NULLIF(p_lead->>'country', ''),
    NULLIF(p_lead->>'industry', ''),
    COALESCE(NULLIF(p_lead->>'pipeline_stage', ''), 'new'),
    v_region,
    CASE
      WHEN jsonb_typeof(p_lead->'meta') = 'object' THEN p_lead->'meta'
      ELSE '{}'::jsonb
    END
  )
  RETURNING id, COALESCE(meta, '{}'::jsonb)
  INTO v_lead_id, v_lead_meta;

  v_priority := LEAST(
    100,
    GREATEST(0, COALESCE(NULLIF(p_notification->>'priority', '')::integer, 80))
  );
  INSERT INTO public.sales_operator_queue_items (
    region,
    queue_type,
    title,
    priority,
    status,
    source_tool,
    target_tool,
    meta
  ) VALUES (
    COALESCE(NULLIF(p_notification->>'region', ''), 'global'),
    'analysis',
    v_notification_title,
    v_priority,
    'open',
    'supabase',
    NULL,
    p_notification || jsonb_build_object(
      'lead_id', v_lead_id,
      'idempotency_key', p_idempotency_key,
      'slack_text', replace(
        COALESCE(p_notification->>'slack_text', ''),
        '{{lead_id}}',
        v_lead_id::text
      ),
      'slack_status', 'pending',
      'created_by', 'sales_create_contact_submission'
    )
  )
  RETURNING id INTO v_queue_id;

  UPDATE public.sales_contact_submissions
  SET
    lead_id = v_lead_id,
    operator_queue_item_id = v_queue_id,
    notification_status = 'processing',
    notification_attempts = 1,
    notification_lease_until = now() + interval '60 seconds',
    notification_claim_token = gen_random_uuid(),
    updated_at = now()
  WHERE id = v_submission_id
  RETURNING notification_claim_token INTO v_notification_claim_token;
  v_notification_claimed := true;

  RETURN jsonb_build_object(
    'lead_id', v_lead_id,
    'lead_meta', v_lead_meta,
    'operator_queue_item_id', v_queue_id,
    'created', v_created,
    'notification_claimed', v_notification_claimed,
    'notification_claim_token', v_notification_claim_token,
    'notification_status', 'processing'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sales_complete_contact_notification(
  p_idempotency_key text,
  p_claim_token uuid,
  p_status text,
  p_slack_error text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_submission public.sales_contact_submissions%ROWTYPE;
  v_channels jsonb;
BEGIN
  IF p_status NOT IN ('complete', 'degraded') THEN
    RAISE EXCEPTION 'invalid contact notification status';
  END IF;

  SELECT * INTO v_submission
  FROM public.sales_contact_submissions
  WHERE idempotency_key = p_idempotency_key
    AND notification_status = 'processing'
    AND notification_claim_token = p_claim_token
  FOR UPDATE;

  IF v_submission.id IS NULL THEN
    RAISE EXCEPTION 'contact notification claim is stale or missing';
  END IF;

  v_channels := jsonb_build_object(
    'slack_ok', p_status = 'complete',
    'database_ok', true,
    'errors', CASE
      WHEN p_slack_error IS NULL OR btrim(p_slack_error) = '' THEN '[]'::jsonb
      ELSE jsonb_build_array('slack: ' || left(p_slack_error, 500))
    END
  );

  UPDATE public.sales_contact_submissions
  SET
    notification_status = p_status,
    notification_lease_until = NULL,
    notification_claim_token = NULL,
    notification_last_error = NULLIF(left(COALESCE(p_slack_error, ''), 500), ''),
    notification_completed_at = CASE WHEN p_status = 'complete' THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = v_submission.id;

  UPDATE public.leads
  SET meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
    'contact_form',
    COALESCE(meta->'contact_form', '{}'::jsonb) || jsonb_build_object(
      'notification_status', p_status,
      'notification_updated_at', now(),
      'notification_channels', v_channels
    )
  )
  WHERE id = v_submission.lead_id;

  UPDATE public.sales_operator_queue_items
  SET
    meta = COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
      'slack_status', CASE WHEN p_status = 'complete' THEN 'sent' ELSE 'degraded' END,
      'slack_error', NULLIF(left(COALESCE(p_slack_error, ''), 500), '')
    ),
    updated_at = now()
  WHERE id = v_submission.operator_queue_item_id;

  RETURN jsonb_build_object(
    'lead_id', v_submission.lead_id,
    'operator_queue_item_id', v_submission.operator_queue_item_id,
    'notification_status', p_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sales_create_contact_submission(text, text, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sales_create_contact_submission(text, text, jsonb, jsonb)
  TO service_role;

REVOKE ALL ON FUNCTION public.sales_complete_contact_notification(text, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sales_complete_contact_notification(text, uuid, text, text)
  TO service_role;

-- migration_057 created SECURITY DEFINER functions before explicit EXECUTE
-- ACLs were standardized. Keep server callers working while closing the
-- default PUBLIC/anon/authenticated PostgREST execution path.
DO $$
BEGIN
  IF to_regprocedure('public.sales_atomic_meta_merge(uuid,jsonb)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.sales_atomic_meta_merge(uuid,jsonb) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.sales_atomic_meta_merge(uuid,jsonb) TO service_role';
  END IF;
  IF to_regprocedure('public.sales_atomic_meta_history_prepend(uuid,text,text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.sales_atomic_meta_history_prepend(uuid,text,text,text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.sales_atomic_meta_history_prepend(uuid,text,text,text) TO service_role';
  END IF;
  IF to_regprocedure('public.sales_atomic_screenshot_append(uuid,text,jsonb)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.sales_atomic_screenshot_append(uuid,text,jsonb) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.sales_atomic_screenshot_append(uuid,text,jsonb) TO service_role';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
