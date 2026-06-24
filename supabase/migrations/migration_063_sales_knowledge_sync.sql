-- migration_063_sales_knowledge_sync.sql
-- Adds bidirectional sync tables for Notion knowledge DBs (Tools, Phases, Diagnosis Matrix).
-- WW-EVENT compliant: Notion webhook triggers sync; no cron/pg_cron.

CREATE TABLE IF NOT EXISTS public.sales_knowledge_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id text UNIQUE NOT NULL,
  name text NOT NULL,
  category text,
  status text,
  notes text,
  notion_last_edited timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_knowledge_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id text UNIQUE NOT NULL,
  name text NOT NULL,
  phase_number integer,
  role text,
  tools text,
  notion_last_edited timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_knowledge_diagnosis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id text UNIQUE NOT NULL,
  pain_category text NOT NULL,
  pain_number integer,
  tool_list text,
  technical_fact text,
  fear_amount text,
  optimal_product text,
  notion_last_edited timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_knowledge_tools_notion ON public.sales_knowledge_tools (notion_page_id);
CREATE INDEX IF NOT EXISTS idx_sales_knowledge_phases_notion ON public.sales_knowledge_phases (notion_page_id);
CREATE INDEX IF NOT EXISTS idx_sales_knowledge_diagnosis_notion ON public.sales_knowledge_diagnosis (notion_page_id);

-- RLS
ALTER TABLE public.sales_knowledge_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_knowledge_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_knowledge_diagnosis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_knowledge_tools_service_role_all ON public.sales_knowledge_tools;
CREATE POLICY sales_knowledge_tools_service_role_all
  ON public.sales_knowledge_tools FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_knowledge_phases_service_role_all ON public.sales_knowledge_phases;
CREATE POLICY sales_knowledge_phases_service_role_all
  ON public.sales_knowledge_phases FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_knowledge_diagnosis_service_role_all ON public.sales_knowledge_diagnosis;
CREATE POLICY sales_knowledge_diagnosis_service_role_all
  ON public.sales_knowledge_diagnosis FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_knowledge_tools TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_knowledge_phases TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_knowledge_diagnosis TO service_role;

NOTIFY pgrst, 'reload schema';
