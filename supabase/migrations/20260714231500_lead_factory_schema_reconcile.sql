-- Reconcile lead candidate tables that may predate migrations 047/048.
-- Existing CREATE TABLE IF NOT EXISTS statements cannot add missing arbiters.

ALTER TABLE public.sales_lead_candidate_runs
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_lead_candidate_domains_domain
  ON public.sales_lead_candidate_domains(domain);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_lead_candidate_run_items_run_domain
  ON public.sales_lead_candidate_run_items(run_id, domain);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_lead_candidate_tech_detection_identity
  ON public.sales_lead_candidate_tech_detections(candidate_id, technology_slug, source_slug, evidence_type);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_lead_candidate_scores_candidate
  ON public.sales_lead_candidate_scores(candidate_id);

NOTIFY pgrst, 'reload schema';
