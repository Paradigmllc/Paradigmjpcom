-- migration_007_rls_paradigm.sql — paradigm スキーマ全テーブルの RLS 有効化
-- 2026-05-21 ユーザ指示「RLS 有効化＋ポリシー設計」対応。
--
-- 背景: Supabase advisor が paradigm.* 134 テーブルの RLS 無効を critical 警告。
--
-- 設計判断 (最小権限):
--   - paradigm.* の所有者は payload_user。テーブル所有者は RLS を常にバイパスする
--     (Postgres 仕様) → PayloadCMS (DATABASE_URI=payload_user・owner) は無影響で動作継続。
--   - service_role は rolbypassrls=true → サーバー側 API も無影響。
--   - anon / authenticated は bypass を持たず、permissive policy も付与しない
--     → これらの役割からの read/write は全拒否 (= 内部 CMS テーブルとして正しい)。
--   - paradigm スキーマは PostgREST 公開対象外 (public のみ公開) であり、本 RLS は
--     多層防御 (defense in depth)。
--
-- 冪等: 既に有効なテーブルへの ENABLE は no-op。新規テーブル追加後に再実行すれば
--   それらも一括有効化される (push:true で生成される新テーブル対策)。
--
-- ⚠️ permissive policy を意図的に作らない。anon を許可したい公開テーブルが将来
--   出た場合のみ、個別に CREATE POLICY ... TO anon USING (...) を足すこと。

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'paradigm'
  LOOP
    EXECUTE format('ALTER TABLE paradigm.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    -- FORCE は付けない: owner (payload_user) は bypass のままにして Payload を壊さない。
  END LOOP;
END $$;
