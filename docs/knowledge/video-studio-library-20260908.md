# 制作ライブラリの版管理 — 2026-09-08

## 目的と現在地

テンプレート・キャラクター・生成レシピの制作条件を、既存のVideo Studio
Controlダッシュボードへ統合する。元の版を上書きせず、派生・別項目への複製・
URLでの版選択ができる。新しい独立ダッシュボードや別DBは作らない。

**登録機能であり、生成への適用は未接続。商用品質・再現性の実証ではない。**
全版はdraftであり、品質承認・公開・GPU/API起動は行わない。
ユーザーのSaaS同等以上・全ジャンル量産という完成条件は未達。

## 実装

- UI: `src/components/video-studio-control/StudioLibraryPanel.tsx` と
  `StudioLibraryForm.tsx`。既存ページ `/ja/admin/video-studio-control` に配置。
  既存の生成台帳が停止していてもライブラリの読み込み・エラーを独立表示する。
- API: `/api/sales/video-studio-library` GET/POST。既存認証・権限を使用。
  GETはoffset/entryId/versionId、POSTは厳格なZodスキーマ。
  32KiBのストリーム読み込み上限。未知のフィールド・URL型の素材ID・
  パストラバーサル・不正なSHA-256・不適切な数値を拒否。
- DB: 既存の `video_factory_generation_events` に
  `event_type=video_studio_library_version`、payload.schemaVersion=1で追記。
  新規テーブル・migration・依存追加なし。
  既存migrationのRLS/FORCE RLS、service_roleのSELECT/INSERTのみの権限を維持。
  サービスキーによるRLS迂回を前提に、全読み出しと派生元確認をactorで限定する。
- Payload認証は個別主体。legacy/workは既存の共通管理者主体のため、
  **同じ共通ログインでは共有ライブラリ**。個人専用とは表示しない。
  webhook/未知の主体は拒否。グローバル生成台帳の既存クエリから
  ライブラリイベントを除外し、別主体の設定を露出させない。
- UUIDのoperationIdを保存イベントIDとして使用。初版はentryIdと一致。
  同じID・同じ内容の再送は保存済み版を返す。内容変更は409。
  INSERT競合後も同じ主体・同じ内容の場合だけ再送として回収。
  派生元は同じentryId/種別が必要。履歴は分岐可能で、線形の最新版ロックではない。
- 保存時点の正規化済み入力をSHA-256で照合。指紋にはoperationIdや派生元も含む。
  同じ映像・ファイルが存在する証明でも、複製間の画質一致保証でもない。
- 通信失敗後は同じ保存IDとスナップショットを維持して再送できる。
  曖昧な結果ではフォームを固定する。保存成功後の一覧取得失敗は再登録しない。
  保留状態はタブ内メモリのみで、閉じる前に結果確認が必要と表示する。
- 初回保存は既存notifyBothChannelsでベル+Slackを試行する。内容は汎用通知のみ。
  共通notifierは完全な重複排除を保証しないため、保存再送では通知しない。
  通知失敗はwarning、再送時の過去通知結果はunknownとして表示する。
  通知の永続outbox・自動修復は未実装。保存自体の再送安全性とは分ける。
- 保存応答後に一覧を更新。別端末の変更は明示的な更新ボタンで取得。
  常駐polling/cronは追加しない。全端末Realtime完了とは扱わない。

## 品質ゲートの正直な表示

参照素材ID/SHAは宣言のみ。テンプレートはcomposition、人物はidentity/voice、
レシピはmodel/workflow/runtimeとseed/stepsの未固定を表示。
すべての版に以下の未完了条件が残る:

1. 素材本体・ハッシュ・利用条件のサーバー検証。
2. 実生成、人物一貫性、完成映像のレビュー。
3. パイプラインへの適用。

架空の成人キャラクターのみを登録する契約。競合SaaSの固有キャラクターや
権利付きテンプレートをコピーしたカタログではない。存在しない合格例は表示しない。
次の実装は実素材台帳との照合と実ワークフローへの版固定入力であり、登録数を
増やすこと自体を品質改善・量産完成とは評価しない。

## 検証とリリース状況

- 既存を含む関連Vitest 49件成功（新規25件）。型チェック・対象ESLint成功。
- repositoryテストはPostgRESTのクエリ条件とunique制約を模したテスト用DB。
  本番DBでの保存、実RLSの負例実行、実ベル/Slack到達は未検証。
- PC/スマホのローカルブラウザー回帰 **6/6成功**。API応答はテストfixtureであり、
  本番DB連携や人物生成の品質検証とは区別する。
  実際のNext.js対象ルートをcompileし、localhost:3088で本番モードを起動して検査。
  全サイトのrelease buildではない。PC/スマホのスクリーンショットも目視確認。
  初回は6番目のテストのログインが既存5回/分制限に抵触。認証制限は維持し、
  各プロジェクト内のテストで取得済みCookieを再利用して全件再実行した。
- 初回ローカルbuildはENOSPC。原本には触れず、作業用worktreeの
  `.next/cache/webpack` 約2.2GiBだけを削除（再生成可能）。
  Next.jsの[ビルドキャッシュの説明](https://nextjs.org/docs/app/guides/ci-build-caching)
  とローカル実体を確認。選択buildのsrcパス解決にも問題があり、インストール済み
  Next.jsのテスト用NEXT_PRIVATE_APP_PATHSで対象ルートを指定して検証する。
- 2026-09-08現在のnpm audit: 13件 / high8件、image-size/payload/undiciは
  fixAvailable=false。本番URL `/ja/admin/video-studio-control` はHTTP404。
  PR #740はdraft。監査無効化・正式release gate迂回・本番反映の主張はしない。

Next.js / Supabase / Reactスキルに従い、既存の認証とDBを再利用し、
サーバー専用処理を分離、版を上書きしないAPI、独立した読み込み/空/エラー状態を採用。
