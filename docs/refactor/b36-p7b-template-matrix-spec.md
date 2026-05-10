# B36-P7B Template Matrix Spec — 4 業種 × 5 Pitch Angle

> **状態**: 🟢 **PARTIALLY IMPLEMENTED** (ja×saas×5 angles 投入済・migration apply 済)
> **作成 / 更新**: 2026-05-10
> **背景**: ユーザー指示「authority + social_proof 追加で 5 軸」 + 「ElizaOS なども含めてどんどん進めて」 → 即時実装フェーズ移行.
> **完了済 (2026-05-10)**:
>   - ✅ migration `b36_p7b_pitch_angle_and_personas` apply (form_message_templates.pitch_angle 列 + paradigm_personas テーブル)
>   - ✅ migration `b36_p7b_unique_includes_pitch_angle` apply (UNIQUE constraint extend)
>   - ✅ ja×saas×5 angles seed 投入 (459-505 chars each・100% B2B 大人語彙)
>   - ✅ paradigm-advisor-ja persona seed (system_prompt / tone / vocab_allowed / vocab_banned / style_examples)
>   - ✅ pick-template.ts 8-phase fallback 拡張
>   - ✅ /api/persona/[slug] endpoint 実装
> **残**: 3 業種 (ec/consulting/restaurant_retail) seed + 11 region 翻訳 propagation + Dify workflow に persona HTTP fetch wire

---

## 1. 設計原則 (継承する不変条件)

- **B2B 大人語彙**: 「主訴 / 処方箋 / 経過観察」絶対禁止 (Phase 7-A 確立済). 「主要観察項目 / 推奨対応 / 継続的なモニタリング / アクションプラン」を使用.
- **STRICT_LANGUAGE_GUARD 3 層防御**: pick-template.ts の DB SELECT + post-fetch + final assertion を維持.
- **80% Real Data 規律**: テンプレ本文に hardcode 数値を入れない. `{{stage1_pain_summary}}` / `{{company_name}}` / `{{report_url}}` 等の mustache 変数だけで personalize.
- **applicability 排他**: jp_only / overseas_only / global を継続. 業種シグナルと組み合わせ.
- **LP/CRO 5 段階構造**: Subject curiosity gap → Hook (lead-specific finding) → Bridge (Paradigm の所見) → Shoreline (low-friction next step) → CTA reducer 「3 min · view-only · no signup」を全テンプレで保持.

---

## 2. 業種 4 セグメント (industry_slug 値)

| slug | 想定業態 | 判定シグナル候補 (lead.unified_profile から) | 主要 pain pattern |
|------|---------|------------------------------------------|------------------|
| `saas` | B2B SaaS / horizontal apps / dev tools | tech_stack に React/Next/Vue/Python/Go・wp_health 不在・stripe/paddle integration 検出・enterprise tier 表記 | TTFV 鈍化 / pricing page CRO / signup funnel friction / API doc UX / customer health score 不在 |
| `ec` | D2C / EC / Shopify / 物販 | wp_health 検出 (WC/Shopify/Magento)・cart system 検出・SKU page 多数・Instagram pixel | カート離脱率 / モバイル LCP / 在庫切れ UX / レビュー収集率 / リターゲ漏れ |
| `consulting` | 専門サービス (税理士 / 社労士 / 弁護士 / コンサル / 制作) | tech_stack 軽量 (HTML+jQuery)・問合せフォーム中心・実績ページ豊富・LP 数 5 以下 | 価格ページ不在で離脱 / 事例 SEO 不足 / 問合せ→面談 CVR 低 / 競合差別化弱 / Google マイビジネス未整備 |
| `restaurant_retail` | 飲食 / 物販店舗 / 美容室 / 治療院 | Google マイビジネス連携・地名 SEO・営業時間表示・予約 widget・MEO 強い | MEO スコア低 / レビュー返信率 / 写真品質 / 多言語対応 / 予約 friction |

**判定ロジック**: `unified_profile.classified_industry` (B23 Dify routing で確定済) を優先. なければ tech_stack + wp_health + url パターンで heuristic 推論. fallback = `default`.

---

## 3. Pitch Angle 3 軸 (pitch_angle 値)

| slug | 訴求トーン | 心理トリガー | サブジェクト curiosity gap 例 (ja) |
|------|-----------|------------|------------------------------------|
| `risk` | リスク型 (損失回避) | 損失回避バイアス・FOMO 反転 | 「貴社サイトの SSL 評価 C- が示すもの — 拝見した所見」 |
| `opportunity` | 機会型 (前向き提案) | 達成欲求・好奇心 | 「{{company}} の Web パフォーマンス、あと 18 点で業界トップ層」 |
| `competitor` | 競合迫力 (社会的証明) | 同業他社プレッシャー | 「{{industry}} の同規模 3 社が今月着手した改善項目」 |

**注**: 「煽り」「ぜひ」「割引」等の sales_intent vocabulary は禁止 (form ToS 違反検知器が ng で escalate). 主治医ポジションの「拝見した所見・分析の結果」体裁を維持.

---

## 4. 4 × 3 = 12 cells matrix (ja 版・本表が SoT)

