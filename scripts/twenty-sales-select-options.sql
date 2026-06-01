create schema if not exists paradigm_runtime;

create or replace function paradigm_runtime.uuid_from_seed(seed text)
returns uuid
language sql
immutable
as $$
  select (
    substr(md5(seed), 1, 8) || '-' ||
    substr(md5(seed), 9, 4) || '-' ||
    substr(md5(seed), 13, 4) || '-' ||
    substr(md5(seed), 17, 4) || '-' ||
    substr(md5(seed), 21, 12)
  )::uuid;
$$;

create or replace function paradigm_runtime.twenty_select_option(
  field_name text,
  label_text text,
  value_text text,
  color_text text,
  position_number integer
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', paradigm_runtime.uuid_from_seed(field_name || ':' || value_text)::text,
    'label', label_text,
    'value', value_text,
    'color', color_text,
    'position', position_number
  );
$$;

with field_options(field_name, option_label, option_value, option_color, option_position) as (
  values
    ('paradigmCountryName', '日本', '日本', 'green', 0),
    ('paradigmCountryName', '米国', '米国', 'blue', 1),
    ('paradigmCountryName', '韓国', '韓国', 'purple', 2),
    ('paradigmCountryName', '中国', '中国', 'red', 3),
    ('paradigmCountryName', '台湾', '台湾', 'cyan', 4),
    ('paradigmCountryName', 'ドイツ', 'ドイツ', 'yellow', 5),
    ('paradigmCountryName', 'フランス', 'フランス', 'pink', 6),
    ('paradigmCountryName', 'スペイン', 'スペイン', 'orange', 7),
    ('paradigmCountryName', 'ポルトガル', 'ポルトガル', 'orange', 8),
    ('paradigmCountryName', 'ロシア', 'ロシア', 'gray', 9),
    ('paradigmCountryName', 'UAE', 'UAE', 'teal', 10),
    ('paradigmCountryName', 'ベトナム', 'ベトナム', 'green', 11),
    ('paradigmCountryName', 'インドネシア', 'インドネシア', 'green', 12),
    ('paradigmRegionName', '北海道', '北海道', 'green', 0),
    ('paradigmRegionName', '青森県', '青森県', 'green', 1),
    ('paradigmRegionName', '岩手県', '岩手県', 'green', 2),
    ('paradigmRegionName', '宮城県', '宮城県', 'green', 3),
    ('paradigmRegionName', '秋田県', '秋田県', 'green', 4),
    ('paradigmRegionName', '山形県', '山形県', 'green', 5),
    ('paradigmRegionName', '福島県', '福島県', 'green', 6),
    ('paradigmRegionName', '茨城県', '茨城県', 'green', 7),
    ('paradigmRegionName', '栃木県', '栃木県', 'green', 8),
    ('paradigmRegionName', '群馬県', '群馬県', 'green', 9),
    ('paradigmRegionName', '埼玉県', '埼玉県', 'green', 10),
    ('paradigmRegionName', '千葉県', '千葉県', 'green', 11),
    ('paradigmRegionName', '東京都', '東京都', 'green', 12),
    ('paradigmRegionName', '神奈川県', '神奈川県', 'green', 13),
    ('paradigmRegionName', '新潟県', '新潟県', 'green', 14),
    ('paradigmRegionName', '富山県', '富山県', 'green', 15),
    ('paradigmRegionName', '石川県', '石川県', 'green', 16),
    ('paradigmRegionName', '福井県', '福井県', 'green', 17),
    ('paradigmRegionName', '山梨県', '山梨県', 'green', 18),
    ('paradigmRegionName', '長野県', '長野県', 'green', 19),
    ('paradigmRegionName', '岐阜県', '岐阜県', 'green', 20),
    ('paradigmRegionName', '静岡県', '静岡県', 'green', 21),
    ('paradigmRegionName', '愛知県', '愛知県', 'green', 22),
    ('paradigmRegionName', '三重県', '三重県', 'green', 23),
    ('paradigmRegionName', '滋賀県', '滋賀県', 'green', 24),
    ('paradigmRegionName', '京都府', '京都府', 'green', 25),
    ('paradigmRegionName', '大阪府', '大阪府', 'green', 26),
    ('paradigmRegionName', '兵庫県', '兵庫県', 'green', 27),
    ('paradigmRegionName', '奈良県', '奈良県', 'green', 28),
    ('paradigmRegionName', '和歌山県', '和歌山県', 'green', 29),
    ('paradigmRegionName', '鳥取県', '鳥取県', 'green', 30),
    ('paradigmRegionName', '島根県', '島根県', 'green', 31),
    ('paradigmRegionName', '岡山県', '岡山県', 'green', 32),
    ('paradigmRegionName', '広島県', '広島県', 'green', 33),
    ('paradigmRegionName', '山口県', '山口県', 'green', 34),
    ('paradigmRegionName', '徳島県', '徳島県', 'green', 35),
    ('paradigmRegionName', '香川県', '香川県', 'green', 36),
    ('paradigmRegionName', '愛媛県', '愛媛県', 'green', 37),
    ('paradigmRegionName', '高知県', '高知県', 'green', 38),
    ('paradigmRegionName', '福岡県', '福岡県', 'green', 39),
    ('paradigmRegionName', '佐賀県', '佐賀県', 'green', 40),
    ('paradigmRegionName', '長崎県', '長崎県', 'green', 41),
    ('paradigmRegionName', '熊本県', '熊本県', 'green', 42),
    ('paradigmRegionName', '大分県', '大分県', 'green', 43),
    ('paradigmRegionName', '宮崎県', '宮崎県', 'green', 44),
    ('paradigmRegionName', '鹿児島県', '鹿児島県', 'green', 45),
    ('paradigmRegionName', '沖縄県', '沖縄県', 'green', 46),
    ('paradigmRegionName', 'California', 'California', 'blue', 100),
    ('paradigmRegionName', 'New York', 'New York', 'blue', 101),
    ('paradigmRegionName', 'Texas', 'Texas', 'blue', 102),
    ('paradigmRegionName', 'Florida', 'Florida', 'blue', 103),
    ('paradigmRegionName', 'Washington', 'Washington', 'blue', 104),
    ('paradigmRegionName', 'Illinois', 'Illinois', 'blue', 105),
    ('paradigmRegionName', 'Massachusetts', 'Massachusetts', 'blue', 106),
    ('paradigmIndustryName', '美容サロン', '美容サロン', 'pink', 0),
    ('paradigmIndustryName', '歯科医院', '歯科医院', 'cyan', 1),
    ('paradigmIndustryName', '飲食店', '飲食店', 'orange', 2),
    ('paradigmIndustryName', '建設・工務店', '建設・工務店', 'yellow', 3),
    ('paradigmIndustryName', '会計事務所', '会計事務所', 'blue', 4),
    ('paradigmIndustryName', '小売・店舗', '小売・店舗', 'purple', 5),
    ('paradigmIndustryName', '清掃・メンテナンス', '清掃・メンテナンス', 'green', 6),
    ('paradigmIndustryName', 'コンサルティング', 'コンサルティング', 'gray', 7),
    ('paradigmSourceName', 'Apollo', 'apollo', 'blue', 0),
    ('paradigmSourceName', 'Fumadata', 'fumadata', 'purple', 1),
    ('paradigmSourceName', 'BIZMap', 'bizmap', 'yellow', 2),
    ('paradigmSourceName', 'gBizInfo', 'gbizinfo', 'green', 3),
    ('paradigmSourceName', 'jGrants', 'jgrants', 'cyan', 4),
    ('paradigmSourceName', '国税庁法人番号', 'nta_corporate_number', 'orange', 5),
    ('paradigmSourceName', 'Apify', 'apify', 'pink', 6),
    ('paradigmSourceName', 'Outscraper', 'outscraper', 'teal', 7),
    ('paradigmSourceName', '手動CSV', 'manual_csv', 'gray', 8),
    ('paradigmSourceName', 'Codex検証', 'codex_verification', 'red', 9),
    ('paradigmSourceName', 'Codex E2E', 'codex_e2e', 'red', 10),
    ('paradigmSalesStatus', '未診断 / 未対応', '未診断 / 未対応', 'gray', 0),
    ('paradigmSalesStatus', 'カルテ生成中 / 未対応', 'カルテ生成中 / 未対応', 'yellow', 1),
    ('paradigmSalesStatus', '送信待ち / 未対応', '送信待ち / 未対応', 'orange', 2),
    ('paradigmSalesStatus', '手動確認 / 未対応', '手動確認 / 未対応', 'purple', 3),
    ('paradigmSalesStatus', '送信済み / 未対応', '送信済み / 未対応', 'blue', 4),
    ('paradigmSalesStatus', '商談化 / 初回商談', '商談化 / 初回商談', 'cyan', 5),
    ('paradigmSalesStatus', '提案中 / 提案', '提案中 / 提案', 'teal', 6),
    ('paradigmSalesStatus', '成約 / 契約', '成約 / 契約', 'green', 7),
    ('paradigmSalesStatus', '失注 / 失注', '失注 / 失注', 'red', 8)
),
grouped_options as (
  select
    field_name,
    jsonb_agg(
      paradigm_runtime.twenty_select_option(field_name, option_label, option_value, option_color, option_position)
      order by option_position
    ) as options
  from field_options
  group by field_name
)
update core."fieldMetadata" field
set
  "type" = 'SELECT',
  "options" = grouped_options.options,
  "updatedAt" = now()
