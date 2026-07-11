-- Default-deny Supabase REST access for the legacy public schema.
-- The Next.js server uses service_role for these tables; no browser code should
-- receive a direct anon/authenticated table grant.

BEGIN;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN
    SELECT c.relname
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS paradigm_service_role_all ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY paradigm_service_role_all ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      table_name
    );
  END LOOP;
END;
$$;

-- These tables are written with upsert(onConflict: slug). Fail loudly if
-- production contains duplicates rather than silently choosing an arbitrary row.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.sales_integration_status
    GROUP BY slug HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'sales_integration_status contains duplicate slug values; clean them before migration_071';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sales_tool_connections
    GROUP BY slug HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'sales_tool_connections contains duplicate slug values; clean them before migration_071';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.sales_integration_status'::regclass
      AND contype IN ('p', 'u')
      AND conname = 'sales_integration_status_slug_key'
  ) THEN
    ALTER TABLE public.sales_integration_status
      ADD CONSTRAINT sales_integration_status_slug_key UNIQUE (slug);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.sales_tool_connections'::regclass
      AND contype IN ('p', 'u')
      AND conname = 'sales_tool_connections_slug_key'
  ) THEN
    ALTER TABLE public.sales_tool_connections
      ADD CONSTRAINT sales_tool_connections_slug_key UNIQUE (slug);
  END IF;
END;
$$;

COMMIT;

