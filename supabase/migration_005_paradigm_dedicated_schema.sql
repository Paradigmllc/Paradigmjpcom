-- migration_005_paradigm_dedicated_schema.sql
-- 2026-05-20: paradigm-HP PayloadCMS 専用スキーマ "paradigm" を新設。
--
-- 背景:
--   paradigm-HP は payload.config.ts schemaName="payload" で接続していたが、
--   本番 Supabase (yihdmgtxiqfdgdueolub) の "payload" スキーマは別アプリ
--   (articles/guides/tools/homepage/testimonials/press_mentions 等・owner=postgres)
--   に占有されていた。そのため paradigm 自身の posts/services/pricing/works/faqs/pages
--   テーブルが作成されず:
--     ① 動的コンテンツ (ブログ/サービス等) が全 locale で未配信 (空状態)
--     ② build 時に欠落テーブルへの問い合わせ × 311 ページが共有 pooler の
--        接続上限 (session mode pool_size:15) を枯渇させ EMAXCONNSESSION で deploy 失敗
--   の 2 大障害を起こしていた。
--
-- 対策:
--   paradigm 専用スキーマ (owner=payload_user) を新設し、payload.config.ts の
--   schemaName を "payload" → "paradigm" に切替。次回 deploy の Payload push が
--   衝突なく自分のテーブルを生成する。
--
-- 安全性:
--   既存 "payload" スキーマ (別アプリ・owner=postgres) は一切変更しない。
--   本 migration は新スキーマ作成のみ (非破壊)。問題時は schemaName を "payload" に
--   1 行 revert すれば旧挙動に戻る。
--
-- 適用: 2026-05-20 Supabase MCP apply_migration (paradigm_hp_dedicated_schema) で適用済。

CREATE SCHEMA IF NOT EXISTS paradigm AUTHORIZATION payload_user;
GRANT ALL ON SCHEMA paradigm TO payload_user;
