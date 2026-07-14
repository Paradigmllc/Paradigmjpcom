-- Twenty Companies view customization for Paradigm Sales OS.
-- Apply to the Twenty Postgres database (`default`).
-- Supabase remains the SSOT; these fields are projection columns for CRM operators.

do $$
declare
  company_object_id uuid;
  workspace_id uuid;
  custom_application_id uuid;
  company_schema text;
  table_view_id uuid;
  record_view_id uuid;
  field_id uuid;
begin
  select o.id, o."workspaceId"
    into company_object_id, workspace_id
  from core."objectMetadata" o
  where o."nameSingular" = 'company'
  limit 1;

  if company_object_id is null then
    raise exception 'Twenty company object metadata was not found';
  end if;

  select f."applicationId"
    into custom_application_id
  from core."fieldMetadata" f
  where f."objectMetadataId" = company_object_id
    and f."isSystem" = false
    and f."applicationId" is not null
  limit 1;

  select table_schema
    into company_schema
  from information_schema.tables
  where table_name = 'company'
    and table_schema like 'workspace_%'
  order by table_schema
  limit 1;

  if company_schema is null then
    raise exception 'Twenty workspace company table was not found';
  end if;

  select v.id
    into table_view_id
  from core."view" v
  where v."objectMetadataId" = company_object_id
    and v.type = 'TABLE'
    and v."deletedAt" is null
  order by v.position
  limit 1;

  select v.id
    into record_view_id
  from core."view" v
  where v."objectMetadataId" = company_object_id
    and v.type = 'FIELDS_WIDGET'
    and v."deletedAt" is null
  order by v.position
  limit 1;

  update core."view"
  set name = 'Japan Entry 候補',
      "updatedAt" = now()
  where id = table_view_id;

  perform 1;
end $$;

create or replace function public._paradigm_twenty_ensure_company_field(
  p_name text,
  p_label text,
  p_type text,
  p_description text,
  p_icon text,
  p_settings jsonb default null,
  p_options jsonb default null
) returns uuid
language plpgsql
as $$
declare
  company_object_id uuid;
  workspace_id uuid;
  custom_application_id uuid;
  next_id uuid;
begin
  select o.id, o."workspaceId"
    into company_object_id, workspace_id
  from core."objectMetadata" o
  where o."nameSingular" = 'company'
  limit 1;

  select f."applicationId"
    into custom_application_id
  from core."fieldMetadata" f
  where f."objectMetadataId" = company_object_id
    and f."isSystem" = false
    and f."applicationId" is not null
  limit 1;

  insert into core."fieldMetadata" (
    id,
    "objectMetadataId",
    type,
    name,
    label,
    description,
    icon,
    settings,
    options,
    "isActive",
    "isSystem",
    "isUIReadOnly",
    "isNullable",
    "workspaceId",
    "isLabelSyncedWithName",
    "createdAt",
    "updatedAt",
    "universalIdentifier",
    "applicationId"
  )
  values (
    gen_random_uuid(),
    company_object_id,
    p_type,
    p_name,
    p_label,
    p_description,
    p_icon,
    p_settings,
    p_options,
    true,
    false,
    false,
    true,
    workspace_id,
    false,
    now(),
    now(),
    gen_random_uuid(),
    custom_application_id
  )
  on conflict (name, "objectMetadataId", "workspaceId")
  do update set
    label = excluded.label,
    description = excluded.description,
    icon = excluded.icon,
    settings = excluded.settings,
    options = excluded.options,
    "isActive" = true,
    "isLabelSyncedWithName" = false,
    "updatedAt" = now()
  returning id into next_id;

  return next_id;
end $$;

create or replace function public._paradigm_twenty_ensure_view_field(
  p_view_id uuid,
  p_field_id uuid,
  p_position numeric,
  p_size integer,
  p_visible boolean default true
) returns void
language plpgsql
as $$
declare
  workspace_id uuid;
  application_id uuid;
begin
  if p_view_id is null or p_field_id is null then
    return;
  end if;

  select f."workspaceId", f."applicationId"
    into workspace_id, application_id
  from core."fieldMetadata" f
  where f.id = p_field_id;

  if exists (
    select 1
    from core."viewField" vf
    where vf."viewId" = p_view_id
      and vf."fieldMetadataId" = p_field_id
      and vf."deletedAt" is null
  ) then
    update core."viewField"
    set "isVisible" = p_visible,
        "isActive" = true,
        position = p_position,
        size = p_size,
        "updatedAt" = now()
    where "viewId" = p_view_id
      and "fieldMetadataId" = p_field_id
      and "deletedAt" is null;
  else
    insert into core."viewField" (
      id,
      "fieldMetadataId",
      "isVisible",
      size,
      position,
      "viewId",
      "workspaceId",
      "createdAt",
      "updatedAt",
      "universalIdentifier",
      "applicationId",
      "isActive"
    )
    values (
      gen_random_uuid(),
      p_field_id,
      p_visible,
      p_size,
      p_position,
      p_view_id,
      workspace_id,
      now(),
      now(),
      gen_random_uuid(),
      application_id,
      true
    );
  end if;
