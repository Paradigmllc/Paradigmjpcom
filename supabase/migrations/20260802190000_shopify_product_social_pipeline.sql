-- SERICIA product truth gate and daily social publishing pipeline.
-- Service-role only: product evidence, approvals, and external delivery history
-- must never be writable from a public browser session.

ALTER TABLE public.shopify_ops_products
  ADD COLUMN IF NOT EXISTS primary_image_url text,
  ADD COLUMN IF NOT EXISTS origin_country_code text,
  ADD COLUMN IF NOT EXISTS hs_code text,
  ADD COLUMN IF NOT EXISTS fulfillment_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sample_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_rights_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compliance_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fulfillment_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.shopify_ops_products
  DROP CONSTRAINT IF EXISTS shopify_ops_products_fulfillment_days_check;
ALTER TABLE public.shopify_ops_products
  ADD CONSTRAINT shopify_ops_products_fulfillment_days_check
  CHECK (fulfillment_days >= 0 AND fulfillment_days <= 365);

ALTER TABLE public.shopify_ops_content_items
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS destination_url text,
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generation_date date,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS publish_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_publish_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_post_id text;

ALTER TABLE public.shopify_ops_content_items
  DROP CONSTRAINT IF EXISTS shopify_ops_content_publish_attempts_check;
ALTER TABLE public.shopify_ops_content_items
  ADD CONSTRAINT shopify_ops_content_publish_attempts_check
  CHECK (publish_attempts >= 0 AND publish_attempts <= 20);

CREATE TABLE IF NOT EXISTS public.shopify_social_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date date NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'running',
  eligible_product_count integer NOT NULL DEFAULT 0,
  generated_post_count integer NOT NULL DEFAULT 0,
  published_post_count integer NOT NULL DEFAULT 0,
  failed_post_count integer NOT NULL DEFAULT 0,
  blocked_reason text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shopify_social_runs_status_check
    CHECK (status IN ('running', 'succeeded', 'blocked', 'failed')),
  CONSTRAINT shopify_social_runs_counts_check CHECK (
    eligible_product_count >= 0 AND generated_post_count >= 0
    AND published_post_count >= 0 AND failed_post_count >= 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shopify_social_daily_content
  ON public.shopify_ops_content_items (product_id, platform, generation_date)
  WHERE auto_generated = true;
CREATE INDEX IF NOT EXISTS idx_shopify_social_due_content
  ON public.shopify_ops_content_items (scheduled_for, platform)
  WHERE status = 'scheduled' AND approved_at IS NOT NULL AND external_post_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_shopify_social_runs_date
  ON public.shopify_social_runs (run_date DESC);

ALTER TABLE public.shopify_social_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shopify_social_runs FROM anon, authenticated;
DROP POLICY IF EXISTS shopify_social_runs_service_role_all ON public.shopify_social_runs;
CREATE POLICY shopify_social_runs_service_role_all
  ON public.shopify_social_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopify_social_runs TO service_role;

NOTIFY pgrst, 'reload schema';
