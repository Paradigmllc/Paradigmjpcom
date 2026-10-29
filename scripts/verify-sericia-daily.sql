-- Execute inside a transaction and roll back. No provider calls or persistent fixtures.
DO $$
DECLARE job public.sericia_daily_jobs; token uuid; item uuid:=gen_random_uuid(); stamp timestamptz:=now(); denied boolean:=false;
BEGIN
  IF EXISTS(SELECT 1 FROM pg_class WHERE relname IN ('sericia_daily_jobs','sericia_daily_runs','sericia_social_deliveries') AND NOT relrowsecurity) THEN RAISE EXCEPTION 'RLS missing'; END IF;
  IF has_table_privilege('anon','public.sericia_daily_jobs','SELECT') OR has_function_privilege('authenticated','public.sericia_claim_job(text,text)','EXECUTE') THEN RAISE EXCEPTION 'public grant'; END IF;
  UPDATE public.sericia_daily_jobs SET due_at=now(),lease_id=null,lease_until=null WHERE kind='products';
  SELECT * INTO job FROM public.sericia_claim_job('products','test:rollback');
  IF job.lease_id IS NULL THEN RAISE EXCEPTION 'claim missing'; END IF;
  IF EXISTS(SELECT 1 FROM public.sericia_claim_job('products','test:duplicate')) THEN RAISE EXCEPTION 'duplicate claim'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.sericia_daily_runs WHERE id=job.lease_id AND state='running') THEN RAISE EXCEPTION 'start history missing'; END IF;
  UPDATE public.sericia_daily_jobs SET state='succeeded',lease_id=null,lease_until=null,completed_at=now() WHERE kind='products';
  IF NOT EXISTS(SELECT 1 FROM public.sericia_daily_runs WHERE id=job.lease_id AND state='succeeded') THEN RAISE EXCEPTION 'finish history missing'; END IF;
  INSERT INTO public.shopify_ops_content_items(id,content_code,platform,content_type,status,hook,approved_at,scheduled_for,updated_at)
    VALUES(item,'ROLLBACK-'||item,'pinterest','discovery','scheduled','Rollback fixture',now(),now(),stamp);
  IF public.sericia_claim_social(item,'test:stale',stamp-interval '1 second') IS NOT NULL THEN RAISE EXCEPTION 'stale claim'; END IF;
  token:=public.sericia_claim_social(item,'test:rollback',stamp);
  IF token IS NULL THEN RAISE EXCEPTION 'social claim missing'; END IF;
  IF public.sericia_claim_social(item,'test:duplicate',stamp) IS NOT NULL THEN RAISE EXCEPTION 'duplicate delivery'; END IF;
  BEGIN UPDATE public.shopify_ops_content_items SET status='scheduled' WHERE id=item;
  EXCEPTION WHEN raise_exception THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'reschedule bypass'; END IF;
  IF NOT public.sericia_finish_social(token,'fixture-receipt',null) THEN RAISE EXCEPTION 'finish missing'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.shopify_ops_content_items WHERE id=item AND status='published' AND external_post_id='fixture-receipt') THEN RAISE EXCEPTION 'receipt mismatch'; END IF;
  RAISE NOTICE 'SERICIA job history, RLS, duplicate claims, stale version and receipt checks passed';
END; $$;
