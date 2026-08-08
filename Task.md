# Paradigmjpcom Task

## CURRENT STATUS — 2026-08-07 生成モデルの商用ライセンス監査（未着手 / 調査のみ完了）

- `src/lib/sales/comfyui-workflows.ts` の既定 checkpoint が、VaaS（Essential $1,500／Unlimited $3,500／Priority $5,500）の有償納品で使われる状態になっている。ライセンス条件を確認した結果、**出力物の販売ではなくモデル自体の商用運用に条件が付く**ことが判明した。
- `flux-dev-fp8.safetensors`（9ワークフローで既定使用）— FLUX.1 [dev] Non-Commercial License。**Outputs はBFLが所有権を主張せず「commercial purposes を含む任意の目的」で使用可**（競合モデルの学習・蒸留のみ禁止）。一方 Non-Commercial Purpose の定義は "revenue-generating activity" と "direct interactions with or that has impact on end users" を明示的に除外しており、有償サービスのパイプライン内でモデルを実行する行為は無償ライセンスの範囲外。BFLの商用／セルフホスティングライセンス取得、FLUX.1-schnell（Apache-2.0）への差し替え、FLUX.2 の Builder/Platform ティア購入のいずれかが必要。
- 同ライセンスは利用者に**コンテンツフィルタの実装を義務付け**、CSAM および非同意の親密画像の生成を禁止している。フィルタは任意の安全対策ではなく契約上の義務。
- `svd-fp16.safetensors`（動画・img2vid）— Stability AI Community License。年間売上の閾値以下であれば商用可、超過時は Enterprise ライセンス。現在の閾値と適用条件は要確認。
- `animatediffModel.safetensors` / `mm_sd_v15_v2.ckpt` — OpenRAIL-M 系。商用可だが使用制限条項あり。条項の確認が未了。
- `docs/knowledge/video-as-a-service-operating-system.md` の「標準採用モデルは商用利用条件が明確なものを優先し、モデルごとのライセンス、地域制限、再配布条件を案件開始前に確認する」に対し、既定値がハードコードで方針を上書きしている状態。checkpoint 名を DB 化し `commercial_ok` が真のモデルのみ選択可能にする構造対応が必要（A-CONTENT準拠）。
- 未着手: ① 全 checkpoint のライセンス確定と台帳化 ② 商用可モデルへの差し替えまたはライセンス購入の判断 ③ `models` テーブル新設と生成ジョブからの参照強制 ④ コンテンツフィルタの実装。**判断が出るまで有償納品での該当ワークフロー使用は保留。**

## CURRENT STATUS — 2026-08-07 Japan Entry LinkedIn運用設計（設計完了 / 外部送信0）

