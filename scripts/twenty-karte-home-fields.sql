-- Twenty CRM metadata patch for Paradigm company karte HOME fields.
-- Run against the Twenty Postgres database (`default`).

update core."fieldMetadata"
set
  label = case name
    when 'paradigmReportUrl' then '診断レポートURL'
    when 'paradigmFormUrl' then 'フォームURL'
    when 'paradigmCustomerPortalUrl' then '顧客共有Notion URL'
    when 'paradigmRecommendedProducts' then '推奨商材'
    when 'paradigmKarteScore' then 'カルテスコア'
    when 'paradigmSourceCoverage' then 'データ取得率'
    when 'paradigmKarteSummary' then '企業カルテ要約'
    else label
  end,
  description = case name
    when 'paradigmReportUrl' then 'Paradigm診断レポートの公開URL'
    when 'paradigmFormUrl' then '検出した問い合わせフォームURL'
    when 'paradigmCustomerPortalUrl' then '成約後に顧客と共有するNotionプロジェクトページURL'
    when 'paradigmRecommendedProducts' then 'Supabase企業カルテから推定した提案商材'
    when 'paradigmKarteScore' then '痛み可視化とデータ充足度から算出した営業優先度'
    when 'paradigmSourceCoverage' then '無料API/OSSデータソースの取得率'
    when 'paradigmKarteSummary' then '営業担当がHOMEで読むための短い企業カルテ要約'
    else description
  end,
  "isLabelSyncedWithName" = false,
  "updatedAt" = now()
where name in (
  'paradigmReportUrl',
  'paradigmFormUrl',
  'paradigmCustomerPortalUrl',
  'paradigmRecommendedProducts',
  'paradigmKarteScore',
  'paradigmSourceCoverage',
  'paradigmKarteSummary'
);

update core."fieldMetadata"
set
  options = '[
    {"id":"62d5d953-251c-472f-a0bf-70bde688e79a","color":"blue","label":"Web制作","value":"JP_WEB_PRODUCTION","position":0},
    {"id":"9746c87f-b006-4d95-92f4-f5e2a34d5b85","color":"green","label":"DXパッケージ","value":"JP_DX_PACKAGE","position":1},
    {"id":"6aeb8e87-95e4-433d-84d0-e4a2af048ba3","color":"purple","label":"Japan Entry Package (JaaS)","value":"GLOBAL_JAAS","position":2},
    {"id":"34da03d0-59a3-4db5-87a4-944b251b09ca","color":"orange","label":"動画納品サブスク","value":"GLOBAL_VIDEO_SUBSCRIPTION","position":3}
  ]'::jsonb,
  "updatedAt" = now()
where name = 'paradigmRecommendedProducts';
