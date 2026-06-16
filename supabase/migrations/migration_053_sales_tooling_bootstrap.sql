-- migration_053_sales_tooling_bootstrap.sql
-- Minimal idempotent bootstrap for Sales OS tooling tables on Cloud Supabase.

CREATE TABLE IF NOT EXISTS public.sales_tool_connections (
  slug text PRIMARY KEY,
  display_name text NOT NULL,
  role text NOT NULL,
  interface_type text NOT NULL,
  deployment_type text NOT NULL,
  base_url text,
  health_url text,
  status text NOT NULL DEFAULT 'planned',
  owner text NOT NULL DEFAULT 'Paradigm',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_tool_connections_status_check
    CHECK (status IN ('active', 'planned', 'disabled', 'error')),
  CONSTRAINT sales_tool_connections_interface_type_check
    CHECK (interface_type IN ('database', 'spreadsheet', 'operator_console', 'crm', 'bi', 'automation', 'calendar', 'contract', 'inbox', 'voice', 'browser', 'crawler', 'ai', 'search'))
);

CREATE INDEX IF NOT EXISTS idx_sales_tool_connections_status
  ON public.sales_tool_connections (status);

CREATE TABLE IF NOT EXISTS public.sales_operator_queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.sales_companies (id) ON DELETE SET NULL,
  source_tool text REFERENCES public.sales_tool_connections (slug) ON DELETE SET NULL,
  target_tool text REFERENCES public.sales_tool_connections (slug) ON DELETE SET NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority integer NOT NULL DEFAULT 50,
  due_at timestamptz,
  pipeline_run_id uuid REFERENCES public.sales_pipeline_runs (id) ON DELETE SET NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_operator_queue_items_status_check
    CHECK (status IN ('open', 'in_progress', 'blocked', 'done', 'cancelled')),
  CONSTRAINT sales_operator_queue_items_priority_check
    CHECK (priority BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_sales_operator_queue_status
  ON public.sales_operator_queue_items (status, priority DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_operator_queue_company
  ON public.sales_operator_queue_items (company_id);
CREATE INDEX IF NOT EXISTS idx_sales_operator_queue_due
  ON public.sales_operator_queue_items (due_at)
  WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_operator_queue_pipeline
  ON public.sales_operator_queue_items (pipeline_run_id, status, priority DESC)
  WHERE pipeline_run_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sales_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_campaigns_status_check
    CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled'))
);

DROP TRIGGER IF EXISTS trg_sales_tool_connections_touch ON public.sales_tool_connections;
CREATE TRIGGER trg_sales_tool_connections_touch
BEFORE UPDATE ON public.sales_tool_connections
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sales_operator_queue_items_touch ON public.sales_operator_queue_items;
CREATE TRIGGER trg_sales_operator_queue_items_touch
BEFORE UPDATE ON public.sales_operator_queue_items
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sales_campaigns_touch ON public.sales_campaigns;
CREATE TRIGGER trg_sales_campaigns_touch
BEFORE UPDATE ON public.sales_campaigns
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

ALTER TABLE public.sales_tool_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_operator_queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_tool_connections_service_role_all ON public.sales_tool_connections;
CREATE POLICY sales_tool_connections_service_role_all
  ON public.sales_tool_connections FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_operator_queue_items_service_role_all ON public.sales_operator_queue_items;
CREATE POLICY sales_operator_queue_items_service_role_all
  ON public.sales_operator_queue_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_campaigns_service_role_all ON public.sales_campaigns;
CREATE POLICY sales_campaigns_service_role_all
  ON public.sales_campaigns FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_tool_connections TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_operator_queue_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_campaigns TO service_role;

INSERT INTO public.sales_tool_connections
  (slug, display_name, role, interface_type, deployment_type, base_url, health_url, status, owner, meta)
VALUES
  ('supabase', 'Supabase Cloud', 'RevenueOS SSOT: companies, candidate runs, pipeline runs, reports, and audit logs.', 'database', 'cloud', 'https://yihdmgtxiqfdgdueolub.supabase.co', 'https://yihdmgtxiqfdgdueolub.supabase.co/rest/v1/', 'active', 'Paradigm', '{"source_of_truth":true}'::jsonb),
  ('twenty', 'Twenty OSS', 'CRM projection and bidirectional relationship layer synchronized from Supabase SSOT.', 'crm', 'oss_self_hosted', 'https://twenty.paradigmjp.com', NULL, 'active', 'Paradigm', '{"sync_mode":"supabase_ssot_projection"}'::jsonb),
  ('trigger-dev', 'Trigger.dev', 'Durable background orchestration for lead candidate collection, enrichment, report generation, and CRM sync.', 'automation', 'cloud', NULL, NULL, 'active', 'Paradigm', '{"primary_orchestrator":true}'::jsonb),
  ('dify', 'Dify Cloud', 'Copy, diagnosis, and form-message generation workflows.', 'ai', 'cloud', 'https://api.dify.ai', NULL, 'active', 'Paradigm', '{"workflow_copy_generation":true}'::jsonb),
  ('crawl4ai', 'Crawl4AI OSS', 'Form URL and page evidence extraction without paid browser APIs.', 'crawler', 'oss_self_hosted', 'http://crawl4ai:11235', 'http://crawl4ai:11235/health', 'active', 'Paradigm', '{"internal_network":true}'::jsonb),
  ('searxng', 'SearXNG OSS', 'Supplemental search lane only; not the primary BuiltWith-style passive inventory source.', 'search', 'oss_self_hosted', 'http://searxng:8080', 'http://searxng:8080/healthz', 'active', 'Paradigm', '{"supplemental_only":true}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  interface_type = EXCLUDED.interface_type,
  deployment_type = EXCLUDED.deployment_type,
  base_url = COALESCE(public.sales_tool_connections.base_url, EXCLUDED.base_url),
  health_url = COALESCE(public.sales_tool_connections.health_url, EXCLUDED.health_url),
  status = EXCLUDED.status,
  owner = EXCLUDED.owner,
  meta = public.sales_tool_connections.meta || EXCLUDED.meta,
  updated_at = now();

NOTIFY pgrst, 'reload schema';
