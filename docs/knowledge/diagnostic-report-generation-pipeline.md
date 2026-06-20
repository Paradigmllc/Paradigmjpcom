# 診断レポート生成パイプライン（Dify / DeepSeek 用途マップ）

> Phase 6-3。レポート文面の「ブラックボックス」を解消するための正本ドキュメント。
> 2026-06-20 時点の実装に基づく。

## 3つの文面生成器（重複していたものを整理）

| # | 生成物 | 実装 | エンジン（現状） | 永続先 |
|---|--------|------|------------------|--------|
| ① | 痛み要約 / オファー選定 | `runDifyDiagnosis`（`dify-diagnosis.ts`） | **Dify Cloud** → DeepSeek → local の3段 fallback | `meta.dify_result` / `meta.pain_diagnosis` |
| ② | レポート5幕本文（hook/pain/fear/loss/cta） | `personalizeReport` / `autoPersonalize`（`personalize.ts`） | **DeepSeek**（Context Cache）→ profile fallback | `meta.personalized_copy` |
| ③ | 送信用営業文面 | `generateWithDify`（`form-message.ts`） | **Dify Cloud** → DeepSeek V3 fallback | `sales_companies` 文面列 |

## 表示パス（正本）

`diagnostic.ts: fetchDiagnosticReport` が `meta.personalized_copy`（②の出力）を**最優先**で採用し、無ければ DB テンプレ + `buildAct` の generic 文面にフォールバックする。

- `personalized_copy.personalized_pain/fear/loss` → 各 act の body を上書き
- `personalized_copy.personalized_hook/cta` → hook / cta_text

## 配線（Phase 6-1 / 1-4 で修正済み）

`enrichment-jobs-runner-phases.ts: processReportPhase` が report 生成後に `autoPersonalize(companyId)` を呼び、②を `meta.personalized_copy` に永続化する。これ以前は **②が enrichment で未呼出**だったため、全レポートが generic 表示になっていた（品質ブラックボックスの根本原因）。

## テンプレ適用ロジック

`matchContentTemplate` + `getTemplatesByIndustry` + `inferVariant` + `appealAngleFor` + `normalizeTemplateVariant` + `getRoutingMeta` の6関数が、`reportLocale / targetCountry / industry / templateVariant / appealAngle / issues` から選定する。選定理由は `content_template.dify_selection_rule` に格納（GUI 表示は 6-2 で拡張予定）。

## Dify 正本化のアップグレード点（決定: Dify 正本 / DeepSeek fallback）

②のレポート本文は現状 DeepSeek が正本。`DIFY_KARTE_TO_REPORT_API_KEY`（または `DIFY_KARTE_TO_REPORT_KEY`）を Coolify env に設定すると、Dify karte→report ワークフローを本文の正本に昇格できる（`personalize.ts` に Dify 経路を追加する想定）。現状 Coolify には未設定のため DeepSeek が稼働中。

## 捏造禁止（品質ゲート）

- `diagnostic.ts` が `sanitizeBlocks`（`hallucination-guard`）で meta blocks の幻覚フィールドを除去
- 各 system prompt が「未検証の法務/罰金/CAGR 断定禁止」「保証文言禁止」「推定/業界平均と明記」を強制
