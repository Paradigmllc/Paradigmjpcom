-- migration_062_sales_dns_freshness_lane.sql
-- Adds the global SMB fresh-domain acquisition lane without introducing a new table.

ALTER TABLE public.sales_lead_candidate_domains
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_domains_lane_check;

ALTER TABLE public.sales_lead_candidate_domains
  ADD CONSTRAINT sales_lead_candidate_domains_lane_check CHECK (
    lane IN ('tech_footprint', 'no_website_local_smb', 'dns_freshness')
  );

ALTER TABLE public.sales_lead_candidate_runs
  DROP CONSTRAINT IF EXISTS sales_lead_candidate_runs_lane_check;

ALTER TABLE public.sales_lead_candidate_runs
  ADD CONSTRAINT sales_lead_candidate_runs_lane_check CHECK (
    lane IN ('tech_footprint', 'no_website_local_smb', 'dns_freshness')
  );

COMMENT ON TABLE public.sales_lead_candidate_domains IS
  'Raw lead candidate domains for tech-footprint, local-SMB, and DNS-freshness acquisition lanes. DNS freshness treats domain registration/update feeds as timing signals, not as contact databases.';
