-- migration_035_sales_error_log.sql
-- Sales OS error monitoring table for error-monitor.ts
-- Stores batched console.error/warn from enrichment, pipeline, and outreach flows.

CREATE TABLE IF NOT EXISTS sales_error_log (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL DEFAULT 'unknown',
  message     TEXT NOT NULL,
  stack       TEXT,
  severity    TEXT NOT NULL CHECK (severity IN ('error', 'warn')) DEFAULT 'error',
  context     JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for dashboard queries (recent errors by source)
CREATE INDEX IF NOT EXISTS idx_sales_error_log_recorded_at ON sales_error_log (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_error_log_severity ON sales_error_log (severity);
CREATE INDEX IF NOT EXISTS idx_sales_error_log_source ON sales_error_log (source);

-- Auto-cleanup: keep last 90 days
COMMENT ON TABLE sales_error_log IS 'Sales OS batched error log. Auto-purged after 90 days.';
