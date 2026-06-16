-- migration_055_sales_operator_queue_column_repair.sql
-- RevenueOS audit fix: Repair sales_operator_queue_items columns that may be
-- missing if migration_053 ran on a fresh database without migration_009.
-- All operations are idempotent (IF NOT EXISTS / IF EXISTS patterns).

-- Add columns that exist in migration_009 but may be missing from migration_053 bootstrap
ALTER TABLE public.sales_operator_queue_items
  ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'jp';

ALTER TABLE public.sales_operator_queue_items
  ADD COLUMN IF NOT EXISTS queue_type text;

-- Backfill queue_type for existing rows that lack it (safe default for unknown items)
UPDATE public.sales_operator_queue_items
  SET queue_type = 'form_send'
  WHERE queue_type IS NULL;

ALTER TABLE public.sales_operator_queue_items
  ALTER COLUMN queue_type SET NOT NULL;

ALTER TABLE public.sales_operator_queue_items
  ADD COLUMN IF NOT EXISTS assigned_to text;

ALTER TABLE public.sales_operator_queue_items
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Ensure title is nullable (migration_009 did NOT have title; 053 added it as NOT NULL)
-- If title was created as NOT NULL by 053 but rows lack values, set a default first
UPDATE public.sales_operator_queue_items
  SET title = COALESCE(title, queue_type, 'unknown')
  WHERE title IS NULL;

-- Attempt to relax NOT NULL on title if needed (will fail gracefully if already nullable)
DO $$ BEGIN
  ALTER TABLE public.sales_operator_queue_items ALTER COLUMN title DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Ensure status CHECK constraint matches code expectations
DO $$ BEGIN
  ALTER TABLE public.sales_operator_queue_items DROP CONSTRAINT IF EXISTS sales_operator_queue_items_status_check;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.sales_operator_queue_items
    ADD CONSTRAINT sales_operator_queue_items_status_check
    CHECK (status IN ('open', 'in_progress', 'blocked', 'done', 'cancelled'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
