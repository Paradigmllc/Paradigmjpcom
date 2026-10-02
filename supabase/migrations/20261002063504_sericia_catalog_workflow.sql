BEGIN;
ALTER TABLE public.shopify_ops_products
  ADD COLUMN IF NOT EXISTS catalog_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS catalog_updated_by text;
ALTER TABLE public.shopify_ops_products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shopify_ops_products FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.shopify_ops_products TO service_role;
-- Both supplier screens share one source. Reset evidence only on a genuine source change.
CREATE OR REPLACE FUNCTION public.sericia_supplier_source_sync() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  UPDATE public.shopify_ops_products SET
    supplier_url = NEW.source_url,
    supplier_verified = CASE WHEN supplier_url IS DISTINCT FROM NEW.source_url THEN false ELSE supplier_verified END,
    updated_at = now()
  WHERE id = NEW.product_id AND supplier_url IS DISTINCT FROM NEW.source_url;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sericia_supplier_source_sync ON public.shopify_supplier_observations;
CREATE TRIGGER sericia_supplier_source_sync AFTER INSERT OR UPDATE OF source_url
ON public.shopify_supplier_observations FOR EACH ROW EXECUTE FUNCTION public.sericia_supplier_source_sync();
REVOKE ALL ON FUNCTION public.sericia_supplier_source_sync() FROM PUBLIC, anon, authenticated;
UPDATE public.shopify_ops_products p SET supplier_url=s.source_url, supplier_verified=false, updated_at=now()
FROM public.shopify_supplier_observations s WHERE p.id=s.product_id AND p.supplier_url IS DISTINCT FROM s.source_url;
COMMIT;
