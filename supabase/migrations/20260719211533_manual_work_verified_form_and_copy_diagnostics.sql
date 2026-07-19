-- Fail closed for manual-work contact routes. A guessed contact page is not a form.
-- Candidate and inspection evidence remain in form_discovery, but operator-facing URLs are removed.

WITH invalid_routes AS (
  SELECT work.*
  FROM public.manual_japan_entry_work AS work
  WHERE (
      work.form_url IS NOT NULL
      OR nullif(work.form_discovery ->> 'formUrl', '') IS NOT NULL
      OR nullif(work.report_data #>> '{contactRoute,url}', '') IS NOT NULL
      OR nullif(work.master_lead_ledger ->> 'contact_form_url', '') IS NOT NULL
    )
    AND NOT (
      work.form_url IS NOT NULL
      AND work.form_discovery ->> 'verification' = 'form'
      AND work.form_discovery #>> '{inspection,status}' = 'form'
      AND coalesce(
        CASE
          WHEN work.form_discovery ->> 'confidence' ~ '^\d+(\.\d+)?$'
            THEN (work.form_discovery ->> 'confidence')::numeric
          ELSE 0
        END,
        0
      ) >= 90
      AND jsonb_typeof(work.form_discovery #> '{inspection,fields}') = 'array'
      AND (work.form_discovery #> '{inspection,fields}') ?& ARRAY['email', 'message', 'submit']
    )
)
UPDATE public.manual_japan_entry_work AS target
SET
  form_url = NULL,
  form_discovery = jsonb_set(target.form_discovery, '{formUrl}', 'null'::jsonb, true),
  master_lead_ledger = jsonb_set(
    jsonb_set(target.master_lead_ledger, '{contact_form_url}', 'null'::jsonb, true),
    '{evidence_classes,observed}',
    CASE
      WHEN jsonb_typeof(target.master_lead_ledger #> '{evidence_classes,observed}') = 'array'
        THEN coalesce((
          SELECT jsonb_agg(observed.value ORDER BY observed.ordinality)
          FROM jsonb_array_elements(target.master_lead_ledger #> '{evidence_classes,observed}')
            WITH ORDINALITY AS observed(value, ordinality)
          WHERE observed.value #>> '{}' IS DISTINCT FROM invalid_routes.form_url
            AND observed.value #>> '{}' IS DISTINCT FROM (invalid_routes.form_discovery ->> 'formUrl')
        ), '[]'::jsonb)
      ELSE '[]'::jsonb
    END,
    true
  ),
  report_data = jsonb_set(
    jsonb_set(
      jsonb_set(target.report_data, '{contactRoute,url}', 'null'::jsonb, true),
      '{contactRoute,status}',
      '"missing"'::jsonb,
      true
    ),
    '{contactRoute,reason}',
    '"A verified public inquiry form is required before manual submission."'::jsonb,
    true
  ),
  status = CASE
    WHEN target.status IN ('completed', 'processing') THEN 'needs_review'
    ELSE target.status
  END,
  error_message = CASE
    WHEN coalesce(target.error_message, '') ILIKE '%high-confidence public form was not verified%'
      THEN target.error_message
    ELSE concat_ws('; ', nullif(target.error_message, ''), 'A high-confidence public form was not verified')
  END,
  updated_at = now()
FROM invalid_routes
WHERE target.id = invalid_routes.id;

-- Historical failures did not always retain the model error. Mark them honestly as retry-required.
UPDATE public.manual_japan_entry_work
SET
  message_review = jsonb_set(
    jsonb_set(
      message_review,
      '{generation_status}',
      '"retry_required"'::jsonb,
      true
    ),
    '{generation_error}',
    to_jsonb(coalesce(
      nullif(message_review ->> 'generation_error', ''),
      'The previous generation result was not preserved; re-run analysis.'
    )),
    true
  ),
  updated_at = now()
WHERE initial_message IS NULL
  AND coalesce(message_review ->> 'generation_status', '') NOT IN ('failed', 'passed');

COMMENT ON COLUMN public.manual_japan_entry_work.form_url IS
  'Operator-visible URL only when a fetched form has email, message, and submit fields and confidence >= 90.';

NOTIFY pgrst, 'reload schema';