- Japan Entry Partnerの海外SMB向けLinkedIn運用を「発信（週3投稿＋日次コメント）」「接触（接続申請→観察メッセージ）」の2トラックで定義した。運用仕様は `docs/knowledge/linkedin-japan-entry-outreach-operations.md`。
- 接触は売り込まない4ステップ（D0コメント → D2接続申請 → 承認後観察メッセージ → D+5診断ツール）とし、SALES-CENTERルール4の「教えてあげる」体裁をLinkedInへ移植する。自動化ツールは使用しない。
- 投稿は新規執筆せず既存英語ブログ22本（`src/lib/japan-entry-blog*.ts`）を1記事3〜5投稿へ分解し、反応の良いものだけをブログ記事へ昇格させてpSEO/GEO資産に還流させる。
- 無料アカウントはパーソナライズドノート月5通程度でoutboundが成立しないため、Sales Navigator Coreを参入条件とする。
- 地域は3 Tier順次投入に確定した。Tier1（W1-6）シンガポール／韓国テック／豪州、Tier2（W7-14）米国／英国、Tier3（W15-）UAE／サウジ。1日15-20接続の上限により同時並行はしない。
- 台湾・タイはLinkedIn浸透率が低く到達できないため本運用の対象外とし、別チャネル設計へ回す。中東は逆方向（日本→中東）需要の可能性がありJapan Entryとは別商品として扱う。
- Apolloは無料プランでPeople Search APIが使用不可、かつコールドメールを主経路としない設計上Sales Navigatorと機能重複するため、本ワークフローでは使用しない。
- 英語プロフィール文面（Headline／About）を確定しdocsへ記載した。USCPA資格は訴求軸に含めず「東京拠点のJapan Entry専門家」に統一する（2026-08-07ユーザー判断）。
- LinkedInアカウントは初期状態（見出し`OtherのUSCPA`、会社`Other`、写真・バナー・Aboutなし、つながり1、投稿0、プロフィール言語 日本語のみ）。英語プロフィール追加とプライマリ化を入力し保存操作まで実施したが、Chrome拡張切断のため**保存成否は未確認**。次回接続時に検証する。
- 未着手: ① 英語プロフィール保存の確認とAbout入力 ② 写真・バナー・カスタムURL・Experience（`Other`置換）・Featured ③ Week 0のつながり50〜100件積み上げ ④ Sales Navigator Core契約可否 ⑤ 台湾・タイ向け別チャネル設計。LinkedInへの投稿・接続申請・DM送信はいずれも未実施。

## CURRENT STATUS — 2026-07-28 Video制作パイプライン標準化（HyperFrames＋ComfyUI）

- 公開価格は変更しない（Essential `$1,500/月`、Unlimited `$3,500/月`、Priority `$5,500/月`）。価格はAI実行時間ではなく、企画・ブランド設計・修正・派生・ローカライズ・最終QAを含む承認可能な完成動画に対するものとする。
- `generateProfessionalVideo`を実運用オーケストレーターへ変更した。会社／診断レポートを入力に、ComfyUIの背景・Bロール・サムネイル（必要時のみアバター・動画）を並列生成し、HyperFramesの決定的な最終合成を独立レーンとして実行する。
- ComfyUI各レーンとHyperFramesレーンは個別に成功／失敗を返す。未設定・一部失敗でも成功レーンを破棄せず、エラーをQAで確認できる。最終採用は人間が行い、権利・ブランド・事実・字幕・音量・テンポを確認する。
- ブランドごとのMotion System（色、フォント、ロゴ、CTA、トランジション、字幕、音量、アスペクト比、テンプレート、ワークフロー）を初回に定義し、以後はブリーフ差し替えで量産する。`docs/knowledge/video-as-a-service-operating-system.md`に運用境界と権利方針を追記した。
- エンリッチメント自動処理からの複合レーン切り替えは`PROFESSIONAL_VIDEO_PIPELINE_ENABLED=true`の明示オプトインとし、認証済みComfyUIがない環境では従来のHyperFrames診断動画へフォールバックする。

## CURRENT STATUS — 2026-07-28 Initial Japan Country Partnershipを90日へ変更（実装中 / 外部送信0）

- Japan Entryの標準オファーを`$15,000`のJapan Market Setup＋Go-Live Dateから90日間のInitial Japan Country Operationsへ統一する。
- 契約日ではなくGo-Live Dateを運用期間の起点とし、Day 45/65/75/85の継続判断、Day 90の継続契約または引き継ぎを明記する。
- 月額運用価値は`$2,000/月 × 3か月 = $6,000`、Month 4以降は署名済み条件の$2,000/月。広告費・物流・法務・税務・専門家費用など外部費用は別途とする。

## CURRENT STATUS — 2026-07-28 Japan Entry価格を$15,000へ統一（実装中 / 外部送信0）

- 公開サイト、料金表、FAQ・規約・返金ページ、構造化データ、チャット、営業メッセージ、デモ／診断コピーのJapan Entry固定セットアップ価格を`$15,000`（短縮表記`$15K`）へ統一中。
- `$2,000/月 × 6か月 = $12,000`の選定パートナー向け運用価値は別料金要素のため変更しない。
- 既存の履歴リリース記録とマイグレーション時刻は監査用に保持し、現行コード・公開面のみ更新する。

