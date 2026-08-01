-- Expected source failures are terminal lead outcomes, not operator-retry incidents.
-- The processing service applies the same stage-aware policy to all new work.
UPDATE public.manual_japan_entry_work
SET
  status = 'rejected',
  stage = 'complete',
  error_message = CASE
    WHEN lower(error_message) LIKE 'homepage returned http%'
      THEN 'Public company website returned a terminal HTTP response after automatic recovery; excluded from outreach.'
    WHEN lower(error_message) LIKE '%did not provide enough grounded product context%'
      THEN 'Public company website did not provide sufficient grounded product evidence; excluded from outreach.'
    ELSE 'Public company website remained unreachable after automatic recovery; excluded from outreach.'
  END
WHERE status = 'failed'
  AND stage = 'failed'
  AND twenty_sync_status = 'skipped'
  AND report_url IS NULL
  AND initial_message IS NULL
  AND sent = false
  AND (
    lower(error_message) = 'fetch failed'
    OR lower(error_message) LIKE '%timed out%'
    OR lower(error_message) LIKE '%aborted due to timeout%'
    OR lower(error_message) LIKE 'homepage returned http%'
    OR lower(error_message) LIKE '%no public pages were available%'
    OR lower(error_message) LIKE '%homepage evidence could not be reused%'
    OR lower(error_message) LIKE '%did not provide enough grounded product context%'
  );
