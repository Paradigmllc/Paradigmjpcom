-- Sales OS: allow DX/AI package as a first-class diagnostic template variant.

ALTER TABLE sales_companies DROP CONSTRAINT IF EXISTS sales_companies_template_variant_check;
ALTER TABLE sales_companies ADD CONSTRAINT sales_companies_template_variant_check
  CHECK (template_variant IN (
    'website_diagnostic',
    'meo',
    'security',
    'japan_entry',
    'video_subscription',
    'subsidy',
    'outreach',
    'dx_ai_package'
  ));

ALTER TABLE sales_templates DROP CONSTRAINT IF EXISTS sales_templates_template_variant_check;
ALTER TABLE sales_templates ADD CONSTRAINT sales_templates_template_variant_check
  CHECK (template_variant IN (
    'website_diagnostic',
    'meo',
    'security',
    'japan_entry',
    'video_subscription',
    'subsidy',
    'outreach',
    'dx_ai_package'
  ));

ALTER TABLE public.sales_content_templates DROP CONSTRAINT IF EXISTS sales_content_templates_template_variant_check;
ALTER TABLE public.sales_content_templates ADD CONSTRAINT sales_content_templates_template_variant_check
  CHECK (template_variant IN (
    'website_diagnostic',
    'meo',
    'security',
    'japan_entry',
    'video_subscription',
    'subsidy',
    'outreach',
    'dx_ai_package'
  ));

COMMENT ON COLUMN sales_companies.template_variant IS
  'Diagnostic template variant: website_diagnostic/meo/security/japan_entry/video_subscription/subsidy/outreach/dx_ai_package.';
COMMENT ON COLUMN sales_templates.template_variant IS
  'Template variant matched against sales_companies.template_variant.';
COMMENT ON COLUMN public.sales_content_templates.template_variant IS
  'Content template variant for diagnostic reports, demos, decks, and videos.';
