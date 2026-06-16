-- ============================================================
-- migration_057_sales_atomic_meta_functions.sql
-- Date: 2026-06-16
-- Purpose: Atomic JSONB meta merge functions to prevent TOCTOU
--          race conditions when multiple concurrent writes target
--          the same sales_companies row.
--
-- Rationale:
--   SELECT meta -> JS merge -> UPDATE meta creates a race window
--   where two concurrent callers can silently lose each other's data.
--   These functions perform the merge inside a single atomic UPDATE
--   so no JS-level read is needed before the write.
-- ============================================================

-- 1. Generic atomic shallow merge for sales_companies.meta
--    Usage: SELECT sales_atomic_meta_merge('company-uuid', '{"demo_site":{"url":"..."}}'::jsonb);
CREATE OR REPLACE FUNCTION sales_atomic_meta_merge(
  p_company_id UUID,
  p_patch      JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE public.sales_companies
  SET meta = COALESCE(meta, '{}'::jsonb) || p_patch
  WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- 2. Atomic form_message_history prepend + shallow field write
--    Single UPDATE avoids the SELECT -> push -> UPDATE race.
CREATE OR REPLACE FUNCTION sales_atomic_meta_history_prepend(
  p_company_id   UUID,
  p_message      TEXT,
  p_engine       TEXT,
  p_generated_at TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.sales_companies
  SET meta = 
    COALESCE(meta, '{}'::jsonb)
    || jsonb_build_object(
      'form_message',            p_message,
      'form_message_engine',     p_engine,
      'form_message_generated_at', p_generated_at,
      'form_message_history',
      jsonb_build_array(
        jsonb_build_object(
          'message',      p_message,
          'engine',       p_engine,
          'generated_at', p_generated_at
        )
      ) || COALESCE(meta->'form_message_history', '[]'::jsonb)
    )
  WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

-- 3. Atomic screenshot evidence append into visual_evidence.screenshots.{viewport}
--    Deep-merges the screenshot entry while preserving other screenshots and top-level
--    meta keys from concurrent writers.  Single UPDATE — no JS-level read-then-write.
CREATE OR REPLACE FUNCTION sales_atomic_screenshot_append(
  p_company_id UUID,
  p_viewport   TEXT,
  p_screenshot JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE public.sales_companies
  SET meta = 
    COALESCE(meta, '{}'::jsonb)
    || jsonb_build_object(
      'screenshot_provider', p_screenshot->>'provider',
      'screenshot_url',
        CASE WHEN p_viewport = 'desktop'
          THEN p_screenshot->>'url'
          ELSE meta->>'screenshot_url'
        END,
      'screenshot_captured_at',
        CASE WHEN p_viewport = 'desktop'
          THEN p_screenshot->>'captured_at'
          ELSE meta->>'screenshot_captured_at'
        END,
      'visual_evidence',
      jsonb_set(
        jsonb_set(
          COALESCE(meta->'visual_evidence', '{}'::jsonb),
          '{last_refreshed_at}',
          p_screenshot->'captured_at',
          true
        ),
        '{screenshots,' || p_viewport || '}',
        p_screenshot,
        true
      )
    )
  WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

NOTIFY pgrst, 'reload schema';
