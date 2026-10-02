-- Private recurring jobs and an at-most-once social delivery ledger.
CREATE TABLE IF NOT EXISTS public.sericia_daily_jobs (
  kind text PRIMARY KEY CHECK (kind IN ('products','inventory','orders','suppliers','social')),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','running','succeeded','blocked','failed')),
  cursor text,
  due_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_success_at timestamptz,
  lease_id uuid,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}',
  error_message text,
  updated_by text NOT NULL DEFAULT 'migration',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.sericia_daily_jobs(kind) VALUES ('products'),('inventory'),('orders'),('suppliers'),('social') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.sericia_social_deliveries (
  content_id uuid PRIMARY KEY REFERENCES public.shopify_ops_content_items(id),
  claim_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  state text NOT NULL DEFAULT 'claimed' CHECK (state IN ('claimed','published','uncertain')),
  external_post_id text,
  post_url text,
  actor text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  error_code text
);
ALTER TABLE public.sericia_daily_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sericia_social_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sericia_daily_jobs, public.sericia_social_deliveries FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.sericia_daily_jobs, public.sericia_social_deliveries TO service_role;
CREATE OR REPLACE FUNCTION public.sericia_claim_job(p_kind text,p_actor text)
RETURNS SETOF public.sericia_daily_jobs LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF coalesce(length(p_actor),0)=0 THEN RAISE EXCEPTION 'actor required'; END IF;
  RETURN QUERY UPDATE public.sericia_daily_jobs SET state='running',lease_id=gen_random_uuid(),
    lease_until=now()+interval '5 minutes', started_at=now(),attempts=attempts+1,
    error_message=null,updated_at=now(),updated_by=p_actor
    WHERE kind=p_kind AND due_at<=now() AND (lease_until IS NULL OR lease_until<now()) RETURNING *;
END; $$;
CREATE OR REPLACE FUNCTION public.sericia_claim_social(p_content uuid,p_actor text,p_expected_updated timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE token uuid;
BEGIN
  IF coalesce(length(p_actor),0)=0 THEN RAISE EXCEPTION 'actor required'; END IF;
  PERFORM 1 FROM public.shopify_ops_content_items WHERE id=p_content AND status='scheduled'
    AND approved_at IS NOT NULL AND scheduled_for<=now() AND external_post_id IS NULL
    AND updated_at=p_expected_updated FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  INSERT INTO public.sericia_social_deliveries(content_id,actor) VALUES(p_content,p_actor)
    ON CONFLICT DO NOTHING RETURNING claim_id INTO token;
  IF token IS NULL THEN RETURN NULL; END IF;
  UPDATE public.shopify_ops_content_items SET status='blocked', publish_attempts=publish_attempts+1,
    last_publish_attempt_at=now(),updated_at=now(),error_message='公開処理中または結果未確認。重複防止のため自動再投稿しません' WHERE id=p_content;
  RETURN token;
END; $$;
CREATE OR REPLACE FUNCTION public.sericia_finish_social(p_claim uuid,p_external text,p_url text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE item uuid;
BEGIN
  IF coalesce(length(p_external),0)=0 THEN RAISE EXCEPTION 'provider receipt required'; END IF;
  UPDATE public.sericia_social_deliveries SET state='published',external_post_id=p_external,
    post_url=p_url,completed_at=now(),error_code=null WHERE claim_id=p_claim AND state='claimed' RETURNING content_id INTO item;
  IF item IS NULL THEN RETURN false; END IF;
  UPDATE public.shopify_ops_content_items SET status='published',external_post_id=p_external,
    post_url=p_url,published_at=now(),updated_at=now(),error_message=null WHERE id=item;
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.sericia_claim_job(text,text), public.sericia_claim_social(uuid,text,timestamptz),public.sericia_finish_social(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sericia_claim_job(text,text), public.sericia_claim_social(uuid,text,timestamptz),public.sericia_finish_social(uuid,text,text) TO service_role;
CREATE TABLE IF NOT EXISTS public.sericia_daily_runs (
  id uuid PRIMARY KEY,
  kind text NOT NULL REFERENCES public.sericia_daily_jobs(kind),
  state text NOT NULL CHECK (state IN ('running','succeeded','blocked','failed')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  actor text NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}',
  error_message text
);
CREATE INDEX IF NOT EXISTS sericia_daily_runs_recent ON public.sericia_daily_runs(started_at DESC);
ALTER TABLE public.sericia_daily_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sericia_daily_runs FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.sericia_daily_runs TO service_role;
CREATE OR REPLACE FUNCTION public.sericia_log_daily_run()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF NEW.lease_id IS NOT NULL AND NEW.lease_id IS DISTINCT FROM OLD.lease_id THEN
    UPDATE public.sericia_daily_runs SET state='failed',completed_at=now(),error_message='実行ロックが期限切れです。結果を再照合します'
      WHERE id=OLD.lease_id AND state='running';
    INSERT INTO public.sericia_daily_runs(id,kind,state,started_at,actor)
      VALUES(NEW.lease_id,NEW.kind,'running',NEW.started_at,NEW.updated_by);
  ELSIF OLD.lease_id IS NOT NULL AND NEW.lease_id IS NULL THEN
    UPDATE public.sericia_daily_runs SET state=NEW.state,completed_at=NEW.completed_at,
      summary=NEW.summary,error_message=NEW.error_message WHERE id=OLD.lease_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS sericia_daily_run_audit ON public.sericia_daily_jobs;
CREATE TRIGGER sericia_daily_run_audit AFTER UPDATE ON public.sericia_daily_jobs
  FOR EACH ROW EXECUTE FUNCTION public.sericia_log_daily_run();
CREATE OR REPLACE FUNCTION public.sericia_guard_delivery_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE delivery public.sericia_social_deliveries;
BEGIN
  SELECT * INTO delivery FROM public.sericia_social_deliveries WHERE content_id=OLD.id;
  IF FOUND THEN
    IF NEW.caption IS DISTINCT FROM OLD.caption OR NEW.media_url IS DISTINCT FROM OLD.media_url
      OR NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.platform IS DISTINCT FROM OLD.platform
      OR NEW.approved_at IS DISTINCT FROM OLD.approved_at OR NEW.scheduled_for IS DISTINCT FROM OLD.scheduled_for THEN
      RAISE EXCEPTION 'delivery already attempted; reconcile provider receipt first';
    END IF;
    IF NEW.status <> 'blocked' AND NOT (NEW.status='published' AND delivery.state='published'
      AND NEW.external_post_id=delivery.external_post_id) THEN
      RAISE EXCEPTION 'delivery status requires verified receipt';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS sericia_social_edit_guard ON public.shopify_ops_content_items;
CREATE TRIGGER sericia_social_edit_guard BEFORE UPDATE ON public.shopify_ops_content_items
  FOR EACH ROW EXECUTE FUNCTION public.sericia_guard_delivery_edit();
REVOKE ALL ON FUNCTION public.sericia_log_daily_run(),public.sericia_guard_delivery_edit() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sericia_log_daily_run(),public.sericia_guard_delivery_edit() TO service_role;
NOTIFY pgrst,'reload schema';
