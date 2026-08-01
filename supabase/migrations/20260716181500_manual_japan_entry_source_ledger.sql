-- Dedicated source master for the manual Japan Entry workbench.
-- It is attribution and qualification metadata only: no collector, scheduler, or send path is created.

CREATE TABLE IF NOT EXISTS public.manual_japan_entry_source_catalog (
  slug text PRIMARY KEY,
  name text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('s_plus', 's', 'a', 'b', 'verification')),
  roles text[] NOT NULL CHECK (
    cardinality(roles) > 0
    AND roles <@ ARRAY['discovery', 'intent_trigger', 'commercial_proof', 'japan_fit', 'legal_verification', 'contact_route']::text[]
  ),
  sectors text[] NOT NULL DEFAULT ARRAY['all']::text[],
  source_url text,
  access_mode text NOT NULL CHECK (access_mode IN ('api', 'directory', 'marketplace', 'registry', 'dataset', 'manual_review')),
  priority integer NOT NULL CHECK (priority BETWEEN 1 AND 100),
  active boolean NOT NULL DEFAULT true,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.manual_japan_entry_work_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL REFERENCES public.manual_japan_entry_work(id) ON DELETE CASCADE,
  source_slug text NOT NULL REFERENCES public.manual_japan_entry_source_catalog(slug),
  source_page_url text NOT NULL DEFAULT '',
  observed_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, source_slug, source_page_url)
);

