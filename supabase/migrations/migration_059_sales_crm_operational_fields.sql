-- Keep Sales CRM SSOT aligned with RevenueOS/Twenty operational columns.

insert into public.sales_crm_view_fields
  (field_key, twenty_field_name, label, position, is_visible, field_type, description)
values
  ('name', 'name', 'Name', 0, true, 'text', '企業名'),
  ('domain', 'domainName', 'Domain Name', 1, true, 'text', 'Webサイトドメイン'),
  ('country', 'paradigmCountryName', '国名', 2, true, 'select', '対象国'),
  ('source_coverage', 'paradigmSourceCoverage', 'Source Coverage', 3, true, 'text', '0-100 coverage score across RevenueOS API/OSS sources'),
  ('data_sources', 'paradigmDataSources', 'Data Sources', 4, true, 'text', 'Collected/configured/missing/error source counts'),
  ('data_status', 'paradigmDataStatus', 'Data Status', 5, true, 'text', 'RevenueOS readiness and data collection state'),
  ('next_action', 'paradigmNextAction', 'Next Action', 6, true, 'text', 'Next required pipeline action'),
  ('last_error', 'paradigmLastError', 'Last Error', 7, true, 'text', 'Latest source or pipeline error summary'),
  ('sales_status', 'paradigmSalesStatus', '営業ステータス', 8, true, 'select', '営業の現在地'),
  ('form_url', 'paradigmFormUrl', 'フォームURL', 9, true, 'url', 'フォーム営業対象URL'),
  ('report_url', 'paradigmReportUrl', '診断レポートURL', 10, true, 'url', '顧客向け診断ページ'),
  ('region', 'paradigmRegionName', '地域名', 11, true, 'text', '国別の地域候補はSales OSの選択肢マスタで管理し、Twentyには確定した地域名だけを表示'),
  ('industry', 'paradigmIndustryName', '業種名', 12, true, 'select', '営業テンプレ選定に使う業種'),
  ('source', 'paradigmSourceName', 'ソース元', 13, true, 'select', 'Apollo、Fumadataなどの取得元'),
  ('sales_material_url', 'paradigmSalesMaterialUrl', '営業資料URL', 14, true, 'url', 'Slidev/Gotenberg資料'),
  ('demo_url', 'paradigmDemoUrl', 'デモURL', 15, true, 'url', 'Astroデモサイト'),
  ('customer_portal_url', 'paradigmCustomerPortalUrl', '顧客用Notion URL', 16, true, 'url', '成約後の顧客ポータル')
on conflict (field_key) do update set
  twenty_field_name = excluded.twenty_field_name,
  label = excluded.label,
  position = excluded.position,
  is_visible = excluded.is_visible,
  field_type = excluded.field_type,
  description = excluded.description,
  updated_at = now();

insert into public.sales_crm_select_options
  (field_key, value, label, country_code, position, color)
values
  ('country', '南アフリカ', '南アフリカ', 'ZA', 11, 'green'),
  ('country', '英国', '英国', 'GB', 12, 'blue'),
  ('country', 'カナダ', 'カナダ', 'CA', 13, 'blue'),
  ('country', 'オーストラリア', 'オーストラリア', 'AU', 14, 'yellow'),
  ('country', 'インド', 'インド', 'IN', 15, 'orange'),
  ('country', 'シンガポール', 'シンガポール', 'SG', 16, 'cyan'),
  ('country', 'ベトナム', 'ベトナム', 'VN', 17, 'green'),
  ('country', 'インドネシア', 'インドネシア', 'ID', 18, 'green')
on conflict (field_key, value) do update set
  label = excluded.label,
  country_code = excluded.country_code,
  position = excluded.position,
  color = excluded.color,
  is_active = true,
  updated_at = now();
