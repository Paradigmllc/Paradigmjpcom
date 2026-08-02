-- BASE -> Shopify catalog sync. Tokens are encrypted application-side before storage.

CREATE TABLE IF NOT EXISTS public.shopify_base_oauth (
  id text PRIMARY KEY DEFAULT 'primary' CHECK (id = 'primary'),
  access_token_ciphertext text NOT NULL,
  refresh_token_ciphertext text NOT NULL,
  expires_at timestamptz NOT NULL,
  base_shop_id text,
  base_shop_name text,
  base_shop_url text,
  scope text[] NOT NULL DEFAULT ARRAY['read_users', 'read_items'],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shopify_base_product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_item_id bigint NOT NULL UNIQUE,
  shopify_product_id text NOT NULL,
  shopify_handle text NOT NULL,
  variant_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shopify_base_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('dry_run', 'apply')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed', 'blocked')),
  source_count integer NOT NULL DEFAULT 0 CHECK (source_count >= 0),
  created_count integer NOT NULL DEFAULT 0 CHECK (created_count >= 0),
  updated_count integer NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
  skipped_count integer NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopify_base_sync_runs_started
  ON public.shopify_base_sync_runs (started_at DESC);

ALTER TABLE public.shopify_base_oauth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_base_product_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopify_base_sync_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.shopify_base_oauth FROM anon, authenticated;
REVOKE ALL ON public.shopify_base_product_links FROM anon, authenticated;
REVOKE ALL ON public.shopify_base_sync_runs FROM anon, authenticated;

DROP POLICY IF EXISTS shopify_base_oauth_service_role_all ON public.shopify_base_oauth;
CREATE POLICY shopify_base_oauth_service_role_all
  ON public.shopify_base_oauth FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS shopify_base_links_service_role_all ON public.shopify_base_product_links;
CREATE POLICY shopify_base_links_service_role_all
  ON public.shopify_base_product_links FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS shopify_base_runs_service_role_all ON public.shopify_base_sync_runs;
CREATE POLICY shopify_base_runs_service_role_all
  ON public.shopify_base_sync_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_base_oauth TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_base_product_links TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_base_sync_runs TO service_role;

NOTIFY pgrst, 'reload schema';