## CURRENT STATUS — 2026-07-28 グローバル市場機会帯のページ内移動（実装中 / 外部送信0）

- 全英語ページのサイトクローム直下に自動挿入されていた `THE OPPORTUNITY COST OF WAITING` 帯を廃止する。トップのファーストビュー直下はサービス説明を優先し、固定ヘッダー周辺の価格訴求を表示しない。
- 市場機会・規制・意思決定の詳細は、既存の `/en/package` 内 `JapanMarketUrgency` セクションに集約する。日本語サイト、独立デモ、レポート、外部送信経路は変更しない。
- `ConditionalSiteChrome`、locale layout、`SiteWrapper` の責務を整理し、不要になった翻訳注入とグローバル帯の依存を削除する。

## CURRENT STATUS — 2026-07-28 英語ヘッダーCTAの中立化（実装・型検査完了 / 外部送信0）

- 英語圏の固定ヘッダー右上CTAを、価格・申込意図を直接押し出す`Apply — $13K`から通常の`Contact`へ変更し、リンクも`/contact?intent=japan-entry`から`/contact`へ統一した。Japan Entryの価格・申込CTAは本文側に残し、ヘッダーはサービス横断の入口に戻した。
- 変更は`src/components/aesop/SiteHeader.tsx`のみ。既存の日本語`お問い合わせ`、CMSナビが有効な国内ルート、モバイルメニュー、外部送信経路には変更なし。
- `npm exec -- eslint src/components/aesop/SiteHeader.tsx --max-warnings=0`、`npm exec -- tsc --noEmit --pretty false`、`git diff --check`を通過。外部送信は行っていない。

## CURRENT STATUS — 2026-07-28 Video as a Service 商用運用PR検証中

- Video as a Serviceの商品設計を3プランに確定した。
  - Essential: USD 1,500 / month、条件を満たすショート動画を月10本まで、同時進行1本、各動画3修正ラウンド。
  - Unlimited: USD 3,500 / month、依頼キュー無制限、同時進行1本、合意ブリーフ内の修正無制限。
  - Priority: USD 5,500 / month、依頼キュー無制限、同時進行2本、合意ブリーフ内の修正無制限、優先キュー。
- Readyとなった標準依頼へ原則2営業日以内に着手する。これは完成・納品時間の保証ではない。
- 申込み、適合確認、Service Order、初回決済、オンボーディング、制作キュー、レビュー、納品、更新・解約までの運用仕様を `docs/knowledge/video-as-a-service-operating-system.md` に定義した。
- 公開用FAQ・日英利用規約、VaaS専用申込フォーム、CRM/Slack用intent・plan保存、Service Order・Client Brief・メールテンプレートを実装した。
- 既存英語Contact Formが全申請をJapan Entryへ強制変換していたため、`video-as-a-service` intentだけを安全に分離し、その他の英語申請は従来どおりJapan Entryへ正規化する。

## ACTIVE HANDOFF

- Branch: `feat/video-as-a-service-commercial-launch`
- PR: #573 `feat: launch Video as a Service commercial operations`
- PR検証でVitest、TypeScript、ESLint、production buildを通し、mainへ統合後に本番公開と公開URL検証を行う。
- 本番公開後、次の運用準備を完了する。
  - Stripeの3商品・月額Priceと請求方法
  - Notion client workspace template
  - Frame.io project template
  - Google Drive folder template
  - 初回ポートフォリオ3〜6本
  - 日本法弁護士による利用規約とService Orderの最終レビュー
- 公開利用規約は事業者向け共通条件であり、案件固有の条件はService Orderを優先させる。

## RELEASE REFERENCES

- Previous Country Partner implementation PR: #565
- Previous production verification run: `30311462742`
- VaaS implementation PR: #573
- VaaS production deployment: pending