end $$;

do $$
declare
  company_object_id uuid;
  company_schema text;
  table_view_id uuid;
  record_view_id uuid;
  field_id uuid;
begin
  select o.id
    into company_object_id
  from core."objectMetadata" o
  where o."nameSingular" = 'company'
  limit 1;

  select table_schema
    into company_schema
  from information_schema.tables
  where table_name = 'company'
    and table_schema like 'workspace_%'
  order by table_schema
  limit 1;

  select v.id
    into table_view_id
  from core."view" v
  where v."objectMetadataId" = company_object_id
    and v.type = 'TABLE'
    and v."deletedAt" is null
  order by v.position
  limit 1;

  select v.id
    into record_view_id
  from core."view" v
  where v."objectMetadataId" = company_object_id
    and v.type = 'FIELDS_WIDGET'
    and v."deletedAt" is null
  order by v.position
  limit 1;

  perform public._paradigm_twenty_ensure_company_field('paradigmCountryName', '国名', 'TEXT', 'SSOTのtarget_countryを営業担当向けの国名に変換した値', 'IconWorld');
  perform public._paradigm_twenty_ensure_company_field('paradigmRegionName', '地域名', 'TEXT', '都道府県、州、県など国に応じた地域名', 'IconMapPin');
  perform public._paradigm_twenty_ensure_company_field('paradigmIndustryName', '業種名', 'TEXT', 'Supabase企業カルテで判定した業種名', 'IconCategory');
  perform public._paradigm_twenty_ensure_company_field('paradigmSourceName', 'ソース元', 'TEXT', 'Apollo、Fumadata、BIZMap、手動投入などのリスト取得元', 'IconDatabaseImport');
  perform public._paradigm_twenty_ensure_company_field('paradigmSalesStatus', '営業ステータス', 'TEXT', 'Supabase pipeline_status と deal_stage を営業担当向けに要約した状態', 'IconProgressCheck');
  perform public._paradigm_twenty_ensure_company_field('paradigmLeadStatus', '候補ステータス', 'TEXT', 'フォーム適格リストの確認状態。文面・レポート・送信とは分離する', 'IconListCheck');
  perform public._paradigm_twenty_ensure_company_field('paradigmTechnology', '技術', 'TEXT', '公開サイトから確認したEC/SaaS基盤などの技術', 'IconStack2');
  perform public._paradigm_twenty_ensure_company_field('paradigmOpportunityScore', '機会スコア', 'NUMBER', 'Japan Entry候補の客観シグナルに基づく0〜100の機会スコア', 'IconChartDots');
  perform public._paradigm_twenty_ensure_company_field('paradigmSmbScore', 'SMBスコア', 'NUMBER', 'SMB適合ヒューリスティックの0〜100スコア', 'IconBuildingStore');
  perform public._paradigm_twenty_ensure_company_field('paradigmSalesMaterialUrl', '営業資料URL', 'LINKS', 'Slidev/Gotenberg等で生成した営業資料URL', 'IconPresentationAnalytics', '{"maxNumberOfValues":1}'::jsonb);
  perform public._paradigm_twenty_ensure_company_field('paradigmDemoUrl', 'デモURL', 'LINKS', 'Astro差し替えデモサイトURL', 'IconBrowserCheck', '{"maxNumberOfValues":1}'::jsonb);
  perform public._paradigm_twenty_ensure_company_field('paradigmCustomerPortalUrl', '顧客ポータルURL', 'LINKS', '成約後に顧客と共有する顧客ポータルURL', 'IconLink', '{"maxNumberOfValues":1}'::jsonb);

  update core."fieldMetadata"
  set label = case name
      when 'paradigmReportUrl' then 'Opportunity Brief URL'
      when 'paradigmFormUrl' then 'フォームURL'
      when 'paradigmCustomerPortalUrl' then '顧客ポータルURL'
      when 'paradigmRecommendedProducts' then '推奨商材'
      when 'paradigmKarteScore' then 'カルテスコア'
      when 'paradigmSourceCoverage' then 'データ取得率'
      when 'paradigmKarteSummary' then '候補根拠 / Brief要約'
      else label
    end,
    "isLabelSyncedWithName" = false,
    "updatedAt" = now()
  where "objectMetadataId" = company_object_id
    and name in (
      'paradigmReportUrl',
      'paradigmFormUrl',
      'paradigmCustomerPortalUrl',
      'paradigmRecommendedProducts',
      'paradigmKarteScore',
      'paradigmSourceCoverage',
      'paradigmKarteSummary'
    );

  execute format('alter table %I.company add column if not exists "paradigmCountryName" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmRegionName" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmIndustryName" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmSourceName" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmSalesStatus" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmLeadStatus" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmTechnology" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmOpportunityScore" numeric', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmSmbScore" numeric', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmSalesMaterialUrlPrimaryLinkLabel" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmSalesMaterialUrlPrimaryLinkUrl" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmSalesMaterialUrlSecondaryLinks" jsonb', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmDemoUrlPrimaryLinkLabel" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmDemoUrlPrimaryLinkUrl" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmDemoUrlSecondaryLinks" jsonb', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmCustomerPortalUrlPrimaryLinkLabel" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmCustomerPortalUrlPrimaryLinkUrl" text', company_schema);
  execute format('alter table %I.company add column if not exists "paradigmCustomerPortalUrlSecondaryLinks" jsonb', company_schema);

  update core."view"
  set name = 'Japan Entry 候補',
      "updatedAt" = now()
  where id = table_view_id;

  update core."viewField"
  set "isVisible" = false,
      "updatedAt" = now()
  where "viewId" = table_view_id
    and "deletedAt" is null
    and "fieldMetadataId" in (
      select id
      from core."fieldMetadata"
      where "objectMetadataId" = company_object_id
        and name in (
          'createdBy', 'accountOwner', 'createdAt', 'employees', 'linkedinLink', 'address',
          'paradigmSalesStatus', 'paradigmDataStatus', 'paradigmDataSources',
          'paradigmSourceCoverage', 'paradigmNextAction', 'paradigmLastError',
          'paradigmReportUrl', 'paradigmSalesMaterialUrl', 'paradigmDemoUrl',
          'paradigmCustomerPortalUrl'
        )
    );

  perform public._paradigm_twenty_ensure_view_field(table_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'name'), 0, 220, true);
  perform public._paradigm_twenty_ensure_view_field(table_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'domainName'), 1, 150, true);
  perform public._paradigm_twenty_ensure_view_field(table_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmLeadStatus'), 2, 220, true);
  perform public._paradigm_twenty_ensure_view_field(table_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmCountryName'), 3, 110, true);
  perform public._paradigm_twenty_ensure_view_field(table_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmTechnology'), 4, 140, true);
  perform public._paradigm_twenty_ensure_view_field(table_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmOpportunityScore'), 5, 110, true);
  perform public._paradigm_twenty_ensure_view_field(table_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmSmbScore'), 6, 100, true);
  perform public._paradigm_twenty_ensure_view_field(table_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmSourceName'), 7, 140, true);
  perform public._paradigm_twenty_ensure_view_field(table_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmFormUrl'), 8, 180, true);

  update core."viewField"
  set "isVisible" = false,
      "updatedAt" = now()
  where "viewId" = record_view_id
    and "deletedAt" is null
    and "fieldMetadataId" in (
      select id
      from core."fieldMetadata"
      where "objectMetadataId" = company_object_id
        and name in (
          'createdBy', 'accountOwner', 'createdAt', 'employees', 'linkedinLink', 'xLink',
          'paradigmSalesStatus', 'paradigmDataStatus', 'paradigmDataSources',
          'paradigmSourceCoverage', 'paradigmNextAction', 'paradigmLastError',
          'paradigmReportUrl', 'paradigmSalesMaterialUrl', 'paradigmDemoUrl',
          'paradigmCustomerPortalUrl', 'paradigmRecommendedProducts'
        )
    );

  perform public._paradigm_twenty_ensure_view_field(record_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'domainName'), 0, 170, true);
  perform public._paradigm_twenty_ensure_view_field(record_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmLeadStatus'), 1, 220, true);
  perform public._paradigm_twenty_ensure_view_field(record_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmCountryName'), 2, 150, true);
  perform public._paradigm_twenty_ensure_view_field(record_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmTechnology'), 3, 170, true);
  perform public._paradigm_twenty_ensure_view_field(record_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmOpportunityScore'), 4, 130, true);
  perform public._paradigm_twenty_ensure_view_field(record_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmSmbScore'), 5, 120, true);
  perform public._paradigm_twenty_ensure_view_field(record_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmSourceName'), 6, 150, true);
  perform public._paradigm_twenty_ensure_view_field(record_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmFormUrl'), 7, 180, true);
  perform public._paradigm_twenty_ensure_view_field(record_view_id, (select id from core."fieldMetadata" where "objectMetadataId" = company_object_id and name = 'paradigmKarteSummary'), 8, 280, true);
end $$;

drop function if exists public._paradigm_twenty_ensure_view_field(uuid, uuid, numeric, integer, boolean);
drop function if exists public._paradigm_twenty_ensure_company_field(text, text, text, text, text, jsonb, jsonb);
