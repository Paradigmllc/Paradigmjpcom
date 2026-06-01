create table if not exists public.sales_crm_view_fields (
  id uuid primary key default gen_random_uuid(),
  field_key text not null unique,
  twenty_field_name text not null,
  label text not null,
  position integer not null default 0,
  is_visible boolean not null default true,
  field_type text not null default 'text' check (field_type in ('text', 'url', 'select', 'multi_select')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_crm_select_options (
  id uuid primary key default gen_random_uuid(),
  field_key text not null,
  value text not null,
  label text not null,
  country_code text,
  position integer not null default 0,
  is_active boolean not null default true,
  color text not null default 'gray',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (field_key, value)
);

create index if not exists idx_sales_crm_select_options_field
  on public.sales_crm_select_options (field_key, is_active, country_code, position);

alter table public.sales_crm_view_fields enable row level security;
alter table public.sales_crm_select_options enable row level security;

drop policy if exists sales_crm_view_fields_service_only on public.sales_crm_view_fields;
create policy sales_crm_view_fields_service_only
  on public.sales_crm_view_fields
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists sales_crm_select_options_service_only on public.sales_crm_select_options;
create policy sales_crm_select_options_service_only
  on public.sales_crm_select_options
  for all
  to service_role
  using (true)
  with check (true);

insert into public.sales_crm_view_fields
  (field_key, twenty_field_name, label, position, is_visible, field_type, description)
values
  ('name', 'name', 'Name', 0, true, 'text', '企業名'),
  ('domain', 'domainName', 'Domain Name', 1, true, 'text', 'Webサイトドメイン'),
  ('sales_status', 'paradigmSalesStatus', '営業ステータス', 2, true, 'select', '営業の現在地'),
  ('country', 'paradigmCountryName', '国名', 3, true, 'select', '対象国'),
  ('region', 'paradigmRegionName', '地域名', 4, true, 'text', '国別の地域候補はSales OSの選択肢マスタで管理し、Twentyには確定した地域名だけを表示'),
  ('industry', 'paradigmIndustryName', '業種名', 5, true, 'select', '営業テンプレ選定に使う業種'),
  ('source', 'paradigmSourceName', 'ソース元', 6, true, 'select', 'Apollo、Fumadataなどの取得元'),
  ('form_url', 'paradigmFormUrl', 'フォームURL', 7, true, 'url', 'フォーム営業対象URL'),
  ('report_url', 'paradigmReportUrl', '診断レポートURL', 8, true, 'url', '顧客向け診断ページ'),
  ('sales_material_url', 'paradigmSalesMaterialUrl', '営業資料URL', 9, true, 'url', 'Slidev/Gotenberg資料'),
  ('demo_url', 'paradigmDemoUrl', 'デモURL', 10, true, 'url', 'Astroデモサイト'),
  ('customer_portal_url', 'paradigmCustomerPortalUrl', '顧客用Notion URL', 11, true, 'url', '成約後の顧客ポータル')
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
  ('country', '日本', '日本', 'JP', 0, 'green'),
  ('country', '米国', '米国', 'US', 1, 'blue'),
  ('country', '韓国', '韓国', 'KR', 2, 'purple'),
  ('country', '中国', '中国', 'CN', 3, 'red'),
  ('country', '台湾', '台湾', 'TW', 4, 'cyan'),
  ('country', 'ドイツ', 'ドイツ', 'DE', 5, 'yellow'),
  ('country', 'フランス', 'フランス', 'FR', 6, 'pink'),
  ('country', 'スペイン', 'スペイン', 'ES', 7, 'orange'),
  ('country', 'ポルトガル', 'ポルトガル', 'PT', 8, 'orange'),
  ('country', 'ロシア', 'ロシア', 'RU', 9, 'gray'),
  ('country', 'UAE', 'UAE', 'AE', 10, 'teal'),
  ('country', 'ベトナム', 'ベトナム', 'VN', 11, 'green'),
  ('country', 'インドネシア', 'インドネシア', 'ID', 12, 'green'),
  ('region', '北海道', '北海道', 'JP', 0, 'green'),
  ('region', '青森県', '青森県', 'JP', 1, 'green'),
  ('region', '岩手県', '岩手県', 'JP', 2, 'green'),
  ('region', '宮城県', '宮城県', 'JP', 3, 'green'),
  ('region', '秋田県', '秋田県', 'JP', 4, 'green'),
  ('region', '山形県', '山形県', 'JP', 5, 'green'),
  ('region', '福島県', '福島県', 'JP', 6, 'green'),
  ('region', '茨城県', '茨城県', 'JP', 7, 'green'),
  ('region', '栃木県', '栃木県', 'JP', 8, 'green'),
  ('region', '群馬県', '群馬県', 'JP', 9, 'green'),
  ('region', '埼玉県', '埼玉県', 'JP', 10, 'green'),
  ('region', '千葉県', '千葉県', 'JP', 11, 'green'),
  ('region', '東京都', '東京都', 'JP', 12, 'green'),
  ('region', '神奈川県', '神奈川県', 'JP', 13, 'green'),
  ('region', '新潟県', '新潟県', 'JP', 14, 'green'),
  ('region', '富山県', '富山県', 'JP', 15, 'green'),
  ('region', '石川県', '石川県', 'JP', 16, 'green'),
  ('region', '福井県', '福井県', 'JP', 17, 'green'),
  ('region', '山梨県', '山梨県', 'JP', 18, 'green'),
  ('region', '長野県', '長野県', 'JP', 19, 'green'),
  ('region', '岐阜県', '岐阜県', 'JP', 20, 'green'),
  ('region', '静岡県', '静岡県', 'JP', 21, 'green'),
  ('region', '愛知県', '愛知県', 'JP', 22, 'green'),
  ('region', '三重県', '三重県', 'JP', 23, 'green'),
  ('region', '滋賀県', '滋賀県', 'JP', 24, 'green'),
  ('region', '京都府', '京都府', 'JP', 25, 'green'),
  ('region', '大阪府', '大阪府', 'JP', 26, 'green'),
  ('region', '兵庫県', '兵庫県', 'JP', 27, 'green'),
  ('region', '奈良県', '奈良県', 'JP', 28, 'green'),
  ('region', '和歌山県', '和歌山県', 'JP', 29, 'green'),
  ('region', '鳥取県', '鳥取県', 'JP', 30, 'green'),
  ('region', '島根県', '島根県', 'JP', 31, 'green'),
  ('region', '岡山県', '岡山県', 'JP', 32, 'green'),
  ('region', '広島県', '広島県', 'JP', 33, 'green'),
  ('region', '山口県', '山口県', 'JP', 34, 'green'),
  ('region', '徳島県', '徳島県', 'JP', 35, 'green'),
  ('region', '香川県', '香川県', 'JP', 36, 'green'),
  ('region', '愛媛県', '愛媛県', 'JP', 37, 'green'),
  ('region', '高知県', '高知県', 'JP', 38, 'green'),
  ('region', '福岡県', '福岡県', 'JP', 39, 'green'),
  ('region', '佐賀県', '佐賀県', 'JP', 40, 'green'),
  ('region', '長崎県', '長崎県', 'JP', 41, 'green'),
  ('region', '熊本県', '熊本県', 'JP', 42, 'green'),
  ('region', '大分県', '大分県', 'JP', 43, 'green'),
  ('region', '宮崎県', '宮崎県', 'JP', 44, 'green'),
  ('region', '鹿児島県', '鹿児島県', 'JP', 45, 'green'),
  ('region', '沖縄県', '沖縄県', 'JP', 46, 'green'),
  ('region', 'California', 'California', 'US', 100, 'blue'),
  ('region', 'New York', 'New York', 'US', 101, 'blue'),
  ('region', 'Texas', 'Texas', 'US', 102, 'blue'),
  ('region', 'Florida', 'Florida', 'US', 103, 'blue'),
  ('region', 'Washington', 'Washington', 'US', 104, 'blue'),
  ('region', 'Illinois', 'Illinois', 'US', 105, 'blue'),
  ('region', 'Massachusetts', 'Massachusetts', 'US', 106, 'blue'),
  ('industry', '美容サロン', '美容サロン', null, 0, 'pink'),
  ('industry', '歯科医院', '歯科医院', null, 1, 'cyan'),
  ('industry', '飲食店', '飲食店', null, 2, 'orange'),
  ('industry', '建設・工務店', '建設・工務店', null, 3, 'yellow'),
  ('industry', '会計事務所', '会計事務所', null, 4, 'blue'),
  ('industry', '小売・店舗', '小売・店舗', null, 5, 'purple'),
  ('industry', '清掃・メンテナンス', '清掃・メンテナンス', null, 6, 'green'),
  ('industry', 'コンサルティング', 'コンサルティング', null, 7, 'gray'),
  ('source', 'apollo', 'Apollo', null, 0, 'blue'),
  ('source', 'fumadata', 'Fumadata', null, 1, 'purple'),
  ('source', 'bizmap', 'BIZMap', null, 2, 'yellow'),
  ('source', 'gbizinfo', 'gBizInfo', null, 3, 'green'),
  ('source', 'jgrants', 'jGrants', null, 4, 'cyan'),
  ('source', 'nta_corporate_number', '国税庁法人番号', null, 5, 'orange'),
  ('source', 'apify', 'Apify', null, 6, 'pink'),
  ('source', 'outscraper', 'Outscraper', null, 7, 'teal'),
  ('source', 'manual_csv', '手動CSV', null, 8, 'gray'),
  ('source', 'codex_verification', 'Codex検証', null, 9, 'red'),
  ('source', 'codex_e2e', 'Codex E2E', null, 10, 'red'),
  ('sales_status', '未診断 / 未対応', '未診断 / 未対応', null, 0, 'gray'),
  ('sales_status', 'カルテ生成中 / 未対応', 'カルテ生成中 / 未対応', null, 1, 'yellow'),
  ('sales_status', '送信待ち / 未対応', '送信待ち / 未対応', null, 2, 'orange'),
  ('sales_status', '手動確認 / 未対応', '手動確認 / 未対応', null, 3, 'purple'),
  ('sales_status', '送信済み / 未対応', '送信済み / 未対応', null, 4, 'blue'),
  ('sales_status', '商談化 / 初回商談', '商談化 / 初回商談', null, 5, 'cyan'),
  ('sales_status', '提案中 / 提案', '提案中 / 提案', null, 6, 'teal'),
  ('sales_status', '成約 / 契約', '成約 / 契約', null, 7, 'green'),
  ('sales_status', '失注 / 失注', '失注 / 失注', null, 8, 'red')
on conflict (field_key, value) do update set
  label = excluded.label,
  country_code = excluded.country_code,
  position = excluded.position,
  color = excluded.color,
  is_active = true,
  updated_at = now();

comment on table public.sales_crm_view_fields is 'Twenty Companiesの営業リスト表示列をSupabase SSOTで管理する設定。';
comment on table public.sales_crm_select_options is '国名、地域名、業種名、ソース、営業ステータスなどの選択肢マスタ。';
