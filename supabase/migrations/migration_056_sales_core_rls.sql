-- ============================================================
-- migration_056_sales_core_rls.sql
-- Date: 2026-06-16
-- Purpose: Enable RLS and service_role ALL policies on core
--          sales tables that were deployed without RLS.
-- ============================================================

ALTER TABLE public.sales_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_companies_service_role_all ON public.sales_companies;
CREATE POLICY sales_companies_service_role_all
  ON public.sales_companies FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_customers_service_role_all ON public.sales_customers;
CREATE POLICY sales_customers_service_role_all
  ON public.sales_customers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_deliveries_service_role_all ON public.sales_deliveries;
CREATE POLICY sales_deliveries_service_role_all
  ON public.sales_deliveries FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_templates_service_role_all ON public.sales_templates;
CREATE POLICY sales_templates_service_role_all
  ON public.sales_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_companies TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_deliveries TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_templates TO service_role;

NOTIFY pgrst, 'reload schema';
