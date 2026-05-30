-- Sales OS completion pass: readable product master and operator approval metadata.

insert into public.sales_products
  (code, display_name, market_scope, template_variant, default_currency, default_amount_yen, is_subscription, description, sort_order, meta)
values
  (
    'jp_web_production',
    'Web制作',
    'jp',
    'website_diagnostic',
    'JPY',
    450000,
    false,
    '診断レポートとAstro差し替えデモを起点にした日本向けWeb制作パッケージ。',
    10,
    '{"primary_market":"japan","delivery":"nextjs_or_astro"}'::jsonb
  ),
  (
    'jp_dx_package',
    'DXパッケージ',
    'jp',
    'outreach',
    'JPY',
    650000,
    false,
    '営業自動化、業務改善、AI導入をまとめた日本向けDXパッケージ。',
    20,
    '{"primary_market":"japan","delivery":"n8n_dify_supabase"}'::jsonb
  ),
  (
    'global_jaas',
    'Japan Entry Package (JaaS)',
    'global',
    'japan_entry',
    'JPY',
    300000,
    false,
    '海外SMB向けの日本市場参入パッケージ。調査、ローカライズ、LP、営業導線をまとめて提供する。',
    30,
    '{"primary_market":"global","delivery":"lp_localization_ops"}'::jsonb
  ),
  (
    'global_video_subscription',
    '動画納品サブスク',
    'global',
    'video_subscription',
    'JPY',
    250000,
    true,
    '海外SMB向けの継続動画制作パッケージ。Remotion/OpenMontage/R2配信を前提に短尺動画を継続納品する。',
    40,
    '{"primary_market":"global","delivery":"remotion_openmontage_r2"}'::jsonb
  )
on conflict (code) do update set
  display_name = excluded.display_name,
  market_scope = excluded.market_scope,
  template_variant = excluded.template_variant,
  default_currency = excluded.default_currency,
  default_amount_yen = excluded.default_amount_yen,
  is_subscription = excluded.is_subscription,
  description = excluded.description,
  sort_order = excluded.sort_order,
  meta = public.sales_products.meta || excluded.meta,
  updated_at = now();

comment on table public.sales_company_product_recommendations is
  'Supabase SSOT ledger that turns completed company karte analysis into Twenty opportunities for the four primary products.';

comment on column public.sales_operator_queue_items.meta is
  'Includes form_url, generated message, approval_required, report_url, and automation reason for Appsmith/manual review.';
