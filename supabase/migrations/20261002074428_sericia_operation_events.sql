-- Private operational projections; Shopify remains the order/inventory authority.
CREATE TABLE IF NOT EXISTS public.sericia_operation_snapshots (
  shop text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('product','inventory','order','fulfillment')),
  entity_id text NOT NULL,
  source_updated_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  deleted boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL CHECK (jsonb_typeof(data)='object'),
  PRIMARY KEY (shop,kind,entity_id)
);
CREATE TABLE IF NOT EXISTS public.sericia_operation_events (
  shop text NOT NULL,
  delivery_id text NOT NULL,
  topic text NOT NULL,
  body_hash text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('applied','stale','unchanged','conflict','invalid')),
  error_code text,
  actor text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (shop,delivery_id)
);
CREATE INDEX IF NOT EXISTS sericia_operation_events_recent ON public.sericia_operation_events(shop,received_at DESC);
CREATE INDEX IF NOT EXISTS sericia_operation_snapshots_recent ON public.sericia_operation_snapshots(shop,received_at DESC);
ALTER TABLE public.sericia_operation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sericia_operation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sericia_operation_snapshots,public.sericia_operation_events FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.sericia_operation_snapshots,public.sericia_operation_events TO service_role;
CREATE OR REPLACE FUNCTION public.sericia_ingest_event(p_shop text,p_delivery text,p_topic text,p_hash text,p_kind text,p_entity text,p_version timestamptz,p_data jsonb,p_deleted boolean,p_actor text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE prior_event public.sericia_operation_events; prior public.sericia_operation_snapshots; result text;
BEGIN
  IF p_actor IS NULL OR length(p_actor)=0 OR p_shop !~ '^[a-z0-9-]+\.myshopify\.com$' OR p_kind NOT IN ('product','inventory','order','fulfillment') OR jsonb_typeof(p_data)<>'object' THEN RAISE EXCEPTION 'Invalid ingestion'; END IF;
  -- Serialize identical deliveries, then serialize updates to an entity. Transaction rollback is the retry boundary.
  PERFORM pg_advisory_xact_lock(hashtextextended('sericia:delivery:'||p_shop||':'||p_delivery,0));
  SELECT * INTO prior_event FROM public.sericia_operation_events WHERE shop=p_shop AND delivery_id=p_delivery;
  IF FOUND THEN
    IF prior_event.body_hash<>p_hash THEN RAISE EXCEPTION 'Delivery hash mismatch'; END IF;
    IF prior_event.outcome<>'invalid' THEN RETURN 'duplicate'; END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('sericia:entity:'||p_shop||':'||p_kind||':'||p_entity,0));
  SELECT * INTO prior FROM public.sericia_operation_snapshots WHERE shop=p_shop AND kind=p_kind AND entity_id=p_entity;
  IF FOUND AND prior.deleted AND NOT p_deleted THEN result:='stale';
  ELSIF FOUND AND prior.source_updated_at>p_version THEN result:='stale';
  ELSIF FOUND AND prior.source_updated_at=p_version AND prior.data=p_data AND prior.deleted=p_deleted THEN result:='unchanged';
  ELSIF FOUND AND prior.source_updated_at=p_version AND p_actor='shopify:webhook' THEN result:='conflict';
  ELSE
    INSERT INTO public.sericia_operation_snapshots(shop,kind,entity_id,source_updated_at,data,deleted)
    VALUES(p_shop,p_kind,p_entity,p_version,p_data,p_deleted)
    ON CONFLICT(shop,kind,entity_id) DO UPDATE SET source_updated_at=excluded.source_updated_at,data=excluded.data,deleted=excluded.deleted,received_at=now();
    result:='applied';
  END IF;
  INSERT INTO public.sericia_operation_events(shop,delivery_id,topic,body_hash,outcome,error_code,actor)
  VALUES(p_shop,p_delivery,p_topic,p_hash,result,CASE WHEN result='conflict' THEN 'equal_version_conflict' END,p_actor)
  ON CONFLICT(shop,delivery_id) DO UPDATE SET outcome=excluded.outcome,error_code=excluded.error_code,actor=excluded.actor,received_at=now();
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sericia_ingest_event(text,text,text,text,text,text,timestamptz,jsonb,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sericia_ingest_event(text,text,text,text,text,text,timestamptz,jsonb,boolean,text) TO service_role;
NOTIFY pgrst, 'reload schema';
