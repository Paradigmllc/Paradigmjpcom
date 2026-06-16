-- migration_052_sales_products_bootstrap.sql
-- Idempotent bootstrap for Cloud Supabase projects where legacy owner-owned
-- tables prevent running the full migration_018 alter block.

CREATE TABLE IF NOT EXISTS public.sales_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  market_scope text NOT NULL,
  template_variant text NOT NULL,
  default_currency text NOT NULL DEFAULT 'JPY',
  default_amount_yen integer NOT NULL DEFAULT 0,
  is_subscription boolean NOT NULL DEFAULT false,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_products_market_scope_check CHECK (market_scope IN ('jp', 'global')),
  CONSTRAINT sales_products_amount_check CHECK (default_amount_yen >= 0)
);

CREATE TABLE IF NOT EXISTS public.sales_company_product_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.sales_companies (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.sales_products (id) ON DELETE RESTRICT,
  priority integer NOT NULL DEFAULT 1,
  fit_score integer NOT NULL DEFAULT 70,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'recommended',
  twenty_opportunity_id text,
  source text NOT NULL DEFAULT 'company_karte',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_company_product_priority_check CHECK (priority BETWEEN 1 AND 10),
  CONSTRAINT sales_company_product_fit_score_check CHECK (fit_score BETWEEN 0 AND 100),
  CONSTRAINT sales_company_product_status_check CHECK (status IN ('recommended', 'assigned', 'opportunity_created', 'dismissed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_sales_company_product_recommendation
  ON public.sales_company_product_recommendations (company_id, product_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_product_company_status
  ON public.sales_company_product_recommendations (company_id, status, priority);

DROP TRIGGER IF EXISTS trg_sales_products_touch ON public.sales_products;
CREATE TRIGGER trg_sales_products_touch
BEFORE UPDATE ON public.sales_products
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sales_company_product_recommendations_touch ON public.sales_company_product_recommendations;
CREATE TRIGGER trg_sales_company_product_recommendations_touch
BEFORE UPDATE ON public.sales_company_product_recommendations
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

ALTER TABLE public.sales_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_company_product_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_products_service_role_all ON public.sales_products;
CREATE POLICY sales_products_service_role_all
  ON public.sales_products FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_company_product_recommendations_service_role_all ON public.sales_company_product_recommendations;
CREATE POLICY sales_company_product_recommendations_service_role_all
  ON public.sales_company_product_recommendations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_products TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_company_product_recommendations TO service_role;

NOTIFY pgrst, 'reload schema';
