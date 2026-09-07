# スタジオのリリース阻害要因の修復 — 2026-09-08

## 完成条件と今回の範囲

OSSによる低コスト・全ジャンル・短編/長編の商用動画制作が目標。
本番テスト合格も完成条件であり、依存更新やテスト件数を映像品質の改善と
扱わない。今回、新しい動画生成、GPU起動、課金、承認、本番変更は行っていない。

## 依存の修復

既存依存の同一メジャー更新で npm audit を **13件（high 8件）から
2件（high 2件）** に削減。監査除外やチェックの無効化は追加していない。
lockfile上の変更は16パッケージ。新規ライブラリやCMS置換はなし。

- browserslist、fast-uri、hono、ip-address、js-yaml、nanoid、
  postcss-selector-parser、qsとそれらの既存依存を更新。
- Undiciの既存overrideを7.28.0から7.29.1へ更新。
  [公式リリース](https://github.com/nodejs/undici/releases/tag/v7.29.1)を確認。
  **以前のfixAvailable=falseは固定override下の監査結果であり、
  互換修正版が存在しないという意味ではなかった。**
- npmによって重複していたSharp overrideが単一化された。
  実効値 `$sharp` は変更していない。既存Sharpのネイティブ処理もテスト。

未修復の2パッケージ:

1. image-size（公開latest 2.0.2）。ICNS/JXL/HEIF解析の無限ループ。
   [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr)、
   [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq)。
2. payload（公開latest 3.88.0）。上記依存に加え、既定unlock認可の問題。
   [GHSA-jg8r-5jh2-v2xj](https://github.com/advisories/GHSA-jg8r-5jh2-v2xj)。

確認時点で各advisoryに修正版なし。スタジオ以外の共通CMS・画像アップロード
にも影響する。保守フォーク/依存置換は範囲拡大のため、ユーザーに確認済み・回答待ち。
パッケージ名変更で監査を隠す、共通CMSを黙って置換する、監査を迂回して
デプロイすることはしない。

## ローカル検証

- 関連ユニット/API/認証テスト: **11ファイル・64件成功**。
- 新規互換性テスト6件: 実Undiciの認証付きJSON、multipart、Cheerio日本語解析、
  JSDOM、SharpのPNG処理、lockfile/override一致。外部ネットワークは使用しない。
- root `tsc --noEmit`、新規テストのESLint成功。
- 更新した依存で対象Next.jsルートのcompile成功。PC/スマホのブラウザー回帰
  6件を再実行し、保存・曖昧な応答の再送・派生・複製・URL復元・読み取り専用・
  空/エラー表示を確認。スクリーンショットの配置も確認。
  APIはfixtureであり、ローカルにSales Supabase設定はないため、起動時の
  営業キュー復元は設定不足エラーを出す。本番DB・通知・全サイトrelease buildの
  合格ではない。
- 全体Vitest: **327ファイル中322成功、1578件中1563成功・15失敗**。
  元のHEADと元の共有node_modules（Undici 7.28.0）を別スナップショットで検査し、
  同じ15失敗を再現。依存更新による新規回帰とは確認されていないが、
  **全体テスト合格ではない**。
  - `tests/video-factory-provisioning.test.ts`: 1件。既存スクリプト525行が500行上限超過。
  - `src/lib/traefik-origin-lock-release.test.ts`: 1件。旧関数名の静的期待値。
  - `src/components/work/ManualMessageIntelligence.test.tsx`: 4件。
  - `src/lib/sales/manual-japan-entry-service.test.ts`: 2件。
  - `src/lib/sales/manual-work-operator-notice.test.ts`: 7件。
  後3ファイルは旧営業文面/再試行期待値との不一致。安全な現行ルールを
  古い期待値に合わせて戻していない。

新規互換性テストの最終型チェックでJSDOM型宣言不足とFormData型の不一致を
検出。既存Vitestのjsdom環境とUndici自身のFormData型を使用し、追加依存なしで
修正。修正後の6件を再実行して成功。

依存インストールによりworktreeのnode_modulesシンボリックリンクが
独立ディレクトリへ置換された。元の共有依存は変更されていない。
初回中断後、ディスク余裕を確認して同じlockfileのインストールを完了。
原本動画やモデルは削除せず、残容量は約2GiB。大型モデルの追加は避ける。

## 本番の読み取り確認

SSH接続および内部サービスの認証付き `/v1/console/bootstrap` HTTP200を確認。
docker execには起動スクリプトが設定するenvironmentが自動継承されないため、
既存の本番Settings経路を明示して検査。認証値は出力・保存しない。

- `production_ready=false`。
- blocker: ComfyUI endpoint unavailable / GPU VRAM below requirement or not reported。
- runtime workflow/model registryはready。リポジトリの無効化済み既定設定とは
  異なるため、生成前は本番で実際に選ぶID/ハッシュを再確認する。
- hyperframes/playwright/comfyui/ffmpeg/mockは設定上有効。
  blender/manim/liveportrait/musetalk/ossは無効。
- これはGPU停止中の状態であり、Vastの故障の証拠ではない。
  green表示のためだけに課金GPUを起動しない。
- ホストディスク89%、空き約17GB。swap使用中。並列重負荷を追加しない。

認証HTTP200、登録ready、エンジン設定有効のいずれも、人物口パク・同一人物維持・
完成映像の実写品質・SaaS同等品質を保証しない。

## 次の必須条件

共通CMS修復の変更範囲承認後、修正・回帰試験・正式release gateとURL実証。
その後、参照素材を検証した版固定入力と生成処理を接続し、予算制限内で
実動画を作成・再生検証する。制作スキルの初稿/最終の人間レビューは代行しない。
現時点で世界級スタジオ、本番合格、全ジャンル量産完成は未達。
