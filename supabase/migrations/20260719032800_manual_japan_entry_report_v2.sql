-- Replace every stored manual-work report with the dedicated evidence-brief contract.
-- This is a data-only migration: the existing RLS-protected operator table remains the source of truth.

WITH normalized AS (
  SELECT
    w.*,
    CASE
      WHEN jsonb_typeof(w.evidence #> '{audit,pages_checked}') = 'array'
        THEN w.evidence #> '{audit,pages_checked}'
      ELSE '[]'::jsonb
    END AS checked_pages,
    CASE
      WHEN jsonb_typeof(w.profile -> 'commercialSignals') = 'array'
        THEN w.profile -> 'commercialSignals'
      WHEN jsonb_typeof(w.report_data #> '{meta,manual_commercial_signals}') = 'array'
        THEN w.report_data #> '{meta,manual_commercial_signals}'
      ELSE '[]'::jsonb
    END AS commercial_signals,
    CASE
      WHEN jsonb_typeof(w.report_data -> 'acts') = 'array'
        THEN w.report_data -> 'acts'
      ELSE '[]'::jsonb
    END AS legacy_findings,
    CASE
      WHEN jsonb_typeof(w.report_data -> 'source_coverage') = 'object'
        THEN w.report_data -> 'source_coverage'
      ELSE jsonb_build_object(
        'score', 0,
        'collected', 0,
        'configured', 0,
        'missing', 5,
        'items', '[]'::jsonb
      )
    END AS source_coverage
  FROM public.manual_japan_entry_work w
  WHERE w.report_url IS NOT NULL
    AND coalesce(w.report_data ->> 'schemaVersion', '') <> 'manual_japan_entry_v2'
), rebuilt AS (
  SELECT
    n.*,
    CASE
      WHEN n.is_japanese_company IS TRUE
        OR n.smb_status = 'rejected'
        OR n.japan_entry_fit_status = 'rejected'
        THEN 'rejected'
      WHEN n.smb_status = 'qualified'
        AND n.japan_entry_fit_status = 'qualified'
        AND n.form_url IS NOT NULL
        AND n.form_discovery ->> 'verification' = 'form'
        AND n.initial_message IS NOT NULL
        AND n.message_review ->> 'passed' = 'true'
        THEN 'qualified'
      ELSE 'review_required'
    END AS decision_status,
    coalesce(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'id', coalesce(finding.value ->> 'type', 'legacy-finding') || '-' || finding.ordinality::text,
          'title', coalesce(finding.value ->> 'headline', 'Public-page finding'),
          'observation', coalesce(finding.value ->> 'body', 'Operator review required.'),
          'source', 'Stored public-page audit',
          'confidence', 0
        ) ORDER BY finding.ordinality)
        FROM jsonb_array_elements(n.legacy_findings) WITH ORDINALITY AS finding(value, ordinality)
        WHERE finding.value ->> 'headline' IS NOT NULL
          AND finding.value ->> 'metric_value' IS DISTINCT FROM 'No missing signal observed'
      ),
      '[]'::jsonb
    ) AS readiness_gaps
  FROM normalized n
)
UPDATE public.manual_japan_entry_work AS target
SET
  report_data = jsonb_build_object(
    'schemaVersion', 'manual_japan_entry_v2',
    'reportKind', 'manual_japan_entry_evidence_brief',
    'generatedAt', rebuilt.updated_at,
    'reportUrl', rebuilt.report_url,
    'company', jsonb_build_object(
      'name', coalesce(rebuilt.company_name, rebuilt.domain),
      'domain', rebuilt.domain,
      'countryCode', rebuilt.country_code,
      'businessModel', coalesce(rebuilt.business_model, 'service'),
      'industry', coalesce(rebuilt.industry, 'Unconfirmed'),
      'productContext', coalesce(rebuilt.product_context, 'Public company website evidence requires operator review.')
    ),
    'decision', jsonb_build_object(
      'status', rebuilt.decision_status,
      'summary', CASE rebuilt.decision_status
        WHEN 'qualified' THEN 'The public evidence meets the current manual-workbench gates. A human must still review and submit the first touch.'
        WHEN 'rejected' THEN 'The company does not meet the overseas-SMB scope and must not enter the manual outreach list.'
        ELSE 'One or more evidence gates remain unresolved. Keep this record in operator review.'
      END,
      'reasons', jsonb_build_array(
        'Overseas company check: ' || CASE WHEN rebuilt.is_japanese_company IS TRUE THEN 'failed.' ELSE 'passed.' END,
        'SMB classification: ' || coalesce(rebuilt.smb_status, 'review_required') || ' (' || coalesce(rebuilt.smb_confidence, 0)::text || '/100).',
        'Japan Entry fit: ' || coalesce(rebuilt.japan_entry_fit_status, 'review_required') || ' (' || coalesce(rebuilt.japan_entry_fit_confidence, 0)::text || '/100).',
        'Inquiry route: ' || CASE WHEN rebuilt.form_url IS NOT NULL AND rebuilt.form_discovery ->> 'verification' = 'form' THEN 'verified public form.' ELSE 'operator review required.' END,
        'First-touch quality gate: ' || CASE WHEN rebuilt.initial_message IS NOT NULL AND rebuilt.message_review ->> 'passed' = 'true' THEN 'passed.' ELSE 'blocked.' END
      ),
      'smb', jsonb_build_object('status', coalesce(rebuilt.smb_status, 'review_required'), 'confidence', coalesce(rebuilt.smb_confidence, 0)),
      'japanEntryFit', jsonb_build_object('status', coalesce(rebuilt.japan_entry_fit_status, 'review_required'), 'confidence', coalesce(rebuilt.japan_entry_fit_confidence, 0))
    ),
    'market', jsonb_build_object(
      'priority', coalesce(rebuilt.report_data #>> '{meta,manual_market_lens,priority}', 'individual_review'),
      'label', CASE coalesce(rebuilt.report_data #>> '{meta,manual_market_lens,priority}', 'individual_review')
        WHEN 'global_priority' THEN 'Global-priority market'
        WHEN 'regional_core' THEN 'Regional core market'
        WHEN 'precision' THEN 'Precision market'
        WHEN 'selective' THEN 'Selective market'
        ELSE 'Company-level review'
      END,
      'rationale', 'Judge the company on public evidence of its product, international proof, and decision structure; country context is not a price proxy.',
      'focusIndustries', coalesce(rebuilt.report_data #> '{meta,manual_market_lens,focusIndustries}', '[]'::jsonb),
      'commercialEvidenceStatus', CASE jsonb_array_length(rebuilt.commercial_signals)
        WHEN 0 THEN 'unverified'
        WHEN 1 THEN 'partial'
        ELSE 'observed'
      END,
      'commercialSignals', rebuilt.commercial_signals,
      'pricingPolicy', 'no_automatic_country_adjustment'
    ),
    'japanReadiness', jsonb_build_object(
      'checkedPageCount', jsonb_array_length(rebuilt.checked_pages),
      'gaps', rebuilt.readiness_gaps,
      'summary', CASE
        WHEN jsonb_array_length(rebuilt.readiness_gaps) > 0
          THEN jsonb_array_length(rebuilt.readiness_gaps)::text || ' business-model-relevant Japan customer-path question(s) were not resolved by the checked pages.'
        ELSE 'No missing business-model-relevant signal was observed in this bounded screen. This is not proof of Japan readiness.'
      END,
      'disclaimer', coalesce(rebuilt.evidence #>> '{audit,legal_disclaimer}', 'This is a bounded public-page screen, not legal advice or proof of Japan readiness.')
    ),
    'contactRoute', jsonb_build_object(
      'url', rebuilt.form_url,
      'status', CASE
        WHEN rebuilt.form_url IS NOT NULL AND rebuilt.form_discovery ->> 'verification' = 'form' THEN 'verified'
        WHEN rebuilt.form_url IS NOT NULL THEN 'review_required'
        ELSE 'missing'
      END,
      'method', coalesce(rebuilt.form_discovery ->> 'method', 'none'),
      'confidence', CASE
        WHEN rebuilt.form_discovery ->> 'confidence' ~ '^\d+(\.\d+)?$'
          THEN least(100, greatest(0, round((rebuilt.form_discovery ->> 'confidence')::numeric)::integer))
        ELSE 0
      END,
      'reason', CASE
        WHEN rebuilt.form_url IS NOT NULL AND rebuilt.form_discovery ->> 'verification' = 'form'
          THEN 'A public page containing a usable inquiry form was fetched and verified.'
        ELSE 'A verified public inquiry form is required before manual submission.'
      END
    ),
    'outreach', jsonb_build_object(
      'purpose', 'initial_interest',
      'draft', rebuilt.initial_message,
      'qualityPassed', rebuilt.initial_message IS NOT NULL AND rebuilt.message_review ->> 'passed' = 'true',
      'score', CASE WHEN rebuilt.message_review ->> 'score' ~ '^\d+(\.\d+)?$' THEN (rebuilt.message_review ->> 'score')::numeric ELSE NULL END,
      'uniquenessScore', CASE
        WHEN rebuilt.message_review ->> 'uniquenessScore' ~ '^\d+(\.\d+)?$' THEN (rebuilt.message_review ->> 'uniquenessScore')::numeric
        WHEN rebuilt.message_review ->> 'uniqueness_score' ~ '^\d+(\.\d+)?$' THEN (rebuilt.message_review ->> 'uniqueness_score')::numeric
        ELSE NULL
      END,
      'playbook', coalesce(rebuilt.outreach_playbook, 'general_online_smb'),
      'variant', coalesce(rebuilt.message_variant, 'unrecorded'),
      'angle', coalesce(rebuilt.message_angle, 'unrecorded'),
      'reviewSummary', coalesce(rebuilt.message_review ->> 'rationale', 'Legacy report upgraded from stored first-party evidence.'),
      'neverSent', true
    ),
    'sourceCoverage', rebuilt.source_coverage,
    'qualificationLedger', coalesce(rebuilt.qualification_ledger, '{}'::jsonb),
    'nextActions', jsonb_build_array(
      'Review the company, country, product wording, and every quoted public fact.',
      'Open the verified inquiry form and check its no-solicitation language before manual submission.',
      'Review the first-touch draft for factual accuracy, naturalness, and fit with the recipient’s business.',
      'Verify the contracting entity, decision maker, and payment capacity before discussing commercial terms.'
    ),
    'guardrails', jsonb_build_array(
      'This report uses public-page evidence only and is not proof of demand, revenue, legal compliance, or purchase intent.',
      'Country context never changes the existing offer price automatically.',
      'The first-touch draft contains no URL or source citation and must be submitted by a human.',
      'No automated sending path is allowed from this workbench.'
    ),
    'provenance', jsonb_build_object(
      'evidenceContract', 'public-pages-only',
      'sourceUrl', rebuilt.canonical_url,
      'generatedBy', 'manual_japan_entry_workbench',
      'legacyTemplateUsed', false,
      'automaticSendAllowed', false
    )
  ),
  updated_at = now()
FROM rebuilt
WHERE target.id = rebuilt.id;

COMMENT ON COLUMN public.manual_japan_entry_work.report_data IS
  'Dedicated manual Japan Entry evidence brief. schemaVersion=manual_japan_entry_v2; never used as an automated send payload.';
