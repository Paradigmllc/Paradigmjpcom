-- Versioned lead-source packs make country expansion reproducible without
-- bypassing terms review, preview, approval, ingestion, or website preflight.

ALTER TABLE public.sales_lead_source_configs
  ADD COLUMN IF NOT EXISTS source_pack_id text,
  ADD COLUMN IF NOT EXISTS source_pack_version integer,
  ADD COLUMN IF NOT EXISTS source_license_name text,
  ADD COLUMN IF NOT EXISTS source_license_url text,
  ADD COLUMN IF NOT EXISTS source_pack_query_sha256 text;

ALTER TABLE public.sales_lead_source_configs
  DROP CONSTRAINT IF EXISTS sales_lead_source_configs_format_check;
ALTER TABLE public.sales_lead_source_configs
  ADD CONSTRAINT sales_lead_source_configs_format_check CHECK (
    source_format IN ('json', 'jsonl', 'csv', 'html', 'zip_csv')
  );

ALTER TABLE public.sales_lead_source_records
  ADD COLUMN IF NOT EXISTS is_sme boolean;

ALTER TABLE public.sales_lead_source_configs
  DROP CONSTRAINT IF EXISTS sales_lead_source_configs_pack_metadata_check;
ALTER TABLE public.sales_lead_source_configs
  ADD CONSTRAINT sales_lead_source_configs_pack_metadata_check CHECK (
    (
      source_pack_id IS NULL
      AND source_pack_version IS NULL
      AND source_license_name IS NULL
      AND source_license_url IS NULL
      AND source_pack_query_sha256 IS NULL
    )
    OR (
      source_pack_id ~ '^[a-z0-9][a-z0-9-]{2,99}$'
      AND source_pack_version BETWEEN 1 AND 1000000
      AND length(trim(source_license_name)) BETWEEN 2 AND 120
      AND source_license_url ~ '^https://'
      AND source_pack_query_sha256 ~ '^[a-f0-9]{64}$'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_lead_source_configs_pack_version
  ON public.sales_lead_source_configs(source_pack_id, source_pack_version)
  WHERE source_pack_id IS NOT NULL;

COMMENT ON COLUMN public.sales_lead_source_configs.source_pack_id IS
  'Version-controlled source preset identifier. Registration always remains draft until the normal operator gates are completed.';
COMMENT ON COLUMN public.sales_lead_source_configs.source_pack_query_sha256 IS
  'SHA-256 of the bounded source query, used to detect catalog drift without executing collection.';
COMMENT ON COLUMN public.sales_lead_source_records.is_sme IS
  'Official or licensed source-level SME classification. It is never inferred from a company name or domain.';

CREATE TABLE IF NOT EXISTS public.sales_lead_inventory_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'queued',
  operator_name text NOT NULL,
  source_config_ids uuid[] NOT NULL,
  completed_source_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  current_source_id uuid REFERENCES public.sales_lead_source_configs(id) ON DELETE SET NULL,
  source_count integer NOT NULL,
  completed_source_count integer NOT NULL DEFAULT 0,
  ingested_count integer NOT NULL DEFAULT 0,
  eligible_count integer NOT NULL DEFAULT 0,
  retryable_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  failure_count integer NOT NULL DEFAULT 0,
  failures jsonb NOT NULL DEFAULT '[]'::jsonb,
  send_count integer NOT NULL DEFAULT 0,
  twenty_sync_count integer NOT NULL DEFAULT 0,
  error_message text,
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_lead_inventory_runs_status_check CHECK (status IN ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')),
  CONSTRAINT sales_lead_inventory_runs_sources_check CHECK (source_count BETWEEN 1 AND 100 AND cardinality(source_config_ids) = source_count),
  CONSTRAINT sales_lead_inventory_runs_counts_check CHECK (
    completed_source_count >= 0 AND ingested_count >= 0 AND eligible_count >= 0
    AND retryable_count >= 0 AND rejected_count >= 0 AND failure_count >= 0
  ),
  CONSTRAINT sales_lead_inventory_runs_no_delivery_check CHECK (send_count = 0 AND twenty_sync_count = 0)
);

CREATE INDEX IF NOT EXISTS idx_sales_lead_inventory_runs_created
  ON public.sales_lead_inventory_runs(created_at DESC);

DROP TRIGGER IF EXISTS trg_sales_lead_inventory_runs_touch ON public.sales_lead_inventory_runs;
CREATE TRIGGER trg_sales_lead_inventory_runs_touch
BEFORE UPDATE ON public.sales_lead_inventory_runs
FOR EACH ROW EXECUTE FUNCTION public.sales_touch_updated_at();

ALTER TABLE public.sales_lead_inventory_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sales_lead_inventory_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_lead_inventory_runs TO service_role;
DROP POLICY IF EXISTS "sales_lead_inventory_runs service role access" ON public.sales_lead_inventory_runs;
CREATE POLICY "sales_lead_inventory_runs service role access"
  ON public.sales_lead_inventory_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMENT ON TABLE public.sales_lead_inventory_runs IS
  'Resumable non-delivery runs that ingest approved source packs and verify live company websites. Send and Twenty counters are constrained to zero.';

NOTIFY pgrst, 'reload schema';