from grouped_options
where field."name" = grouped_options.field_name;

with desired(field_name, label_text, position_number, is_visible) as (
  values
    ('name', 'Name', 0, true),
    ('domainName', 'Domain Name', 1, true),
    ('paradigmSalesStatus', '営業ステータス', 2, true),
    ('paradigmCountryName', '国名', 3, true),
    ('paradigmRegionName', '地域名', 4, true),
    ('paradigmIndustryName', '業種名', 5, true),
    ('paradigmSourceName', 'ソース元', 6, true),
    ('paradigmFormUrl', 'フォームURL', 7, true),
    ('paradigmReportUrl', '診断レポートURL', 8, true),
    ('paradigmSalesMaterialUrl', '営業資料URL', 9, true),
    ('paradigmDemoUrl', 'デモURL', 10, true),
    ('paradigmCustomerPortalUrl', '顧客用Notion URL', 11, true),
    ('createdBy', 'Created by', 98, false),
    ('accountOwner', 'Account Owner', 99, false),
    ('createdAt', 'Creation date', 100, false),
    ('employees', 'Employees', 101, false),
    ('linkedinLink', 'Linkedin', 102, false),
    ('address', 'Address', 103, false)
)
update core."fieldMetadata" field
set
  "label" = desired.label_text,
  "updatedAt" = now()
