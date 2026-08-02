-- Serialize BASE -> Shopify sync runs and recover interrupted runs safely.

CREATE OR REPLACE FUNCTION public.shopify_base_start_sync(p_mode text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  active_run_id uuid;
  new_run_id uuid;
BEGIN
  IF p_mode NOT IN ('dry_run', 'apply') THEN
    RAISE EXCEPTION 'invalid BASE sync mode';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('shopify_base_sync'));

  UPDATE public.shopify_base_sync_runs
  SET
    status = 'failed',
    failed_count = GREATEST(failed_count, 1),
    error_message = COALESCE(error_message, 'Interrupted BASE sync was recovered after 30 minutes.'),
    completed_at = now()
  WHERE status = 'running'
    AND started_at < now() - interval '30 minutes';

  SELECT id
  INTO active_run_id
  FROM public.shopify_base_sync_runs
  WHERE status = 'running'
  ORDER BY started_at DESC
  LIMIT 1;

  IF active_run_id IS NOT NULL THEN
    RAISE EXCEPTION 'BASE sync is already running: %', active_run_id
      USING ERRCODE = '55P03';
  END IF;

  INSERT INTO public.shopify_base_sync_runs (mode, status)
  VALUES (p_mode, 'running')
  RETURNING id INTO new_run_id;

  RETURN new_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.shopify_base_start_sync(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shopify_base_start_sync(text) TO service_role;

COMMENT ON FUNCTION public.shopify_base_start_sync(text) IS
  'Atomically starts one BASE sync run, rejects overlap, and fails stale interrupted runs.';

NOTIFY pgrst, 'reload schema';