| | risk | opportunity | competitor |
|---|------|-------------|------------|
| **saas** | TTFV 遅延 → trial 離脱率損失 試算 | Activation Rate 4 ポイント改善余地 | 同 ARR 帯 SaaS 3 社が onboarding 改修中 |
| **ec** | カート離脱 LCP ペナルティ → 月次売上機会損失 | モバイル CRO 改善余地 +12% 試算 | 同カテゴリ EC 3 社の Core Web Vitals 並走 |
| **consulting** | 価格ページ不在 → 問合せ前離脱 | 事例 SEO 拡張で月次問合せ +N 件 | 同領域 3 社が事例ページ強化中 |
| **restaurant_retail** | MEO スコア低位 → 来店損失 | レビュー返信率改善で MEO 上昇余地 | 同商圏 3 店舗の MEO スコア比較 |

各 cell は (subject_template, body_template, cta_phrase, variant=`a`/`b`) を持つ. variant `a` = 上記 default / variant `b` = A/B test 用 alt copy. winner-judge cron で auto-promote/deactivate.

---

## 5. DB schema 変更 (migration draft)

```sql
-- B36-P7B: form_message_templates に pitch_angle 列追加
ALTER TABLE form_message_templates
  ADD COLUMN pitch_angle TEXT
    CHECK (pitch_angle IS NULL OR pitch_angle IN ('risk','opportunity','competitor'));

-- 既存 12 row (default industry) を pitch_angle=NULL のまま fallback 用に保持

-- index for pick lookup (region + language + industry + pitch_angle + variant + active)
CREATE INDEX IF NOT EXISTS idx_fmt_pick
  ON form_message_templates (region, language, industry_slug, pitch_angle, variant, is_active);

-- A/B winner judge view 拡張 (既存 view に pitch_angle group by 追加)
-- (SQL は別 migration)
```

**seed 戦略**: ja 版 12 cells × 1 variant (`a`) を最初に投入 = +12 row. variant `b` は wall-call 後に追加. 11 region は ja 版を DeepSeek V4 で翻訳して seed.

---

## 6. pick-template.ts 4-phase fallback (現 phase 拡張)

現状: `[{industry, variant}, {default, variant}, {industry, a}, {default, a}]` 4 phase.

新: pitch_angle を加えた **8 phase fallback**:

```ts
const phases = [
  { industry, pitch_angle, variant },           // exact match
  { industry, pitch_angle, variant: 'a' },      // variant fallback
  { industry, pitch_angle: null, variant },     // angle 不明時
  { industry, pitch_angle: null, variant: 'a' },
  { industry: 'default', pitch_angle, variant },// 業種未特定
  { industry: 'default', pitch_angle, variant: 'a' },
  { industry: 'default', pitch_angle: null, variant },
  { industry: 'default', pitch_angle: null, variant: 'a' },  // ultimate fallback
]
```

`pitch_angle` の決定ロジック:
1. `lead.meta.preferred_pitch_angle` があれば優先 (admin が手動設定)
2. なければ `unified_profile.severity_distribution` から `risk`/`opportunity`/`competitor` を auto-pick (severity high 多 → risk・低 → opportunity・コンペ密度 → competitor)
3. fallback = `null` (angle 指定なし)

---

## 7. 実装順序

1. ✅ **本 spec 作成** + ユーザー壁打ち承認待ち
2. ⏳ **migration**: `pitch_angle` 列 + index 追加 (Supabase MCP で apply_migration)
3. ⏳ **seed (ja のみ・12 row)**: section 4 matrix から body 起こし → INSERT
4. ⏳ **pick-template.ts**: 8-phase fallback 拡張 + STRICT_LANGUAGE_GUARD 維持
5. ⏳ **DeepSeek V4 翻訳 propagation**: ja → 11 region (script: `scripts/i18n-translate-templates.mjs`・既存 i18n-translate.mjs を流用)
6. ⏳ **A/B winner judge 拡張**: pitch_angle group by 追加
7. ⏳ **smoke E2E**: 4 業種 + 3 angle 全組合せで pick が正しい template を返すかを test 関数で網羅

---

## 8. 壁打ち質問 (ユーザー承認必要事項)

1. 業種 4 軸はこの粒度 (saas/ec/consulting/restaurant_retail) で合意? 別の切り方も可: ① toB専門サービス / toC EC / toC 飲食 / toG 公共 / toEducation 教育 / toM 製造 など
2. pitch_angle 3 軸 (risk/opportunity/competitor) で合意? 4 軸目「authority (権威付け)」「social_proof (UGC/受賞)」を追加検討する?
3. ja 12 cells × 1 variant で MVP → 動作確認後 variant `b` + 11 region 翻訳の段階展開で OK?
4. matrix の各 cell の **subject curiosity gap** copy は、上記 section 4 の文面で第一弾としてよいか? もしくはまずは 1 業種 × 3 angle (例: saas のみ) で深く磨いてから 4 業種に展開?
5. pitch_angle 自動判定は severity_distribution ベースで OK? もしくは admin が lead 単位で「この lead には competitor angle で行く」と手動上書きできる UI も同時に作る?