from core."objectMetadata" object, desired
where object."nameSingular" = 'company'
  and field."objectMetadataId" = object."id"
  and field."name" = desired.field_name;

with desired(field_name, position_number, is_visible) as (
  values
    ('name', 0, true),
    ('domainName', 1, true),
    ('paradigmSalesStatus', 2, true),
    ('paradigmCountryName', 3, true),
    ('paradigmRegionName', 4, true),
    ('paradigmIndustryName', 5, true),
    ('paradigmSourceName', 6, true),
    ('paradigmFormUrl', 7, true),
    ('paradigmReportUrl', 8, true),
    ('paradigmSalesMaterialUrl', 9, true),
    ('paradigmDemoUrl', 10, true),
    ('paradigmCustomerPortalUrl', 11, true),
    ('createdBy', 98, false),
    ('accountOwner', 99, false),
    ('createdAt', 100, false),
    ('employees', 101, false),
    ('linkedinLink', 102, false),
    ('address', 103, false)
)
update core."viewField" view_field
set
  "position" = desired.position_number,
  "isVisible" = desired.is_visible,
  "updatedAt" = now()
from core."fieldMetadata" field, core."objectMetadata" object, core."view" view, desired
where object."nameSingular" = 'company'
  and field."objectMetadataId" = object."id"
  and field."name" = desired.field_name
  and view."objectMetadataId" = object."id"
  and view_field."fieldMetadataId" = field."id"
  and view_field."viewId" = view."id";