ALTER TABLE public.manual_japan_entry_work
  ADD COLUMN IF NOT EXISTS qualification_ledger jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS master_lead_ledger jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_manual_japan_entry_work_sources_work
  ON public.manual_japan_entry_work_sources (work_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_japan_entry_source_catalog_priority
  ON public.manual_japan_entry_source_catalog (active, priority, tier);

ALTER TABLE public.manual_japan_entry_source_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_japan_entry_work_sources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.manual_japan_entry_source_catalog, public.manual_japan_entry_work_sources FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_japan_entry_source_catalog, public.manual_japan_entry_work_sources TO service_role;

DROP POLICY IF EXISTS manual_japan_entry_source_catalog_service_role ON public.manual_japan_entry_source_catalog;
CREATE POLICY manual_japan_entry_source_catalog_service_role
  ON public.manual_japan_entry_source_catalog FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS manual_japan_entry_work_sources_service_role ON public.manual_japan_entry_work_sources;
CREATE POLICY manual_japan_entry_work_sources_service_role
  ON public.manual_japan_entry_work_sources FOR ALL TO service_role
  USING (true) WITH CHECK (true);

INSERT INTO public.manual_japan_entry_source_catalog
  (slug, name, tier, roles, sectors, source_url, access_mode, priority, notes)
VALUES
  ('manual_input', '手動入力・紹介', 'verification', ARRAY['discovery']::text[], ARRAY['all']::text[], NULL, 'manual_review', 1, 'Operator-supplied company URL; no external-source claim.'),
  ('defillama', 'DefiLlama API・Adapters PR・Fees/Revenue', 's_plus', ARRAY['discovery','intent_trigger','commercial_proof']::text[], ARRAY['web3']::text[], 'https://api-docs.defillama.com/', 'api', 2, 'Protocol discovery and company-specific on-chain commercial signals require separate verification.'),
  ('g2', 'G2', 's', ARRAY['discovery','commercial_proof']::text[], ARRAY['saas_ai_devtools']::text[], 'https://www.g2.com/', 'marketplace', 3, 'Mature B2B SaaS categories and reviews.'),
  ('capterra', 'Capterra', 's', ARRAY['discovery','commercial_proof']::text[], ARRAY['saas_ai_devtools']::text[], 'https://www.capterra.com/', 'marketplace', 4, 'Industry software categories and reviews.'),
  ('shopify_apps', 'Shopify App Store', 's', ARRAY['discovery','commercial_proof']::text[], ARRAY['saas_ai_devtools','ecommerce_brand']::text[], 'https://apps.shopify.com/', 'marketplace', 5, 'Apps, pricing, reviews, and developer identity.'),
  ('wordpress_plugins', 'WordPress Plugin Directory', 's', ARRAY['discovery','commercial_proof','intent_trigger']::text[], ARRAY['saas_ai_devtools']::text[], 'https://wordpress.org/plugins/', 'marketplace', 6, 'Commercial-site, paid-plan, legal-entity, and recency checks remain mandatory.'),
  ('atlassian_marketplace', 'Atlassian Marketplace', 's', ARRAY['discovery','commercial_proof','intent_trigger']::text[], ARRAY['saas_ai_devtools']::text[], 'https://marketplace.atlassian.com/', 'marketplace', 7, 'Jira and Confluence vendors, installs, reviews, and updates.'),
  ('hubspot_marketplace', 'HubSpot App Marketplace', 's', ARRAY['discovery','commercial_proof','intent_trigger']::text[], ARRAY['saas_ai_devtools']::text[], 'https://ecosystem.hubspot.com/marketplace/apps', 'marketplace', 8, 'MarTech and SalesTech apps.'),
  ('slack_marketplace', 'Slack Marketplace', 's', ARRAY['discovery','commercial_proof']::text[], ARRAY['saas_ai_devtools']::text[], 'https://slack.com/marketplace', 'marketplace', 9, 'Productivity apps and vendor security information.'),
  ('aws_marketplace', 'AWS Marketplace', 's', ARRAY['discovery','commercial_proof']::text[], ARRAY['saas_ai_devtools','cyber_b2b_infrastructure']::text[], 'https://aws.amazon.com/marketplace', 'marketplace', 10, 'B2B ISVs with a commercial sales route.'),
  ('product_hunt', 'Product Hunt', 's', ARRAY['discovery','intent_trigger']::text[], ARRAY['saas_ai_devtools','digital_education_creator']::text[], 'https://www.producthunt.com/', 'directory', 11, 'Recent launches and visible founders; listing alone is not commercial proof.'),
  ('yc_directory', 'Y Combinator Company Directory', 'a', ARRAY['discovery','intent_trigger','commercial_proof']::text[], ARRAY['saas_ai_devtools']::text[], 'https://www.ycombinator.com/companies', 'directory', 12, 'Funded founder-led companies.'),
  ('github', 'GitHub Organizations・Releases・Marketplace', 'a', ARRAY['discovery','intent_trigger']::text[], ARRAY['saas_ai_devtools','web3','cyber_b2b_infrastructure']::text[], 'https://github.com/', 'dataset', 13, 'Commercial site, legal entity, paid plan, and recent activity remain mandatory.'),
  ('ethglobal', 'ETHGlobal Showcase', 'a', ARRAY['discovery','intent_trigger']::text[], ARRAY['web3']::text[], 'https://ethglobal.com/showcase', 'directory', 14, 'Hackathon projects; legal entity and payment authority require verification.'),
  ('dune', 'Dune', 'a', ARRAY['commercial_proof']::text[], ARRAY['web3']::text[], 'https://dune.com/', 'dataset', 15, 'On-chain usage evidence; do not infer legal entity or payment ability.'),
  ('crypto_valley', 'Crypto Valley Association Directory', 'a', ARRAY['discovery','legal_verification']::text[], ARRAY['web3','regional_company']::text[], 'https://cryptovalley.swiss/corporate-directory/', 'directory', 16, 'Swiss Web3 corporate discovery; official registry confirmation remains separate.'),
  ('sfa_fintech', 'Singapore FinTech Association Registry', 'a', ARRAY['discovery','legal_verification']::text[], ARRAY['web3','regional_company']::text[], 'https://singaporefintech.org/', 'directory', 17, 'Singapore FinTech discovery and category context.'),
  ('store_leads', 'Store Leads', 's', ARRAY['discovery','commercial_proof']::text[], ARRAY['ecommerce_brand']::text[], 'https://storeleads.app/', 'dataset', 18, 'Paid ecommerce technology and store data; estimates must stay labeled.'),
  ('builtwith', 'BuiltWith', 's', ARRAY['discovery','commercial_proof']::text[], ARRAY['ecommerce_brand']::text[], 'https://builtwith.com/', 'dataset', 19, 'Technology and commerce-stack signals.'),
  ('wappalyzer', 'Wappalyzer', 's', ARRAY['discovery','commercial_proof']::text[], ARRAY['ecommerce_brand']::text[], 'https://www.wappalyzer.com/', 'dataset', 20, 'Technology, industry, region, and traffic filters.'),
  ('similarweb', 'Similarweb', 'a', ARRAY['commercial_proof','japan_fit']::text[], ARRAY['all']::text[], 'https://www.similarweb.com/website/', 'dataset', 21, 'Traffic figures are modeled estimates, never measured first-party analytics.'),
  ('trade_shows_design', '3daysofdesign・Formex・Formland・Salone', 's', ARRAY['discovery','intent_trigger']::text[], ARRAY['ecommerce_brand']::text[], 'https://www.3daysofdesign.dk/exhibitions', 'directory', 22, 'Official exhibitor directories for design brands.'),
  ('maison_ambiente', 'Maison&Objet・Ambiente', 's', ARRAY['discovery','intent_trigger']::text[], ARRAY['ecommerce_brand']::text[], 'https://www.maison-objet.com/en/paris/exhibitors', 'directory', 23, 'Furniture, decor, lifestyle, and consumer-goods exhibitors.'),
  ('eurobike', 'Eurobike Exhibitor Search', 's', ARRAY['discovery','intent_trigger']::text[], ARRAY['ecommerce_brand']::text[], 'https://eurobike.com/frankfurt/en/exhibitor-search.html', 'directory', 24, 'Cycling brands and exhibitors.'),
  ('design_awards', 'Red Dot・iF・Dezeen Awards', 'a', ARRAY['discovery','commercial_proof']::text[], ARRAY['ecommerce_brand']::text[], NULL, 'directory', 25, 'Award evidence does not replace company and commerce verification.'),
  ('crowdfunding', 'Kickstarter・Indiegogo', 'a', ARRAY['discovery','intent_trigger','commercial_proof']::text[], ARRAY['ecommerce_brand','digital_education_creator']::text[], NULL, 'marketplace', 26, 'Independent domain and official inquiry form are mandatory.'),
  ('themeforest_codecanyon', 'ThemeForest・CodeCanyon', 'a', ARRAY['discovery','commercial_proof']::text[], ARRAY['digital_education_creator','saas_ai_devtools']::text[], 'https://themeforest.net/', 'marketplace', 27, 'Themes, plugins, scripts, product count, and price signals.'),
  ('creative_market', 'Creative Market', 'a', ARRAY['discovery','commercial_proof']::text[], ARRAY['digital_education_creator']::text[], 'https://creativemarket.com/', 'marketplace', 28, 'Fonts, graphics, templates, and creator storefronts.'),
  ('gumroad', 'Gumroad Discover', 'a', ARRAY['discovery','commercial_proof']::text[], ARRAY['digital_education_creator']::text[], 'https://gumroad.com/discover', 'marketplace', 29, 'Independent website and company contact route remain mandatory.'),
  ('figma_community', 'Figma Community', 'a', ARRAY['discovery','intent_trigger']::text[], ARRAY['digital_education_creator','saas_ai_devtools']::text[], 'https://www.figma.com/community', 'marketplace', 30, 'Plugins and design assets; paid commercial site must be verified.'),
  ('unity_fab', 'Unity Asset Store・Fab', 'a', ARRAY['discovery','commercial_proof']::text[], ARRAY['digital_education_creator','gaming_tools']::text[], NULL, 'marketplace', 31, 'Game and 3D assets.'),
  ('education_media', 'Udemy・Substack・AppSumo', 'a', ARRAY['discovery','commercial_proof','intent_trigger']::text[], ARRAY['digital_education_creator','saas_ai_devtools']::text[], NULL, 'marketplace', 32, 'Prioritize paid catalog, independent domain, and missing Japanese edition.'),
  ('regional_directories', 'Startup.ch・The Hub・Startup SG・Hub71', 'a', ARRAY['discovery','intent_trigger']::text[], ARRAY['regional_company','saas_ai_devtools']::text[], 'https://www.startup.ch/startup-directory', 'directory', 33, 'Regional discovery; official registry verification remains separate.'),
  ('official_company_registries', 'Companies House・Zefix・EU e-Justice・ABN Lookup', 'verification', ARRAY['legal_verification']::text[], ARRAY['all']::text[], 'https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-search-company-eu/general-information-find-company_en', 'registry', 34, 'Use for contract entity, address, and active status; not discovery.'),
  ('google_trends', 'Google Trends', 'verification', ARRAY['japan_fit']::text[], ARRAY['all']::text[], 'https://trends.google.com/', 'dataset', 35, 'Relative Japan search interest; not absolute demand or revenue.'),
  ('crux', 'Chrome UX Report', 'verification', ARRAY['commercial_proof','japan_fit']::text[], ARRAY['all']::text[], 'https://developer.chrome.com/docs/crux/bigquery', 'dataset', 36, 'Domain-level usage reference; not first-party analytics.'),
  ('common_crawl', 'Common Crawl', 'verification', ARRAY['discovery','japan_fit','contact_route']::text[], ARRAY['all']::text[], 'https://commoncrawl.org/', 'dataset', 37, 'URL discovery and public mentions require page-level verification.'),
  ('tranco', 'Tranco', 'verification', ARRAY['commercial_proof','japan_fit']::text[], ARRAY['all']::text[], 'https://tranco-list.eu/', 'dataset', 38, 'Relative domain rank used only for modeled opportunity inputs.'),
  ('official_company_site', '企業公式サイト・sitemap・JSON-LD', 'verification', ARRAY['commercial_proof','japan_fit','legal_verification','contact_route']::text[], ARRAY['all']::text[], NULL, 'manual_review', 39, 'Primary source for product wording, legal-page clues, and verified inquiry forms.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  roles = EXCLUDED.roles,
  sectors = EXCLUDED.sectors,
  source_url = EXCLUDED.source_url,
  access_mode = EXCLUDED.access_mode,
  priority = EXCLUDED.priority,
  active = EXCLUDED.active,
  notes = EXCLUDED.notes,
  updated_at = now();

COMMENT ON TABLE public.manual_japan_entry_source_catalog IS
  'Manual workbench source master. Catalog presence never proves a company-specific trigger, commercial signal, Japan demand, or legal entity.';
COMMENT ON TABLE public.manual_japan_entry_work_sources IS
  'Many-to-one source attribution retained by root-domain work item; no collector or outreach sender is triggered.';

NOTIFY pgrst, 'reload schema';
