# POSS — Paradigmjpcom Implementation Detail Reference

> **Anti-Bloat Layer 3 / CEP 永久ルール (2026-05-08)**: paradigmjpcom/CLAUDE.md の実装ディテールを本ファイルに外出し。
> CLAUDE.md は「ナビゲーション + 不変ルール」のみ保持し、本ファイルは「実装ディテール」を集約。
> セッション中は CLAUDE.md → 本ファイルへの link を辿って必要時のみ参照する設計。
> 詳細仕様: → `~/.claude/knowledge/cep-content-externalization.md`

---

## 📋 目次

| # | セクション | 元の CLAUDE.md location |
|---|-----------|------------------------|
| 1 | [コールドアウトリーチ戦略 (`/ja`)](#cold-outreach-jp) | s9-7 |
| 2 | [`/en` 海外 SMB 向けアウトリーチ戦略](#cold-outreach-en) | s9-8 |
| 3 | [12-locale PPP 補正価格表](#ppp-pricing) | s3 |
| 4 | [フォルダ構成](#folder-structure) | s7-2 |
| 5 | [API エンドポイント](#api-endpoints) | s7-3 |
| 6 | [Supabase CMS テーブル](#db-schema) | s8-2 |
| 7 | [デザインシステム (新・確定)](#design-system) | s8-1 |

---


## <a id="cold-outreach-jp"></a>1. コールドアウトリーチ戦略 (s9-7)

### コールドアウトリーチ戦略（需要創出フロー）

> フレームワーク詳細 → [knowhow-57 需要創出メカニズム](~/.claude/knowledge/business-knowhow.md) / フロー図: [`docs/artifacts/paradigm_demand_creation_flow.svg`](docs/artifacts/paradigm_demand_creation_flow.svg)

**4つの非対称性**で業界平均CVR（0.3〜1%）→ Paradigm方式（4〜8%）を実現:

| 非対称性 | 従来営業 | Paradigm方式 |
|---------|---------|------------|
| **時間** | 顧客が困った後に訪問 | 困る前に提案書が届いている |
| **情報** | 双方同じ情報量 | Paradigmだけが会社固有の機会損失額を保有 |
| **数字** | 「良くなります」（定性） | 「月¥280万損失」（定量・反論困難） |
| **姿勢** | 「契約してください」 | 「問題を発見しました」（医師の姿勢） |

**機会損失算出エンジン（技術設計）** — 公開情報のみ・完全合法:

| Layer | 主要ツール | 取得情報 |
|-------|-----------|---------|
| L1 パッシブ観測 | Wappalyzer / PageSpeed API / SSL Labs / Mozilla Observatory / crt.sh | 技術スタック/Core Web Vitals/TLS評価/セキュリティヘッダ/サブドメイン |
| L2 標準アクセス | Lighthouse CI / SimilarWeb API | パフォーマンス詳細/流入推定 |
| L3 金額変換 | DeepSeek V3 + Context Caching | 業種別CVR×客単価×損失量=機会損失額（90%OFFで大量処理） |

**金額変換ロジック**（Google公表データ+SimilarWeb推定値使用）:
- 表示速度: LCP 1秒遅延 → 離脱率+32% × 流入数 × 業種CVR × 平均客単価
- モバイル未対応: モバイル流入60〜70% × CVR 1/3低下 × 客単価
- SEO損失: 現在流入 vs 業種平均流入の差分 × CVR × 客単価

**HOT Lead Detection** — 閲覧タイミングを逃さない:
- トリガー: `/p/[slug]` 3回以上閲覧 / 特定セクション5分以上滞在 / CTAクリック
- アクション: Slack #all-paradigm 即時通知 → **5分以内に電話**
- 根拠: Harvard Business Review — 5分以内フォローアップで成約率10倍

**Step4: スコアリング＋レポート自動生成**（L1〜L3データを統合）:
- DeepSeek V3（Context Caching）でJSON→機会損失額・危険度スコアに変換
- Puppeteer or `@react-pdf/renderer` で「〇〇社様向け：Webシステム老朽化・機会損失診断レポート」を自動PDF出力
- 1ページ目: 機会損失額・危険度（信号色）・補助金後実質負担額・投資回収期間のエグゼクティブサマリー（経営者が3秒で決断できる設計）
- 2ページ目以降: Wappalyzer/Shodan/LighthouseのRAWエビデンス

**⚠️ 法的リスク（パッシブ vs アクティブスキャン）**:
- ✅ **合法（パッシブ）**: Lighthouse API（通常アクセスと同じ） / Wappalyzer CLI（ソースコード読取） / Shodan API（既収集データの検索）
- ❌ **危険（グレー〜ブラック）**: Nmap/Nucleiで相手サーバーに直接大量パケット送信 → 不正アクセス禁止法抵触リスク
- 推奨: Shodan過去データ + Lighthouse表示速度の組み合わせだけで十分な痛み可視化が可能

**コールドメール黄金構成（4ステップ）**:
1. **パーソナライズ挨拶**: 「御社のサービスを実際に使ってみたのですが〜」（テンプレ感を消す）
2. **権威データ+痛みの提示**: Google/経産省/Baymard等の第三者データを主語にしてリアクタンス回避（「御社が悪い」→「市場環境として〇〇が起きている」）
3. **当事者意識への変換**: 「外部ツールで御社を簡易計測したところ、月間約〇万円の機会損失が出ている可能性がございます」
4. **救世主の提案**: 具体的な改善ポイントをまとめた3分で読めるURL（`/p/[slug]`）を提示

**技術的負債→補助金コスト逆転クロージング**（部分改修→フルリニューアルへの誘導）:
- Step1「シロアリの家」比喩: 「表面の壁紙だけ張り替えても基礎のシロアリは消えない。継ぎ接ぎで毎年〇〇万円が消える」
- Step2 コストの逆転現象: 「部分改修100万円（自費）< フルリニューアル300万円の補助金後75万円（国が2/3負担）」→高額案件の方が安くなる逆転提示
- Step3 利得フレームは最後: 痛みを消してから初めてAI・MA等の新機能を語る（最初から語ると売り込みになる）
- **主治医ポジション確立**: このフロー全体を通じて「単なる業者」→「利益の漏れを止める主治医（パートナー）」へ昇格 = コンペ回避・特命受注の構造

**メールフォーマット鉄則**:
- テキスト中心（HTML・画像多用は「メルマガ感」→返信率低下）
- 添付ファイル初回NG（セキュリティフィルターで高確率ブロック・2通目以降OK）
- URLは独立行に配置（前後に空行）
- 余白（最大3行/段落）・箇条書き・太字1〜2箇所・記号（■▼【】）でテキストのままプロ感を演出

**技術データ→費用対効果変換ロジック（3計算式）**:
- **CVR損失（PageSpeed→売上損失）**: LCPが1秒遅い毎にCVR 7%低下（Google研究）→ `現在LCP値 × 月間セッション数 × 平均客単価 × 7%` = 年間機会損失〇〇万円。「表示速度3.2秒」→「年間推定損失83万円」のように技術スコアを金額に直訳
- **脆弱性リスク額（CVE→賠償リスク）**: Shodan検出のCVE CVSSスコア × 中小企業向けサイバーリスク賠償目安（経産省基準1,500〜2,400万円）= 「放置コスト」。Port 3389 open（CVSS 9.8）→「賠償2,400万円が顕在リスクとして存在」
- **工数削減額（技術スタック→開発コスト）**: Wappalyzer検出の旧技術スタック（PHP5/jQuery1.x/CodeIgniter2等）は最新比1.5〜2倍の開発工数→年間エンジニア工数ロス × 時給換算 = 「技術的負債〇〇万円/年」で経営者言語化

**キラーフレーズテンプレート**（DeepSeek V3で自動生成・件名〜本文で使用）:
- 件名: 「【無料診断結果】御社Webサイトで月間〇〇万円の機会損失が確認されました」
- 件名: 「【重要】御社のセキュリティ診断でCVSSスコア9.2の脆弱性を検知しました」
- 冒頭: 「業種・従業員規模が類似する〇〇社のWebリニューアル事例をまとめた3分レポートを作成しました」（第三者事例→リアクタンス回避）
- ROI提示: 「補助金適用後の実質負担は〇〇万円。現在の月間機会損失〇〇万円から算出すると〇ヶ月で完全回収が見込まれます」
- CTA: 「詳細はこちら（3分で読めます）→ https://paradigmjp.com/p/[company-slug]」

**予約システム別解剖ポイント（リプレイスターゲットマップ）**:

| ターゲットシステム | URLパターン検知 | 突きつける痛み |
|---|---|---|
| ホットペッパービューティー | `beauty.hotpepper.jp` | プラットフォーム税（高額掲載料）+ 顧客データが自社に残らない |
| AirReserve | `airreserve.net` | 汎用UIで高級感を毀損 + 予約導線のUX離脱 |
| Reservia | リンクスキャン | SNSからの導線が重い + Instagram予約連携の不整合 |
| STORES予約（Coubic） | `coubic.com` | 美容特有の「指名+メニュー組み合わせ」に不向き |
| EPARK | `epark.jp` / `mitsuraku.jp` | 予約画面が広告だらけで重い + ブランド毀損 |
| DentNet/アポデント | URLパターン特定 | 患者側UXが二の次 + キャンセル率高い |
| 自社開発・オンプレ | SSL未対応/スマホ崩れ | 技術的負債 + スマホ予約不可 + 補助金でゼロ円移行提案 |

**業種別3解剖ポイント＋ROIロジック**:
- **予約離脱（カゴ落ち）**: Lighthouse + スマホ実測。完了まで5ステップ + 表示3秒超→30〜40%が離脱。「月間〇件の新規予約取りこぼし × 客単価」で損失額を提示
- **電話対応・機会損失**: 夜間テストコール or 営業時間データで「24時間AIチャットボット未導入＝夜間予約ゼロ」を可視化。受付スタッフ1人分の人件費（月〇〇万円）削減効果と合算
- **リピート率・休眠顧客**: SNS更新頻度 + LINE連携有無で「溜めるだけの顧客名簿」を特定。AI自動追客で年間LTV〇〇万円底上げのシミュレーション提示

**ニッチ業界攻略（ペット葬儀/墓/造園/特殊清掃/旅館等）**:
- 攻略原則: 「ITの専門家が自分の業界に興味を持ってくれること自体が珍しい」→業界特化データ×個別診断のセットで返信率爆発
- テンプレ: 「ペット葬儀業界に特化した機会損失診断を行いました。〇〇様、夜間に亡くなった飼い主がスマホで検索した際、表示が〇秒遅いだけで競合に流れているデータが出ています…」
- 各業界の痛み: ペット葬儀（24時間即時性）/ 墓・石材（相続人（スマホ世代）リーチ失敗）/ 造園（施工実績の見せ方 + 概算見積もり即時化）/ 旅館（OTA手数料＝プラットフォーム税）

**APK解析詳細（アプリ診断の最強フック）**:
- **ハードコードAPIキー露出**: MobSFでAPK解析→FirebaseやAWSの管理キーがソースコードに直書きされているケースを特定→「外部から顧客データが抜き取られる致命的な欠陥」が最強キラーフレーズ。アプリ案件は1件数百万〜数千万円のため信頼獲得効果が絶大
- **過剰権限（Permissions）**: 業務に不要な権限要求を特定→「スパイウェア疑惑でインストール離脱率〇%増加」として提示
- **APK自動化フロー**: PlayストアURL入力→APK取得→MobSF静的解析→JSON抽出（脆弱性スコア/古いSDK/ハードコードキー）→ROIレポート自動生成。まずはストアメタデータ（最終更新日/レビューNLP）から始め、本格展開でMobSF Dockerコンテナを追加

**競合SaaSリプレイス（ホスタイル・リプレイス）フロー**:
- **フットプリント収集**: Wappalyzer/BuiltWith → サブドメインスキャン（`client.competitor-saas.com`）→ Google Dorking（`intext:"Powered by [競合名]"`）→ 競合事例ページスキャンで利用企業リスト自動生成
- **ワンクリック移行ゼロ宣言テンプレート**（レポート末尾自動挿入）: 「顧客データ・予約履歴100%自動変換 / スタッフ設定そのまま反映 / ダウンタイムほぼゼロ（夜間移行） / 並行運用3ヶ月無料 → 確認後に旧システム解約」。財務トドメ: 「(現状SaaS月額×12) > (弊社SaaS月額×12 + 補助金適用後初期費用)」の不等式を提示

**デジタルヘルスチェック提案パッケージ（診断→処方→手術）**:
1. **診断（無料・フロントエンド）**: Wappalyzer + Shodan + Lighthouse → 「総合スコア32点（レッドゾーン）」で痛みを見える化
2. **処方箋（提案）**: HP/EC/セキュリティのどこに致命的欠陥があるか解説 → 1枚エグゼクティブサマリー
3. **手術（受注・バックエンド）**: 補助金使って全て最新AI/SaaS環境へフルリプレイス

**ご近所デスマッチ自動化エンジン（Tavily × SerpApi × DeepSeek）**:
- **構成**: Tavily API（月1,000回無料・AI向け検索+コンテンツ抽出）+ SerpApi（月100回無料・Googleマップ Local Pack/検索順位）+ DeepSeek V3（Context Caching・JSON整理+レポート文生成）
- **処理フロー**: ①Tavily「地域×業種」検索→近隣ライバルURLをコンテンツ付きで一括取得（スクレイピング不要）②DeepSeek V3でJSON整理（数円）③Lighthouse/WhatWebで全社一括スキャン ④スコアランキング表+PDF自動生成
- **キラーフレーズ**: 「御社は横浜市内の同業10社のスマホ表示速度ランキングで**9位（ワースト2位）**です。1位のA社（○○院）が新患を毎月〇名刈り取っている間、御社のサイトは5秒の待機で患者が離脱しています」→近所の実名でプライドと恐怖を同時刺激
- **法的安全**: Lighthouseの客観スコア・SerpApiの実際の順位という「事実のみ」を使用。「遅い」は事実、「ダサい」はNG

**日本SMBリスト構築（Apollo代替・無料・Google Maps系不要）**:
- BIZMAPS（月100件無料・170万社・タグ検索「SaaS導入積極的/代替わりしたばかり」）
- FUMA（160万社・無料・Pythonスクレイピング可・URLなし→Layer 2で補完）
- **e-Gov 法人番号API**（国税庁・全国300万社・業種コード×地域×設立年フィルタ・完全無料・APIキー不要）
- **⚠️ Apify Google Maps / Gosom等はコスト高のため不採用** → ハローワーク求人API + CommonCrawl CDXで代替
- Indeed/求人ボックス スクレイピング（求人中→予算あり×人手不足シグナル→「事務員採用より弊社AIが月5万で自動化」フック）
- お問い合わせフォームURL自動検知（Python: `contact`/`inquiry`/「お問い合わせ」リンクをURLリストからスキャン→フォーム一覧を生成）

**数万件スケール設計（月1,200〜2,000円・Google Maps系ゼロ）**:
- **Layer 1 企業マスター**: FUMA（160万社・電話/FAX）+ 法人番号API（300万社）→ 会社名+住所でJOIN → Supabase（無料）
- **Layer 2 URL取得 主力**: ①**ハローワーク求人API**（厚労省・完全無料・求人票にHP URL記載あり・求人中シグナル同時取得）②**e-Gov 企業職場情報API**（厚労省・職場環境情報→ホームページURL項目あり）
- **Layer 3 URL補完**: ①**CommonCrawl CDX API**（無料・会社名→ドメイン候補生成→`*.co.jp`で存在確認）②**Wayback Machine CDX API**（無料・過去クロール済みco.jpドメインをフォールバック検索）
- **Layer 4 技術スタック検出**: URL取得済み企業 → **webanalyze**（Go製Wappalyzer実装・並列100ワーカー・OSS）で一括スキャン → CMS/PHP版数/jQuery古さ/HPB依存を自動検出。HTTP Archive BigQuery（月1TB無料）でも `httparchive.technologies.*` × `.co.jp` で大企業補完
- **HPなし企業の扱い**: Lighthouseスキャン不要 → 「デジタル不在の機会損失（月○人が競合へ流出）」訴求に切替 → **Web構築提案の最有望ターゲット**。法人番号APIの住所から郵送DM+FAX+SNS DMに自動切替
- **総コスト**: DeepSeek V3名寄せ/スコアリング $8〜15 = **月1,200〜2,000円で数万件処理**

**4次元リードスコアリング（痛み×予算×技術負債×緊急度）**:
- **Pain（0〜10点）** — ハローワーク求人API: 「Excel入力」+3 / 「データ入力」+3 / 「事務」+2 / 「経理入力」+3 / 複数求人同時掲載+2
- **Budget（0〜10点）** — gBizINFO API: 補助金受給歴あり+5（制度を知っている＝IT導入補助金が刺さる）/ 官公庁入札参加+3 / 資本金1,000〜5,000万+2
- **TechDebt（0〜10点）** — webanalyze: WordPress 5.x以下+4 / PHP 7.x以下+4 / jQuery 1.x+3 / HPB依存+3
- **Urgency（0〜10点）** — 求人掲載30日超+3（採れない=深い痛み）/ 同一職種複数募集+3 / 正社員募集+2
- **総合ランク**: Sランク28+→即電話+AIパーソナライズ動画 / Aランク20〜27→フォーム+Loom動画 / Bランク12〜19→一斉メール / Cランク11以下→ストック
- **自動生成キラーフレーズ（補助金受給歴×求人の組み合わせ）**: 「〇〇様は過去にXX補助金を受給されていますね。現在Excel入力スタッフを採用中とのことですが、IT導入補助金（国が2/3負担）を使えば採用コスト年300万円より安く自動化できます」

**求人データソース3Tier（取得コスト×難易度）**:
- **Tier S: ハローワーク公式API**（最推奨） — 厚労省e-Gov公式・XML/CSV一括DL・有効求人100万件+・アカウント申請のみ（無料）・IPブロックゼロ・合法。アナログSMB（不動産/建設/飲食/地方製造）が最も多く求人を出すPFであり、狙うべきターゲットとの親和性が最高
- **Tier A: Indeed 非公式API（RapidAPI）** — Cloudflare対策が強く直スクレイピングはIPBAN連発→RapidAPI上の非公式Indeed Scraper（Mantiks等）を使えばCloudflare突破・プロキシ管理をAPI側に丸投げ。JSON形式・国指定（jp）対応。月数百〜数千円でDIYスクレイピングの100時間分の工数をアウトソース
- **Tier B: 求人ボックス/タウンワーク等** — 公式API・非公式APIともにほぼ存在しない。Playwright/Seleniumスクレイピングのみ。工数高・IP対策コストあり。Tier S/Aで十分なリードが集まる場合は省略可

**リードソース4Tier（営業価値軸・競合密度×ターゲット質）**:
- **Tier S①: Indeed/求人ボックスアグリゲーター（最速・量重視）** — Indeed非公式API（RapidAPI）× 求人ボックスをまとめて叩くことで複数求人PFを1リクエストで横断取得。競合他社も真っ先に取りに来る激戦ゾーンだが量が多い。「デジタル化に意欲あり・予算あり」企業の濃縮プール
- **Tier S②: ハローワーク直接（ブルーオーシャン・ITに疎い企業濃縮）** — Indeedで求人を出す企業はある程度ITリテラシーがある。ハローワークだけで出す企業は「PC操作すら業務の外注を考えている」地方SMBの純粋培養層。競合他社がIndeedを優先するため**ハローワーク層は無競争ゾーン**。DX提案の成約率が構造的に高い
- **Tier A: 不動産ポータル加盟店（逆張りブルーオーシャン）** — SUUMO/LIFULL等の加盟店はITリテラシーが高いように見えて「ポータル依存＝プラットフォーム税を払い続ける典型」。「月○万円のポータル費用が自社集客システムで代替できる」という逆張り提案がはまる。**封書戦略有効**: 3〜5人規模の不動産屋に封書で送ると社長が直接開封→電話口で「あの手紙だよね？」から商談開始
- **Tier B: クラウドワークス（外注費ゼロ化フレーム）** — 「事務作業を月¥3万で外注している企業」が月¥3万の定期クラウドワークス案件として可視化される。ROI逆転: 月¥3万×12ヶ月=年¥36万の外注費 → 一括¥30万のAI自動化システム導入で即年¥6万黒字転換。「外注費削減」文脈で競合のいない局地戦

**営業資料3点セット（DocSend / Notion / HP）**:
- **診断レポート（矛）**: 機会損失PDF自動生成 / Notion共有URL（Loom動画+FigmaプロトタイプDラフ埋め込み可）
- **商談資料（盾）**: DocSendでPDF配信→**ページ別滞在秒数/転送先追跡/後から差し替え**→料金ページ長時間閲覧を検知してエスパー追客（「料金プランでご不明点はありますか？」その日に電話）
- **自社HP（城）**: 診断後の必須身元調査をクリアする唯一の手段。paradigmjp.comが「地元の信頼できるパートナー」として認識されることで全アウトリーチ施策の成約率が底上げされる
- **注意**: Notionはリッチコンテンツに強いがPDF印刷レイアウト崩れあり→ITリテラシー低い地方SMBはPDF要求あり（DocSend推奨）

**Notion API自動提案ページ（一社一URL・10セクション構成）**:
- **自動化フロー**: Supabase/Google Sheetsのリードデータ → Make/n8n → Notion APIでマスターテンプレート複製 → 動的データ埋め込み → URL自動発行（メール/フォーム送付）→ DocSendまたはNotion共有リンクでトラッキング
- **10セクション構成**: ①ヘッダー（企業名・担当者名・診断スコア） ②HeyGen AIアバター動画（院長の画面操作解説1分） ③診断サマリー（Lighthouse/Wappalyzer/HaveIBeenPwned3指標） ④ご近所デスマッチ競合比較表（SerpApi近隣同業5社スコアランキング） ⑤財務シミュレーション（機会損失額・補助金後実質負担・投資回収期間） ⑥ソリューション提案（課題別処方箋+改善後モックアップ） ⑦同業種事例（実績・数字入り） ⑧サポート工程（14日ロードマップ） ⑨料金プラン（補助金適用で75万円〜・3プラン） ⑩CTA（Calendly直予約+フォーム+WhatsApp）
- **実装**: Python `notion-client` ライブラリ / Make Notionモジュール → テンプレートID複製 → ブロック毎にリードデータ差し込み → ページURLを自動メール送付

**IPトラッキング実装（DocSend開封＋HP訪問の瞬間を検知→即電話）**:
- **List Finder（リストファインダー）**: GA4連携で訪問企業のIPを法人名に逆引き→「どの会社が今日HPを見たか」をSlack通知→即電話。月額数万円〜。国内SMBトラッキングに特化
- **GA4＋逆引きIPカスタム実装**: `gtag` + `ipinfo.io API`（月50,000リクエスト無料）→ 企業名/業種/地域取得 → Supabaseに保存 → n8nでSlack通知（完全無料で構築可能）
- **発火タイミング**: DocSend料金ページ60秒以上閲覧 → 即Slack「🔥HOT: ○○株式会社が料金ページを90秒閲覧」→ 30分以内電話がアポ率最大化

**縦型PDF自動生成スタック（動的長文AIコンテンツ対応）**:
- **正解: HTML + Jinja2 + Playwright**（`page.pdf()`）— コンテンツ量変動に自動対応・`break-before: page`でページ分割制御・Tailwind CSS対応・日本語フォント対応・ChromiumレンダラーでCSS完全適用
- **Marpは不可**: スライド専用（横向き固定）→ 縦型長文診断書・提案資料には不向き（自動改ページ不可）
- **実装パイプライン**: DeepSeek V3でHTML生成（Jinja2テンプレ変数差し込み）→ Playwright Docker（serverless）→ `buffer`をSupabase Storageに保存 → DocSend/Notion埋め込みURL返却

**ヴァンパイア完全体6フェーズ（実装アーキテクチャ）**:

| フェーズ | 処理 | ツール | 出力 |
|---------|------|-------|------|
| ①抽出 | リスト収集 | 法人番号API + FUMA + HTTP Archive BigQuery（月1TB無料）/ BIZMAPS / Apify Maps | 連絡先+技術スタック完備CSV |
| ②診断 | 速度・技術・競合一括スキャン | Lighthouse CI / WhatWeb / DataForSEO / Tavily | スコアJSON |
| ③生成 | パーソナライズPDF/スライド生成 | DeepSeek V3（Context Caching）+ Slidev or HTML+Playwright | 提案資料URL |
| ④配信 | メール/フォーム一斉送信+開封追跡 | Instantly.ai / Gmail API + DocSend | 開封イベント |
| ⑤精査 | 料金ページ60秒閲覧→詳細資料自動生成 | SerpApi（競合順位）+ Shodan（脆弱性）+ HeyGen（AI動画） | 精密提案ページ |
| ⑥錬成 | 商談資料自動更新・Slack通知・電話 | DeepSeek + Notion MCP + Twilio / n8n | 確勝クロージング資料 |

**月総コスト目安**: 基本7,500〜18,000円 + メール配信5,000〜10,000円 + プロキシ2,000〜5,000円 = **総計15,000〜33,000円/月**（Apollo.io代替で完全自前構築の場合）
**最安スケール設計（数万件）**: 法人番号API（無料）+ FUMA（無料）+ HTTP Archive BigQuery（無料）+ Hetzner VPS（700円）+ DeepSeek V3（500円）= **月1,200円**（Tavily/SerpApi/Firecrawl不要）

---

**Fake Loom全自動錬成パイプライン（Playwright + ComfyUI + FFmpeg）**:
- **音声主導アーキテクチャ**: TTS（ElevenLabsまたはXTTSv2）で音声ファイル生成→秒数取得→Playwrightに「〇秒かけてスクロール」を渡す（音声が先・画面が後）
- **Visual-Agnostic台本設計**: 「左にボタン」「上の青いバナー」などの画面指示語禁止。「ページが表示された後に〜」のように音声だけで成立する台本にする
- **3段合成フロー**:
  1. **Playwright**: ターゲットのHPを自動スクロール録画（`page.screenshot()` x n → FFmpegでmp4化）
  2. **ComfyUI（EchoMimic/LivePortrait）**: AI アバターに音声波形を食わせて口パク+瞬き自動生成（透過背景PNG連番）
  3. **FFmpeg PiP合成**: `ffmpeg -i screen.mp4 -i avatar.mp4 -filter_complex "[1]scale=240:240[av];[0][av]overlay=W-w-20:H-h-20" output.mp4`
- **ハイブリッド動画3分構成**: 冒頭15〜30秒（毎回生成・社名/URL読み上げ）→ 中盤1〜2分（テンプレ共通）→ 結び30秒（テンプレ共通）。`ffmpeg -i intro.mp4 -i middle.mp4 -i outro.mp4 -filter_complex concat=n=3:v=1:a=1 final.mp4`
- **「わざと不完全なAI」人間味ハック**: ElevenLabsでStability低下+[breath][chuckle]タグ追加→「完璧なCM」ではなく「手作り感のあるビデオレター」として処理される心理的効果

---

**DXパッケージ6種（Paradigm HP提供サービス・「月給5万円のAI社員派遣」として売る）**:

| # | パッケージ名 | 内容 | 価格目安 |
|---|------------|------|---------|
| ① | 営業DX | ヴァンパイアエンジン一式（リスト収集〜自動送信〜クロージング）| 初期50万+月10万 |
| ② | 顧客対応DX | Dify RAGチャットボット+LINE公式連携+Chatwoot | 初期30万+月5万 |
| ③ | 競合監視DX | 近隣ライバル毎朝LINE通知（Tavily+DeepSeek+LINE Bot）| 初期20万+月3万 |
| ④ | 採用DX | n8n求人票自動収集+Dify RAG面接シミュレータ | 初期30万+月5万 |
| ⑤ | 現場集客DX | LINE写真→DeepSeek Vision→WordPress自動公開 | 初期20万+月3万 |
| ⑥ | 教育継承DX | ベテラン職人AIクローン（Dify RAG+Whisper文字起こし）| 初期50万+月5万 |

**自作自演クロージング（最強デモ）**: ヴァンパイアエンジン自体でアプローチ→商談で「実はこのメールも提案資料もAIが自動生成しました」と種明かし→「このシステムを御社に導入します」がそのまま最強のデモになる

---

**脱SaaS MAスタック（Paradigm実装優先順）**:
- **Listmonk**（OSS Docker）: ステップメール配信基盤。1分数万通・開封率/クリック率をn8n Webhookで返却→Supabase自動更新。Airtable/ActiveCampaign不要
- **NocoDB**（Supabase上に重ねるGUI）: リード・提案書ステータスの管理画面。SQLを書かずにSupabaseを操作できるAirtable代替
- **LINE Messaging API直接接続**: Lステップ（月額¥2〜10万）不要→LINE Messaging API + n8n Webhook + Dify でステップ配信・シナリオ分岐・AI返信を月額ほぼゼロで実現
- **Meta Graph API直接接続**: ManyChat不要→Instagram DMの自動化をn8nから直接実行。コメントトリガー→パーソナライズFake LoomをDM送信
- **メール使い分け必須**: コールドメール=Smartlead（専用MTA・ドメイン評判分離）/ サンクス・通知メール=Resend（到達率高いがコールドで使用すると即BAN）

**ABテスト多次元同時化（n8n分岐設計）**:
- Supabase `ab_experiments` テーブル: `lead_id / variant_avatar / variant_tone / variant_channel / variant_price / opened_at / converted_at`
- n8n分岐ロジック: `Math.random() < 0.5 ? 'fear' : 'hope'` でトーンを自動振り分け→結果を即Supabaseに書き戻す
- 計測対象4変数: ①アバター（若女性/落ち着いた男性/本人） ②トーン（Fear vs Hope） ③媒体（LINE vs メール vs LinkedIn DM） ④価格（一括 vs サブスク）
- Notionダッシュボードまたはメタベース（OSS BI）でリアルタイム勝者バリアントを可視化

**LinkedIn架空アバター×HeyReach（海外SMB向け多垢運用）**:
- ComfyUIで生成した実写級プロ顔画像でSDRアバター垢を5〜10個作成（個人垢が攻めに有効・会社ページではない）
- HeyReach設定: 1垢=1専用レジデンシャルIP自動付与・ブラウザ指紋完全隔離・Unified Inbox。APIでn8nと接続し承認イベントをWebhookで受信
- **⚠️ 2026年3月 LinkedInがHeyReachを狙い撃ちBAN**: メイン垢は絶対繋がない。ステルス優先なら GoLogin+Smartproxy+n8n自作に切替
- ウォーミングアップ: 最初2週間はいいね/グループ参加のみ→その後つながり申請→承認後Fake Loom自動DM→返信が来たらFounder本人がクロージング

**Cloudflare R2（Fake Loom動画配信インフラ）**:
- S3互換API・転送コスト（Egress）完全無料→物量生成した動画の配信コストゼロ
- フロー: n8n → ComfyUI（動画生成）→ FFmpeg（PiP合成）→ R2 `PUT` → 署名付きURL → メール/LINE/LinkedIn DM に埋め込み
- バケット設計: `/fake-loom/{lead_id}/{version}.mp4` で1社1URL管理・DocSendと同様に「誰が開封したか」をサーバーログで追跡可能

---

**補助金ネット pPersonalizeページ実装設計**:

```typescript
// app/hojin/[hojin_id]/hojokin/page.tsx — pPersonalize補助金特化版
// ①ファーストビュー: 推定受給可能額を大字表示
// ②根拠ブロック: 業種×技術スタック×適合率
// ③社会的証明: 近隣同業種の平均採択額
// ④Claimボタン → 行政書士無料相談枠の確保 + 詳細マニュアルDL
// ⑤フッター: 「gBizINFO公開データ + jGrants公募情報を基に算出」
export async function generateStaticParams() {
  // Supabase から hojin_id 一覧取得 → ISR
  const { data } = await supabase.from('hojin_subsidies').select('hojin_id');
  return data.map(({ hojin_id }) => ({ hojin_id }));
}
```

- **「善意の通知」メール件名テンプレ**: `【重要】株式会社〇〇様：未請求補助金に関する診断結果のお知らせ`
- **キラーフレーズ**: `御社の法人番号(XXXXXXXXXX)での補助金受給履歴は現在確認できておりません` → gBizINFO採択DBと突合して「未受給企業のみ」に送付
- **マルチチャネル3層の発火順**: ①pSEOページ先行インデックス（D-3）→②フォーム営業自動送信（D-0）→③SNSメンション企業X垢あれば同日（D-0）→④フォロー（D+3）

---

**行政書士オークション取引所 — Stripe + n8n 実装**:

```typescript
// api/admin/lead-auction/route.ts
// エリア独占権モデル: 地域×業種スロットの月額サブスク管理
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// 行政書士がエリア独占権を購入
export async function POST(req: Request) {
  const { scrivener_id, area_code, industry_code } = await req.json();
  // デポジット（先買いポイント）方式
  const subscription = await stripe.subscriptions.create({
    customer: scrivener_id,
    items: [{ price: process.env.AREA_MONOPOLY_PRICE_ID }], // 月額¥200,000
    metadata: { area_code, industry_code },
  });
  // Supabase に独占権スロット登録
  await supabase.from('area_slots').upsert({
    scrivener_id, area_code, industry_code,
    expires_at: new Date(subscription.current_period_end * 1000),
  });
  return Response.json({ subscription_id: subscription.id });
}
```

- **n8n リード通知フロー**: 補助金Claim発生 → Supabase Webhook → n8n → `area_slots` で担当行政書士を特定 → Telegram/Slack `「⚡ 早い者勝ち！Sランクリード（推定採択額800万円）が入りました。残り枠 1件」` → Stripe即引き落とし → リード情報開示
- **Stripe Webhook で失効管理**: `customer.subscription.deleted` → `area_slots` を `expired` に更新 → 次の入札者にスロット解放
- **ダブルマネタイズ判定**: n8n が `hojin.tech_stack` を確認 → IT導入補助金対象ツール未導入なら IT商材アップセルメッセージを自動付与

**非士業リードオークション実装（Vampire 2.0 — 解体工事/産廃/遺品整理）**:
```typescript
// Supabase: non_gyosha_leads テーブル（非士業業者向け）
// industry: 'demolition' | 'industrial_waste' | 'estate_clearance'
// lead_status: 'open' | 'sold_3' | 'fulfilled'  ← 同一リードを最大3社に並売
// unit_price: 50000 (1リード5万×3社=15万)  成果報酬は別途 deal_fee_pct: 0.15

// app/api/lead-auction/non-gyosha/route.ts
export async function POST(req: Request) {
  const { lead_id, buyer_id } = await req.json();
  const { data: lead } = await supabase.from('non_gyosha_leads')
    .select('sold_count').eq('id', lead_id).single();
  if ((lead?.sold_count ?? 0) >= 3) return Response.json({ error: 'sold_out' }, { status: 409 });
  await stripe.paymentIntents.create({ amount: 50000, currency: 'jpy',
    customer: buyer_id, confirm: true, metadata: { lead_id } });
  await supabase.from('non_gyosha_leads')
    .update({ sold_count: (lead?.sold_count ?? 0) + 1 }).eq('id', lead_id);
  return Response.json({ ok: true });
}
```

**シャドウ・リスティング通知ロジック（n8n）**:
```
[Supabase Trigger: area_slots INSERT] 
→ [Code Node] 同エリア×業種で未購入の業者を抽出
→ [Telegram/LINE Node] 「⚠️ {競合名}がこのエリアをアンロックしました。残り1枠」
→ [Wait: 6時間]
→ [Stripe Node] 未購入業者のデポジットから自動決済 (urgency_purchase)
→ [Supabase Update] area_slots に 2社目を追加
```

**中抜き防止n8nワークフロー（顧客自動フォロー + 密告ボタン）**:
```
[Trigger: deal_status = 'completed'] 
→ [Wait: 14日]
→ [LINE Bot: 顧客向け] 「工事は完了しましたか？満足度を教えてください [1-5] 」
→ [If: 評価 <= 2 OR 直接連絡あり]
  → [Dify] 密告判定（キーワード抽出: 直接払い/割引/紹介）
  → [If: バイパス判定 = true]
    → [Stripe] 業者デポジットから違約金自動引き落とし (penalty: 100000)
    → [LINE Bot: 密告者] 「5万円の密告ボーナスをお支払いします」→ 送金
    → [Supabase] vendor_blacklist に追加
```

**認定バッジ Stripe Subscription 実装**:
```typescript
// 認定バッジ = 月額課金 + スコア改善の双方向ロック
// Supabase: vendor_badges テーブル
// badge_tier: 'bronze'(¥9,800/月) | 'silver'(¥29,800/月) | 'gold'(¥89,800/月)

// app/api/badge/subscribe/route.ts
export async function POST(req: Request) {
  const { vendor_id, tier } = await req.json();
  const priceId = { bronze: process.env.BADGE_BRONZE_PRICE_ID,
    silver: process.env.BADGE_SILVER_PRICE_ID, gold: process.env.BADGE_GOLD_PRICE_ID }[tier];
  const sub = await stripe.subscriptions.create({
    customer: vendor_id, items: [{ price: priceId }],
    metadata: { vendor_id, tier },
  });
  // バッジ = pSEOページのスコア表示に即時反映（ISR revalidate: 60秒）
  await supabase.from('vendor_badges').upsert({ vendor_id, tier,
    valid_until: new Date(sub.current_period_end * 1000) });
  revalidatePath(`/vendor/${vendor_id}`);
  return Response.json({ subscription_id: sub.id });
}
```

**マネタイズ完全体アーキテクチャ（6レイヤー合算式）**:
```
Total = LeadFee(5万×3社) + DealFee(成約額×15%) + SaaS(月額9,800〜89,800) 
        + PaymentFee(Stripe手数料転嫁1.5%) + BadgeFee(月9,800〜89,800) + Affiliate(IT導入補助金紹介料)

// 1案件あたり期待値試算（解体工事・成約300万円の場合）
// LeadFee: 5万×3 = 15万
// DealFee: 300万×15% = 45万
// SaaS: 2.98万/月（silver）× 12 = 35.76万/年
// Total per vendor/year ≈ 95万円超
```

**業者向けアプリ「首輪」実装（Push通知 + 0.5秒争奪戦UI）**:
```typescript
// app/api/notify/new-lead/route.ts — Sランクリード発生時の45秒カウントダウン通知
import { sendPushNotification } from '@/lib/push'; // web-push ライブラリ

export async function POST(req: Request) {
  const { lead_id, rank, area_code, industry_code } = await req.json();
  // エリア担当業者（プラチナ→ゴールド→シルバー の順で time delay をずらす）
  const vendorsByTier = await supabase.from('vendor_subscriptions')
    .select('vendor_id, push_subscription, tier')
    .eq('area_code', area_code).eq('industry_code', industry_code)
    .in('tier', ['platinum', 'gold', 'silver']);

  for (const vendor of vendorsByTier.data ?? []) {
    const delay = { platinum: 0, gold: 600000, silver: 3600000 }[vendor.tier]; // ms
    setTimeout(() => sendPushNotification(vendor.push_subscription, {
      title: `⚡ ${rank}ランク案件（45秒で一般公開）`,
      body: `今すぐ「対応可能」を押した3社のみ閲覧できます`,
      data: { lead_id, action_url: `/leads/${lead_id}/claim` },
    }), delay);
  }
  return Response.json({ ok: true });
}
```

```typescript
// app/leads/[lead_id]/claim/route.ts — 0.5秒争奪戦: 先着3社のみ解禁
export async function POST(req: Request) {
  const { lead_id, vendor_id } = await req.json();
  // Supabase の row-level locking で同時アクセス競合を防ぐ
  const { data, error } = await supabase.rpc('claim_lead', { p_lead_id: lead_id, p_vendor_id: vendor_id });
  if (error || !data?.success) return Response.json({ error: 'sold_out' }, { status: 409 });
  // レスポンス速度をスコアに記録 (response_time_ms)
  await supabase.from('vendor_response_log').insert({
    vendor_id, lead_id, response_time_ms: data.elapsed_ms,
  });
  return Response.json({ lead: data.lead });
}
```

```sql
-- Supabase Function: claim_lead (atomic upsert)
CREATE OR REPLACE FUNCTION claim_lead(p_lead_id uuid, p_vendor_id uuid)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE v_count int; v_lead jsonb; v_elapsed bigint;
BEGIN
  SELECT claimed_count INTO v_count FROM leads WHERE id = p_lead_id FOR UPDATE;
  IF v_count >= 3 THEN RETURN jsonb_build_object('success', false); END IF;
  UPDATE leads SET claimed_count = v_count + 1 WHERE id = p_lead_id;
  SELECT row_to_json(l) INTO v_lead FROM leads l WHERE id = p_lead_id;
  RETURN jsonb_build_object('success', true, 'lead', v_lead, 'elapsed_ms',
    EXTRACT(EPOCH FROM (now() - created_at))*1000)
  FROM leads WHERE id = p_lead_id;
END; $$;
```

**エスクロー決済（客向けアプリ — 工事完了まで業者に支払わない）**:
```typescript
// app/api/payment/escrow/route.ts
export async function POST(req: Request) {
  const { job_id, customer_id, amount } = await req.json();
  // PaymentIntent を capture_method: 'manual' で作成 → 工事完了まで capture しない
  const pi = await stripe.paymentIntents.create({
    amount, currency: 'jpy', customer: customer_id,
    capture_method: 'manual',  // ← エスクローの核心
    metadata: { job_id },
  });
  await supabase.from('escrow_payments').insert({ job_id, payment_intent_id: pi.id, status: 'held' });
  return Response.json({ client_secret: pi.client_secret });
}

// 工事完了時に capture（業者に送金）
export async function PATCH(req: Request) {
  const { job_id } = await req.json();
  const { data } = await supabase.from('escrow_payments').select('payment_intent_id').eq('job_id', job_id).single();
  await stripe.paymentIntents.capture(data!.payment_intent_id);
  await supabase.from('escrow_payments').update({ status: 'released' }).eq('job_id', job_id);
  return Response.json({ ok: true });
}
```

**従業員「ポータブル・レピュテーション」+ チップ直結実装**:
```typescript
// Supabase: worker_scores テーブル（会社に紐づかない個人スコア）
// worker_id: auth.users.id | company_id: nullable（独立後もスコアが残る）
// score: float | jobs_completed: int | avg_customer_rating: float | portable: boolean

// 客側: チップ送金（アプリ未登録の業者は受け取り不可）
// app/api/tip/route.ts
export async function POST(req: Request) {
  const { worker_id, amount, job_id } = await req.json();
  const { data: worker } = await supabase.from('worker_scores')
    .select('stripe_account_id').eq('worker_id', worker_id).single();
  if (!worker?.stripe_account_id) return Response.json(
    { error: 'このスタッフはまだアプリに登録していません。登録を促してください。' }, { status: 400 });
  await stripe.transfers.create({
    amount, currency: 'jpy', destination: worker.stripe_account_id,
    metadata: { job_id, tip: true },
  });
  // チップ受取がスコアボーナスにも直結
  await supabase.rpc('add_score_bonus', { p_worker_id: worker_id, bonus: 0.5 });
  return Response.json({ ok: true });
}
```

**オークション・エスカレーション（Supabase Cron で時間差解禁）**:
```sql
-- pg_cron で10分後・1時間後に通知を段階解禁
SELECT cron.schedule('gold-notify', '*/1 * * * *', $$
  UPDATE leads SET gold_notified_at = now()
  WHERE created_at < now() - interval '10 minutes'
    AND gold_notified_at IS NULL AND claimed_count < 3;
  -- n8n webhook を叩いてゴールド業者へ通知
  PERFORM net.http_post('https://n8n.example.com/webhook/gold-lead',
    jsonb_build_object('lead_ids', array_agg(id)))
  FROM leads WHERE gold_notified_at = now();
$$);
```

**LTV_Human パイプライン（教育→就職→稼働→転職→独立融資）**:
```typescript
// worker のライフサイクルステージを追跡して各フェーズで課金
// stage: 'student' | 'employed' | 'active' | 'transfer' | 'independent'
// 各ステージで発火するマネタイズアクション:
const MONETIZE_BY_STAGE = {
  student:     { action: 'sell_course',      amount: 29800 },      // AI入門講座
  employed:    { action: 'charge_client',    amount: 300000 },     // 入社紹介料（年収30%）
  active:      { action: 'subscription',     amount: 980 },        // 個人スコアサブスク/月
  transfer:    { action: 'charge_new_client',amount: 500000 },     // ヘッドハンティング料
  independent: { action: 'loan_origination', amount: null },       // 融資（返済=売上天引き5%）
} as const;
```

**ABCDE格付け自動生成ロジック（n8n + Dify）**:
```typescript
// app/api/grade/[vendor_id]/route.ts
// Rank = f(公開データ60% + ユーザーレビュー20% + 従業員内部スコア20%)
export async function GET(req: Request, { params }: { params: { vendor_id: string } }) {
  const { vendor_id } = params;
  const [pub, review, internal] = await Promise.all([
    supabase.from('vendor_public_scores').select('score').eq('vendor_id', vendor_id).single(),
    supabase.from('vendor_reviews').select('avg(rating)').eq('vendor_id', vendor_id).single(),
    supabase.from('staff_internal_scores').select('avg(score)').eq('vendor_id', vendor_id).single(),
  ]);
  const composite = (pub.data?.score ?? 50) * 0.6
    + ((review.data as any)?.avg ?? 50) * 0.2
    + ((internal.data as any)?.avg ?? 50) * 0.2;
  const rank = composite >= 90 ? 'S' : composite >= 75 ? 'A' : composite >= 60 ? 'B'
    : composite >= 45 ? 'C' : composite >= 30 ? 'D' : 'E';
  // Eランクは非公開（晒す恐怖でUpsell）
  const public_rank = rank === 'E' ? null : rank;
  await supabase.from('vendor_grades').upsert({ vendor_id, rank, public_rank, composite, updated_at: new Date() });
  return Response.json({ rank: public_rank, composite: Math.round(composite) });
}
```

**五角形スコア RadarChart（Recharts）**:
```tsx
// components/VendorRadar.tsx
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
const AXES = ['レスポンス速度', 'コスト透明性', 'コンプライアンス', 'スタッフ力', '顧客エンゲージメント'];
export function VendorRadar({ scores, compareScores }: { scores: number[], compareScores?: number[] }) {
  const data = AXES.map((axis, i) => ({
    axis, self: scores[i], rival: compareScores?.[i],
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="axis" />
        <Radar name="自社" dataKey="self" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
        {compareScores && <Radar name="競合" dataKey="rival" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />}
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}
// 歪んだ軸 → オプション販売例: レスポンス速度 < 60 → 「緊急対応強化プラン ¥30,000/月」CTA自動表示
```

**介護施設 pSEO 厚労省APIスクレイピング（n8n フロー）**:
```javascript
// n8n: HTTP Request → 厚労省「介護サービス情報公表システム」全件取得
// URL: https://www.kaigokensaku.mhlw.go.jp/api/... (公開データ)
// 取得後: Supabase upsert → /kaigo/[prefecture]/[city]/[facility_id] でpSEOページ生成
// ネガティブキーワード戦略: slug に「-review」「-trouble」「-jinin-ridoku」を追加したページも生成
// metadata.description に「入居前に知っておくべき〇〇ホームの評判と実態」を設定
// LINE CTA: 「スタッフ離職率・監査記録の内部レポートを無料で受け取る」→ LINE登録 → 入居紹介転換
const careHomeFlow = {
  scrape: 'https://www.kaigokensaku.mhlw.go.jp/...',
  upsertTable: 'care_homes', // facility_id, name, prefecture, city, capacity, staff_ratio, violations
  pSEORoute: '/kaigo/[pref]/[city]/[id]',
  negativeRoutes: ['/kaigo/[pref]/[city]/[id]/hyoban', '/kaigo/[pref]/[city]/[id]/trouble'],
};
```

**AI要約テンプレートプロンプト（Dify — 権威付け3手法内蔵）**:
```
あなたは業界格付けシステムのAIアナリストです。以下のデータを分析し、経営者向け要約レポートを生成してください。

【ルール】
1. 算出根拠は「複合AIモデルによる多変数分析」とのみ記載し、詳細は非開示にする（権威付け）
2. 必ず「前月比+X%」「業界偏差値XX」「上位YY%」の3指標を含める
3. 改善余地のある軸には「〇〇強化オプション（月額¥XX,000）で上位XX%に到達可能」を必ず付記
4. 精度注記: 「本レポートの精度は80%です。精度100%版は有料プランで提供しています」を末尾に記載

データ: {{vendor_data}}
```

**M&Aブローカー逆レーマン契約管理テーブル**:
```sql
-- 逆レーマン: 高値成約ほどボーナス率上乗せ（ブローカーの利益相反を排除）
CREATE TABLE ma_broker_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id uuid REFERENCES users(id),
  deal_id uuid REFERENCES ma_deals(id),
  base_fee_rate decimal(5,4) DEFAULT 0.03,   -- 基本3%
  bonus_threshold_jpy bigint DEFAULT 100000000, -- 1億円超で追加ボーナス
  bonus_rate decimal(5,4) DEFAULT 0.01,         -- +1%ボーナス
  escrow_payment_intent_id text,                -- Stripe エスクロー
  status text DEFAULT 'pending' CHECK (status IN ('pending','active','completed','cancelled')),
  created_at timestamptz DEFAULT now()
);
-- 成約時: Stripe PaymentIntent capture → ブローカーに Stripe Transfer 自動送金
-- ボーナス計算: deal_amount > bonus_threshold → fee = deal_amount * (base_rate + bonus_rate)
```

---

**n8n Jitter × ポアソン分布（等間隔送信禁止・クラスター検知回避）**:
- Wait nodeに `{{Math.round(-Math.log(Math.random())*300)}}` 秒を設定（平均5分・実際は1.5〜13分にランダム分散）
- 金額端数も散らす: `¥29,800` 固定値禁止 → `{{28400 + Math.floor(Math.random()*2800)}}` で都度変動
- 実行日も分散: 月曜に1,000件一斉送信ではなく月〜金に200件ずつ。スパイクでメールプロバイダーのスロットリングを回避

**iProxy.online（格安SIM = 自前レジデンシャルIPファーム）**:
- Androidスマホ1台 + 楽天/ワイモバイル格安SIM → iProxy.online経由でHTTP/SOCKSプロキシ化
- n8nから `GET /api/rotate` を叩くだけで機内モードON/OFF → キャリアIPが毎回変わる
- 日本IP専用なら楽天モバイル1枚で100垢を時分割利用可能（月$6〜10）
- HeyReachアバター垢の専用IPとして1垢=1SIM割り当て（BAN防止の最終防壁）

**SMSPool.net + TOTP防弾化フロー（LinkedIn/Xアバター垢の長期生存設計）**:
1. SMSPool.net で Non-VoIP 物理SIM番号を購入（$0.5〜2/回）→ 初回SMS認証突破
2. 認証直後に Google Authenticator 相当の TOTP をセットアップ
3. シークレットキーを Supabase `totp_secrets` テーブルに保存
4. 以降は `pyotp.TOTP(secret).now()` で自己生成 → SMSPool不要・コスト¼
```python
import pyotp, supabase
secret = sb.table("totp_secrets").select("secret").eq("account_id", aid).single().data["secret"]
token = pyotp.TOTP(secret).now()  # 6桁コードを自動生成
```

**Playwright通信量90%カット（物量スキャン・Life Simulatorに必須）**:
```javascript
// すべてのPlaywright自動化の冒頭に挿入
await page.route('**/*', route => {
  const type = route.request().resourceType();
  if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
    route.abort();
  } else {
    route.continue();
  }
});
```
- ヴァンパイアスキャン（1,000件/日）で転送量が10分の1に → Vast.ai/RunPodのコスト激減
- Life Simulator（LinkedIn垢ウォーミング）でも適用 → セッション数を増やせる

**ElizaOS × Playwright Life Simulator（LinkedIn垢のウォーミング自動化）**:
- 垢作成後3〜5日間: Google検索・ニュース閲覧・YouTube視聴（途中離脱）の生活足跡を自動生成
- ElizaOS Character.json で垢ごとに固有人格（職種/関心/投稿スタイル）を設定
- LLMをClaude/DeepSeek/Llamaで垢ごとに分散 → スタイル指紋によるクラスター検知を防ぐ

---

**海外EC 日本ローカライズ戦略（`/en` グローバルヴァンパイア）**:
- **ターゲット抽出**: [StoreLeads](https://storeleads.app/)（Shopify/BigCommerce/WooCommerce店舗DB）で「EC平均月商 $XX万以上 × 日本向け出荷なし × JP対応カート未使用」を絞り込み → 日本進出未参入の海外ECが確実な顕在ニーズ層
- **日本市場損失4指標**（英語アウトリーチの痛み可視化に使用）:
  - **TAM損失**: 「日本EC市場22兆円（経産省2023）のうち御社が取れていない市場規模 = $X.XM/年」
  - **UX摩擦**: 日本語未対応・YEN価格なし・コンビニ払い非対応 → カート離脱率85%超（国内EC平均比+40pt）
  - **SEOゴースト**: 日本語キーワードでGoogle.co.jpにほぼ未インデックス → 月間検索需要〇万件を取り逃がしている
  - **広告費ドブ捨て**: 日本IPからの流入があっても日本語LP未整備 → 広告費$XX/月が完全無駄
- **英語キラーフレーズテンプレート**（Subject → Body CTA の流れ）:
  - Subject: `[Company Name] is missing out on $X.XM in the Japanese market`
  - 冒頭: `I ran [Company Name]'s site through our Japan Market Readiness Scanner — you're currently invisible to 48M Japanese online shoppers.`
  - 痛みトリガー: `Your cart abandonment rate from Japanese visitors is likely 85%+ due to no JPY pricing, no Japanese payment methods (konbini/PayPay), and English-only checkout.`
  - 救済CTA: `We've helped [Competitor/Similar Brand] capture $XXK/month from Japan within 90 days. Here's a 3-min breakdown specific to [Company Name]: https://paradigmjp.com/en/p/[slug]`

<a id="s9-6"></a>


---

## <a id="cold-outreach-en"></a>2. /en 海外 SMB 向けアウトリーチ戦略 (s9-8)

### `/en` 海外SMB向けアウトリーチ戦略（Japan Entry Package販売）

> `/ja` 国内SMB向けはs9-5参照。こちらは英語でアプローチする海外企業向けの専用戦略。

#### リードリスト構築（無料〜低コスト・Tier別）

| Tier | ソース | 抽出方法 | 特徴 |
|------|-------|---------|------|
| **S（最高質）** | Kickstarter/Indiegogo成功プロジェクト | バッカーコメントで日本人比率が高いプロジェクトをスクレイプ → 運営者メール特定 | 「日本市場に潜在需要があると証明された」層。説得不要 |
| **A** | Product Hunt | PH Launch直後の「Japan」「Japanese market」タグ付き製品、または説明文に「expanding to Asia」含む | 今まさに成長フェーズ・拡張意欲が高い |
| **B** | Meta Ads Library | `meta.com/ads/library` で「Japan」含む広告を出稿中の海外ブランド特定 | 日本向け広告費を払っているのにJP対応サイトがない → 予算あり・ミスマッチ |
| **B** | Amazon US ベストセラー × Amazon.co.jp未出品 | Amazon US Top 1,000から `keepa.com` APIでASIN取得 → Amazon.co.jp で同ASINの有無チェック | 商品が証明済み・日本ECチャネルだけ空白 |
| **C** | 展示会出展者リスト | Tokyo Game Show / Tokyo Motor Show / Foodex等のOfficial exhibitor PDFをパース → メールスクレイプ | 日本に既に来る意欲がある海外企業 |
| **C** | StoreLeads | Shopify/WooCommerce月商$5K+・日本語版なし・国際送料設定 | [→ s9-5 海外EC 日本ローカライズ戦略](#s9-5)で詳細記載 |

#### コンタクト情報取得ツール（Tier別・確定）

> リードリスト構築（ターゲット企業の特定）→ s9-6 リードリスト構築表が担当。このセクションは**メールアドレス・電話番号等のコンタクト情報取得**フェーズのツール一覧。両者は同一パイプラインの異なるステップで重複ゼロ。

**Tier S — 精度・コスパ最優先（メインスタック）**

| ツール | 無料枠 | 有料 | 特徴 |
|-------|-------|------|------|
| [Hunter.io](https://hunter.io) | 25件/月 | $34/月〜 | ドメイン入力→全メアド一覧取得・Verify機能内蔵・最速 |
| [Apollo.io](https://apollo.io) | 10,000メール/月 | $49/月〜 | メール+電話+LinkedIn+シーケンス一体型・最強コスパ |
| [Snov.io](https://snov.io) | 50クレジット/月 | $30/月〜 | ドメイン検索+メール確認+ドリップキャンペーン機能 |
| [RocketReach](https://rocketreach.co) | 5件/月 | $39/月〜 | LinkedIn/会社HP→メール・電話を直接取得。精度高い |

**Tier A — 特定用途・補完ツール**

| ツール | 無料枠 | 有料 | 特徴 |
|-------|-------|------|------|
| [Cognism](https://cognism.com) | なし | 要見積り | GDPR準拠データベース・EU/UK向け最強。電話番号精度◎ |
| [Kaspr](https://kaspr.io) | 15メール+5電話/月 | $49/月〜 | LinkedIn拡張・リアルタイム電話番号取得。Cognism傘下 |
| [Lusha](https://lusha.com) | 40クレジット/月 | $29/月〜 | Chrome拡張でLinkedIn上に直接表示。簡単操作 |
| [Skrapp.io](https://skrapp.io) | 月50件 | $39/月〜 | LinkedIn Sales Navigator連携・バルクエクスポート対応 |
| [Prospeo](https://prospeo.io) | 75件/月 | $49/月〜 | LinkedInプロフィールURL→メール取得API。n8n連携容易 |
| [Crunchbase](https://crunchbase.com) | 7日トライアル | $49/月〜 | スタートアップ・資金調達企業DB。投資家・創業者特定に特化 |
| [PhantomBuster](https://phantombuster.com) | 2時間/日 | $56/月〜 | LinkedIn/Instagram/Twitter等SNSからの自動スクレイプBot |

**Tier B — ニッチ・補完用途**

| ツール | 無料枠 | 有料 | 特徴 |
|-------|-------|------|------|
| [Wiza](https://wiza.co) | 20メール+5電話/月 | $83/月〜 | LinkedIn Sales Navigator→CSV一括エクスポート特化 |
| [FindThatLead](https://findthatlead.com) | 50件/月 | $49/月〜 | ドメイン→メール取得。スペイン語圏（EU中小企業）に強い |
| [Dealfront/Echobot](https://dealfront.com) | デモのみ | €165/月〜 | DACH地域（独・墺・瑞）特化・GDPR準拠・電話番号精度最高 |
| [Ampliz](https://ampliz.com) | 月10件 | $50/月〜 | アジア太平洋・中東・アフリカ地域特化。グローバル展開時に追加 |
| [ContactOut](https://contactout.com) | Gmail拡張無料 | $29/月〜 | GitHub/LinkedIn→個人メール取得。エンジニア・開発者特定に特化 |
| [IGLeads](https://igleads.io) | トライアルあり | $49/月（無制限） | Instagram投稿・フォロワーからメール収集。D2C・EC特化 |

**OSINT自前構築（完全無料・n8n自動化推奨）**

| 手法 | コスト | 取得情報 | 実装難易度 |
|-----|-------|---------|---------|
| LinkedIn + Crawl4AI | 完全無料 | プロフィールURL・名前・役職・会社 | ★★☆（Python要） |
| CommonCrawl CDX API | 完全無料 | ドメインのサブページ・コンタクトページURL | ★★★（API知識要） |
| Google Maps Places API | $200/月無料枠 | 電話番号・住所・Webサイト・営業時間 | ★☆☆（APIキーのみ） |
| CT Log / crt.sh | 完全無料 | サブドメイン→サービス特定→担当者推定 | ★★★（技術知識要） |
| Wappalyzer API | 月50件無料 | 技術スタック→担当エンジニア特定 | ★☆☆（APIキーのみ） |

**推奨スタック（地域別）**

| ターゲット地域 | メインツール | 補完ツール | 理由 |
|-------------|-----------|---------|------|
| 🇺🇸 US / 🇦🇺 AU | Apollo.io | Hunter.io | 無料枠が最大・精度高い・Shopify/D2C企業DB豊富 |
| 🇬🇧 UK / 🇪🇺 EU | Cognism | Kaspr | **GDPR Legitimate Interest準拠データのみ**使用必須 |
| 🇸🇬 SG / 🇦🇪 UAE | RocketReach | Ampliz | アジア・中東企業のLinkedIn連絡先取得精度が高い |
| 🇸🇪 SE / 🇩🇰 DK / 🇩🇪 DE | Cognism / Dealfront | — | DACH/北欧はGDPR厳格・現地DB必須 |

> ⚠️ **GDPR注意**: EU/UK向けコールドメール送信は「正当な利益（Legitimate Interest）」要件を満たす設計が必要。Cognism・Dealfrontは準拠データを保証。Apollo.io等のUS系ツールをEU企業に使う場合はLI根拠文書を整備すること。

#### 英語コールドメール 4ステップ構成

```
Step 1: Personalized opener（テンプレ感を消す）
  "I actually bought [product] last year — love what you've built."
  "Congrats on [recent launch / Product Hunt feature / Kickstarter milestone]."

Step 2: Pain point（第三者データ主語・リアクタンス回避）
  "Japan is the world's 3rd-largest e-commerce market ($180B), 
   but 78% of overseas brands lose Japanese visitors at checkout 
   due to no JPY pricing or Japanese payment methods (Mercari, konbini pay)."
  ※ 「御社が悪い」ではなく「市場環境がこうなっている」と提示

Step 3: Specific signal（相手の現状を可視化・医師ポジション）
  "I ran [domain] through our Japan Market Readiness Scanner — 
   you're currently invisible on Google.co.jp for [product category keywords 
   with ~X,000 monthly searches]."
  ※ Wappalyzer + SerpApi + Lighthouse で自動生成

Step 4: Low-friction CTA（Zoom不要・非同期ファースト）
  "Here's a 3-min breakdown I put together for [Company Name]: 
   paradigmjp.com/en/p/[company-slug]
   No call needed — just let me know if it looks relevant."
  ※ Zoom提案をしない。相手のペースに委ねる設計が返信率を上げる
```

#### 非同期販売（Async Sales）設計

- **Zoom不要ファースト**: 初回〜2回目までは非同期。Loom動画（2〜3分）+ テキストのみで完結させる
- **Zoom開催時の翻訳ツール**: 英語商談が必要な場合は以下を活用

| ツール | 特徴 | 用途 |
|-------|------|------|
| **Deeptrue** | 日本語↔英語リアルタイム通訳（AIアバター型）| Zoomに接続・ほぼネイティブ品質 |
| **VoicePing** | チャンネル分離型同時通訳・低遅延 | 複数言語対応が必要な商談 |
| **JotMe** | 会議録音→多言語要約→議事録自動生成 | 会議後フォローアップ資料に |
| **Fathom / tl;dv** | Zoom録画→AIサマリー→CRM自動連携 | 商談記録・Twenty CRM連携 |

- **1週間英語商談準備ワークフロー**（英語に自信がない場合のプロトコル）:
  1. **D1〜2**: DeepSeek V3 で「Japan Entry Package for [相手業種]」の英語ピッチスクリプト（3分）を生成
  2. **D3〜4**: ElevenLabs Speech Synthesis でスクリプトを読み上げ → シャドーイング練習（発音矯正）
  3. **D5〜6**: Gemini Live（リアルタイム会話AI）と模擬商談ロールプレイ（「あなたはShopify D2Cの創業者です」プロンプト）
  4. **D7**: ELSA Speak で頻出フレーズの発音スコアを確認・仕上げ
  5. **当日**: Fathom録画ON + Deeptrue待機 + 冒頭の「survival phrases（Nice to meet you / Let me pull up the slide / Could you repeat that?）」で会話開始

#### Closerコミッション設計（外部営業委託時）

- **コミッション**: 初期費用の **30〜50%**（月額リテイナーは含まない）
- **例**: Standard Launch $5,000成約 → Closer $1,500〜$2,500（支払いは入金確認後7日以内）
- **採用チャネル**: Upwork「Japan market sales」/ LinkedIn「commission-only B2B Japan entry」/ Expat Japan business Facebookグループ
- **優先プロフィール**: Japan DeskまたはJapan事業経験のある海外SalesフリーランサーまたはJapan-based expat（日英バイリンガルまたは英語ネイティブ×日本在住）
- **注意**: Closer採用後も「Async提案資料（/en/p/[slug]）」と「Fathom商談録画」は必ず共有しスコープ逸脱を防ぐ

#### /en専用 pPersonalizeページ構成（`/en/p/[slug]`）

| セクション | 内容 |
|----------|------|
| Header | Company name / Japan Market Readiness Score / 3-metric summary |
| Market Opportunity | TAM estimate for their category in Japan (JPY + USD) |
| Gap Analysis | What's missing: JP landing page / JPY checkout / Google.co.jp visibility |
| Competitive Intel | 2〜3 similar brands already operating in Japan (success proof) |
| Our Solution | Scoped deliverables with timeline (no vague promises) |
| ROI Estimate | Time-to-revenue estimate based on comparable brands |
| Pricing | 3 tiers with "Japan Market Fit Research" as entry offer |
| CTA | Cal.com booking (「Book a free 30-min Japan market call」) |

#### AI翻訳ツール詳細コスト比較（2026年最新）

| ツール | 月額 | 通訳時間 | 特徴 | 推奨用途 |
|-------|------|---------|------|---------|
| **Deeptrue Pro** | $29/月 | 300分 | AIアバター型・ほぼネイティブ品質・Zoom接続 | 商談用（コスパ最優先） |
| **JotMe Pro** | ¥1,440/月 | 200分 | リアルタイム字幕・多言語対応・会議後議事録 | 文字起こし重視の商談 |
| **VoicePing** | ¥6,300+/月 | 450分 | チャンネル分離型同時通訳・低遅延 | 複数言語が混在する商談 |
| **Fathom / tl;dv** | 無料〜$19 | 録画無制限 | AI要約→CRM自動連携・商談記録 | 全商談の録画・議事録 |

> 推奨: Deeptrue Pro ($29) + Fathom (無料) の組み合わせが月$29〜で最大カバレッジ

#### AI通訳 3つの壁と回避策

| 壁 | 問題 | 回避策 |
|---|------|-------|
| **タイムラグ3〜5秒** | 会話のリズムが崩れ、相手が不安になる | 冒頭に「AIアシストを使っています、少し間があります」と先に告知して心理的許可を取る |
| **AI音声の感情欠如** | 謝罪・感謝・断りのトーンがフラットで失礼に聞こえる | 感情的ニュアンスが必要な箇所は事前にスクリプト化→ElevenLabsで自然な音声に変換してから使用 |
| **日本語主語抜けによる誤訳** | 「します」→ who does it? がAIに判定できず誤訳 | DeepLよりGemini（コンテキスト読み込み済み）を使用。主語を明示した英語ドラフトを先にGeminiに書かせてから送信 |

#### バックオフィス・スタック（確定）

| ツール | 用途 | コスト |
|-------|------|-------|
| **PandaDoc** | 提案書作成 + 電子署名 + 閲覧追跡（ページ別滞在時間） | $35/月〜 |
| **Stripe** | 初期費用請求・月額リテイナー定期課金。**支払い確認後にキックオフ開始**（先払い鉄則） | 手数料3.6%（JP）|
| **Slack Connect** | クライアントと同一Slackチャンネルで非同期コミュニケーション | 無料〜 |
| **Notion** | プロジェクト進捗・納品物管理・クライアント共有ページ | 無料〜$16 |
| **DeepL + Gemini** | 翻訳・ドラフト作成（[→ 使い分けルール](#degit-vs-deepl)） | DeepL Pro ¥3,200/月 |

#### DeepL vs Gemini 使い分けルール

| ケース | 使用ツール | 理由 |
|--------|----------|------|
| 短い事実確認メッセージ（「明日14時はいかがでしょうか」） | **DeepL** | 高速・精度十分 |
| 複雑な交渉・断り・感謝・提案変更 | **Gemini（コンテキスト込み）** | プロジェクト背景をシステムプロンプトとして事前ロード→トーン・敬語・文化的ニュアンスを自動調整 |
| Slack/メールの長文ドラフト | **Gemini** | 全会話履歴を踏まえた自然な返信を生成 |
| 翻訳後のファクトチェック | **DeepL後にGeminiで確認** | 固有名詞・製品名の誤訳をGeminiが検出 |

> Geminiセットアップ: システムプロンプトに「あなたはParadigm合同会社の/en担当です。クライアントは[会社名]の[担当者名]です。プロジェクト概要: [Notion URL]」を毎プロジェクト開始時に設定

#### AIエージェント実装仕様（Japan-Ready AI & Compliance Suite）

**コンセプト**: 「Turn your website into a legally compliant, fully localized Japanese storefront in 14 days, powered by AI and local experts」

AIチャットボットウィジェットを**日本語訪問者にのみ表示**する条件分岐実装:

```javascript
// 実装方法1: ブラウザ言語判定（推奨・即時）
if (navigator.language.startsWith('ja') || navigator.languages.includes('ja')) {
  // Chatbase または Dify ウィジェットを動的ロード
  const script = document.createElement('script');
  script.src = 'https://www.chatbase.co/embed.min.js';
  script.setAttribute('chatbotId', 'YOUR_CHATBASE_ID');
  document.head.appendChild(script);
}

// 実装方法2: IP判定（より正確・サーバーサイド）
// Next.js middleware.ts で Accept-Language ヘッダー + IP geolocation を組み合わせ
// → locale='ja' ユーザーのみ <JapanAIWidget /> コンポーネントをレンダリング
```

**AIエージェント3機能**:
1. **日本語カスタマーサポート**: Chatbase/Dify に商品FAQ・返品規則・配送ルールをRAGとして学習 → 24時間日本語自動応答
2. **Tokushoho（特定商取引法）コンプライアンス**: 必要記載事項チェックリストをナレッジベース化 → LP審査を自動化
3. **Shopify統合**: Collaborator権限（パスワード共有不要・安全）でストア設定にアクセス → 日本語メタ情報・送料設定・支払い方法を自動設定

**RAGビルダー比較**:
| ツール | 特徴 | 推奨用途 |
|-------|------|---------|
| Chatbase | ノーコード・Shopify/WordPress埋め込み簡単・月$19〜 | クライアントサイトへの即時デプロイ |
| Dify (self-hosted) | フル制御・多言語・n8n連携可・コストゼロ | 高度カスタマイズが必要な案件 |

#### ROI計算テンプレート（クライアント提示用）

```
Before Paradigm:
  JP CS staff: $600/month (part-time)
  JP sales (unoptimized): ~$2,000/month
  Total: $2,600/month

After Paradigm (Standard Launch $4,500 setup + $300/month):
  AI handles 80% of JP inquiries: $0 CS labor
  Optimized JP storefront: ~$4,500/month in JP revenue
  Total: $4,500/month revenue - $300 retainer = $4,200/month net

ROI = ($4,200 - $2,600) / ($4,500 setup + $300/month)
    = $1,600/month extra ÷ $750/month (annualized setup) = 213% ROI
    Payback period: ~3 months
```

> このROI計算テンプレートをPandaDoc提案書に動的変数として埋め込む（クライアントの月商を入力すると自動計算）

#### 100件の法則（キャッシュフロー・シミュレーション）

| フェーズ | 件数 | 転換率 | 説明 |
|--------|------|-------|------|
| コールドアウトリーチ | 100件 | 100% | 1週間で100件送信（Clay自動化で可能） |
| デモ・商談アポ | 5件 | 5% | 5% = アポ獲得率の現実的目標 |
| 成約 | 1件 | 20% | 商談からクローズは20〜30%目標 |
| **収益** | **$3,500〜$8,500** | — | **Essential or Growth tier成約時の初期費用** |

> 月2〜3件成約 = ARR $84K〜$102K（Growth tier平均$7,000×12件/年）。100件ループを週次で回すことで安定受注が生まれる

#### ディープリサーチ3戦術（リードの「隠れた日本ポテンシャル」を発掘）

| 戦術 | 手順 | 何がわかるか |
|-----|------|------------|
| **①転売検出** | Amazon.co.jp で対象ブランド名を検索 → サードパーティセラーが多数出品している場合 | 日本需要は証明済み・公式チャネルが空白 → 「御社の利益が転売業者に流れています」が最強フック |
| **②チェックアウト摩擦テスト** | 対象サイトで「東京都渋谷区」宛に購入を試みる → 国際送料/$50+・日本語なし・円決済なし を確認 | 具体的なUX障壁を実測値として提示（スクリーンショット証拠付き） |
| **③Tokushoho違反ギャップ** | 日本語LPの有無 + 特商法ページ（会社名・住所・返品規則）の有無を確認 | 日本で販売しているのに特商法対応なし → 法的リスクを痛みとして提示し、コンプライアンス整備をサービスに組み込む |

> SimilarWebの地理フィルターで「日本からのトラフィック比率 10%+」を事前確認してからリサーチ実施 → 確度の高いターゲットに絞れる

#### クロージング4トリガー（断る理由ゼロ設計）

| トリガー | 内容 | 心理効果 |
|--------|------|---------|
| **①リスクリバーサル** | 「14日間で成果が出なければ全額返金保証」 | 金銭的リスクをゼロにする → 「試しに」が発動 |
| **②Done-for-You** | 「コード1行をサイトに貼るだけ。残りは全部Paradigmがやります」 | 作業負担の心理的障壁を除去 |
| **③ハイバリュー特典** | 「日本PR会社コネクション + 日本語インフルエンサーリスト（30名）を無料提供」 | 価格以上の価値を感じさせるバンドル効果 |
| **④スカーシティ** | 「月3社限定（品質維持のため）。現在1社空き」 | 希少性 → 先送り阻止 → 即決誘発 |

#### オフライン業務の扱いルール（スコープ外・紹介のみ）

以下はParadigmのスコープ**外**。紹介（referral）のみ行い、直接ハンドリングしない:

| オフライン業務 | 紹介先 | 紹介料目安 |
|------------|------|---------|
| 日本向け在庫・物流・倉庫 | オープンロジ（3PL） | 紹介料5〜10% |
| 日本法人設立（GK/KK） | 司法書士・行政書士パートナー | 紹介料¥5〜10万/件 |
| Amazon.co.jp出品代行 | ACP（Amazon代行）パートナー | 紹介料5〜10% |

> 「できません」ではなく「最適なパートナーを紹介します」→ 紹介料で追加収益にする設計

#### スケール自動化スタック + 週次ゴールデンルーティン

**自動化スタック（100件/週を1人で回す）**:

| ツール | 役割 | コスト |
|-------|------|-------|
| **Clay** | リスト収集 + 自動パーソナライズ（会社情報・JP traffic %・転売検出を自動取得してメール変数に埋め込み） | $149/月〜 |
| **Instantly / Smartlead** | コールドメール一括送信 + 開封追跡 | $37〜97/月 |
| **Calendly + 事前アンケート** | アポ予約 + 「月商・現在のJP売上・Shopify使用有無」を自動収集 | $12/月〜 |
| **PandaDoc** | 提案書動的生成（ROI計算・クライアント名・tier推奨を変数で自動挿入）+ 電子署名 | $35/月〜 |
| **Notion 納品Kit** | 各クライアントに共有するオンボーディングページテンプレート（手順書・進捗・成果物置き場） | 無料〜 |

**週次ゴールデンルーティン（月曜スタート）**:

| 曜日 | アクション | 所要時間 |
|-----|----------|---------|
| **月** | Clayでリスト100件生成 + メール配信 | 1〜2時間 |
| **火〜水** | 返信対応 + PandaDoc提案書送付 | 随時 |
| **木** | アポ商談（Deeptrue + Fathom録画） | 商談数×30分 |
| **金** | 成約クライアントのキックオフ + 既存クライアントの月次レポート送付 | 2〜3時間 |
| **週末** | Notion納品Kit更新 + 翌週リスト候補のディープリサーチ（転売検出・Tokushoho違反）| 1時間 |

#### フォームURL取得 2ステップフロー（ドメイン→コンタクトページ抽出）

B2BリードポータルはドメインURLしか提供しない。メアド・電話番号・フォームURLを取得するには以下の2段階が必要:

**Step 1**: Apollo.io / BIZMAPS / FUMA でドメイン一覧をCSV取得（ポータルが提供する唯一の無料情報）

**Step 2**: Crawl4AI で各ドメインのコンタクトページを自動探索

```python
import asyncio
from crawl4ai import AsyncWebCrawler

contact_paths = [
    '/contact', '/contact-us', '/inquiry',
    '/about', '/get-in-touch', '/reach-us',
    '/support', '/help', '/request'
]

async def extract_contact(domain: str):
    async with AsyncWebCrawler() as crawler:
        for path in contact_paths:
            result = await crawler.arun(url=f"https://{domain}{path}")
            if result.success:
                # <form> action, mailto:, tel: を抽出
                # → Supabase leads テーブルに contact_url / email / phone を保存
                return parse_contact_info(result.html)
    return None
```

#### フルアウトリーチパイプライン

```
Apollo.io（ドメイン取得・月10,000件無料）
  → n8n（URLリストをバッチ処理・Jitter付き）
    → Crawl4AI（コンタクトページ探索 + メアド/電話/フォームURL抽出）
      → Supabase（leads テーブルに保存・重複排除）
        → DeepSeek V3（Context Caching 90%OFF でパーソナライズ文生成）
          → Listmonk（OSS・無制限メール一括送信）
          または Playwright（フォーム自動入力・メアド非公開企業向け）
```

**Apollo Exporter 拡張機能（無料上限突破の現実解）**: [apolloexporter.scrapejob.net](https://apolloexporter.scrapejob.net) — Apollo.io の検索結果ページをChrome拡張でCSV化。Apollo 有料プランのCSV export（年120件制限）を迂回し、月最大10,000件の閲覧データをそのまま出力。Apollo 無料プランと組み合わせて「実質無料でCSV月1万件」が現実的な最大値

**D7 Lead Finder（SMBポータル補完）**: Yelp/Trustpilot型のSMBディレクトリ。1検索1,200件・フィルタ豊富。CSV exportは有料（$25〜50/月）。無料プランは検索+プレビューのみ。「Apollo でドメインを取れない業種・地域」の補完として活用

#### Kompass（EU製造業向け補完ツール）

1944年スイス創業。70カ国以上・6,000万社以上を収録した世界最大級のBtoBディレクトリ。**基本閲覧は無料、CSV export は有料**（Enterprise契約が必要）。

**Apollo との使い分け**:
- Apollo: テック系・SaaS・D2C・英語圏SMBに強い
- Kompass: 欧州製造業・卸売・工業（ドイツ/フランス/イタリア等）に強い。業種コード（SIC/NACE）で絞り込みが精緻

**位置づけ**: 無料リスト取得ツールではなく、Apollo でカバーできないEU製造業・卸売セグメントへのリーチを補完する「Apollo補完ポータル」として位置づける

#### Wappalyzer OSS 3択（テクノグラフィクス抽出）

| ツール | 言語 | 特徴 | 推奨用途 |
|-------|------|------|---------|
| **webanalyze** | Go | CLI一発・並列20ワーカー・CSV出力・最速 | バルクスキャン（1万件〜）の第1段階 |
| **wappalyzer-next** | Python | 最高精度・JSON出力・定期更新 | フラグ付きサイトの詳細確認（第2段階） |
| **MassWappalyzer** | Node.js | Windows向け・GUI対応 | Windows環境での単発スキャン |

**2段戦略（推奨）**: webanalyze でバルクスキャン → Shopify/WordPressフラグが立ったサイトのみ wappalyzer-next で精度確認。速度と精度を両立できる

```bash
# webanalyze（Go・バルク向け）
go install -v github.com/rverton/webanalyze/cmd/webanalyze@latest
webanalyze -update
webanalyze -hosts urls.txt -output csv -worker 20 > results.csv
grep -i "shopify" results.csv > shopify_sites.csv
```

```bash
# wappalyzer-next（Python・精度確認向け）
pip install wappalyzer
wappalyzer -i flagged_urls.txt -t 10 -oJ results.json
```

#### テクノグラフィクスデータセット（無料・ゼロコスト起点）

| データセット | 件数 | ライセンス | 取得方法 |
|------------|------|----------|---------|
| **leadita/tech-stack-datasets** | 500件/技術（403技術） | MIT | GitHub直DL |
| **PDL free technographics** | 51M企業×403技術 | MIT（500件/技術制限） | PDL APIキー無料登録 |
| **Kaggle「shopify domains」** | 465,000件 | CC | Kaggle Dataset |
| **CommonCrawl WAT files** | 無制限 | Public Domain | S3直接DL |

**ゼロコスト5万件パイプライン**:

```
Step 1 [ソース選定]  GLEIF全件CSV（215万社）または Companies House UK（500万社）をDL
Step 2 [絞り込み]   業種コード（SIC/NACE）+ 国 + 従業員規模フィルタ → 対象5万件を抽出
Step 3 [URL補完]    OpenCorporates API（100件/日無料）で公式URL付与
Step 4 [コンタクト] Hunter.io（25件/月無料）+ Apollo.io（10,000件/月無料）でメアド補完
Step 5 [送信]       Listmonk（OSS・無制限）でステップメール + n8n で開封追跡
```

| 公的DB | 件数 | 無料範囲 | URL |
|--------|------|---------|-----|
| GLEIF | 215万社 | 全件CSV無料DL | https://www.gleif.org/en/lei-data/gleif-concatenated-file |
| Companies House UK | 500万社 | 全件CSV無料DL | https://find-and-update.company-information.service.gov.uk/bulk-download |
| OpenCorporates API | 1.6億社 | 100件/日無料 | https://api.opencorporates.com |
| EU Open Data Portal | 政府調達・助成DB | 無制限 | https://data.europa.eu |
| Swiss Zefix | 全スイス企業 | 全件無料 | https://www.zefix.admin.ch |

---


---

## <a id="ppp-pricing"></a>3. 12-locale PPP 補正価格表 (s3)

### 12-locale PPP 補正価格表（P17 2026-04-27 拡張・Plan B）

> **背景**: 12-locale i18n 拡張 (P17) により、`/en` 価格 (`$3,500/$8,500/$18,000+`) を基準に PPP 係数で各 locale 別価格を表示する。Worldbank PPP 2024 保守的目安。実装は `src/lib/locale-map.ts::pppPrice()` で動的計算（固定価格表をハードコードしない）。

| Locale | 母語/対象 | RTL | PPP係数 | Tier 1 Essential | Tier 2 Growth | Tier 3 Scale |
|--------|----------|-----|---------|------------------|---------------|--------------|
| `ja` | 日本（独自設計・s3-1 参照） | — | 1.0 | JPY 固定 | JPY 固定 | JPY 固定 |
| `en` | 英語汎用（Japan Entry Package母版） | — | 1.0 | $3,500 | $8,500 | $18,000+ |
| `ko` | 韓国 | — | 0.85 | $2,975 | $7,225 | $15,300+ |
| `zh` | 中国（簡体字） | — | 0.55 | $1,925 | $4,675 | $9,900+ |
| `de` | ドイツ・DACH | — | 0.95 | €3,150 | €7,650 | €16,200+ |
| `fr` | フランス・欧州+西アフリカ仏語圏 | — | 0.95 | €3,150 | €7,650 | €16,200+ |
| `es` | スペイン語（欧州+ラテンアメリカ） | — | 0.75 | $2,625 | $6,375 | $13,500+ |
| `pt` | ポルトガル語（ブラジル基準） | — | 0.45 | $1,575 | $3,825 | $8,100+ |
| `ru` | ロシア・CIS | — | 0.40 | $1,400 | $3,400 | $7,200+ |
| `ar` | アラビア（MENA） | **✅** | 0.65 | $2,275 | $5,525 | $11,700+ |
| `vi` | ベトナム（SEA 主言語） | — | 0.40 | $1,400 | $3,400 | $7,200+ |
| `id` | インドネシア（SEA 副言語） | — | 0.40 | $1,400 | $3,400 | $7,200+ |

**SalesRegion (appexx canonical 12値) → Locale primary マッピング**:
- `ja → ja` / `en → en` / `ko → ko` / `zh → zh` / `es → es` / `pt → pt` / `ru → ru` / `ar → ar`
- `europe → de` (alts: `fr`, `es`)
- `sea → vi` (alts: `id`)
- `africa → fr` (alts: `en`, `pt`)
- `others → en` (fallback only)

**コード実装**: `src/lib/locale-map.ts` に `LOCALE_PPP_FACTOR` / `EN_BASE_PRICES` / `pppPrice(locale, tier)` を集約。新 locale 追加時もこのファイル 1 箇所だけ更新する（pricing component 側はハードコード禁止）。

<a id="s3-3"></a>


---

## <a id="folder-structure"></a>4. フォルダ構成 (s7-2)

### フォルダ構成（リニューアル後）

```
paradigmjpcom/
├── CLAUDE.md
├── middleware.ts              ← locale振り分け（next-intl）
├── i18n/
│   └── routing.ts             ← locales: ['ja', 'en'], defaultLocale: 'ja'
├── messages/
│   ├── ja.json                ← /ja 共通UI文言（ナビ・フッター等）
│   └── en.json                ← /en 共通UI文言
├── package.json / tsconfig.json / next.config.ts
├── src/
│   ├── app/
│   │   ├── globals.css        ← 新デザイントークン（Warm Modern Tech）
│   │   ├── [locale]/          ← locale動的ルート（next-intl）
│   │   │   ├── layout.tsx     ← locale別レイアウト（lang属性・フォント切替）
│   │   │   ├── page.tsx       ← トップページ（locale別コンポーネント呼び出し）
│   │   │   ├── about/
│   │   │   ├── services/
│   │   │   │   └── [slug]/
│   │   │   ├── pricing/
│   │   │   ├── works/
│   │   │   ├── blog/
│   │   │   │   └── [slug]/
│   │   │   ├── contact/
│   │   │   ├── faq/
│   │   │   ├── legal/
│   │   │   ├── privacy/
│   │   │   └── lp/            ← /ja のみ
│   │   ├── admin/             ← locale非依存
│   │   ├── api/               ← locale非依存
│   │   ├── p/[slug]/          ← 提案ページ（locale非依存）
│   │   ├── sitemap.ts         ← locale別サイトマップ
│   │   └── robots.ts
│   ├── components/
│   │   ├── Header.tsx         ← locale対応（言語切替ボタン含む）
│   │   ├── Footer.tsx         ← locale対応
│   │   ├── PageHero.tsx
│   │   ├── DifyChatbot.tsx
│   │   ├── SiteWrapper.tsx
│   │   ├── ja/                ← /ja 専用コンポーネント
│   │   └── en/                ← /en 専用コンポーネント
│   └── lib/
│       ├── data.ts            ← /ja フォールバックデータ
│       ├── data-en.ts         ← /en フォールバックデータ（新規）
│       ├── blog.ts
│       ├── jsonld.ts          ← locale対応JSON-LD
│       └── supabase.ts
└── public/
    ├── images/
    │   ├── team/              ← チーム写真
    │   └── clients/           ← クライアント写真
```

<a id="s7-3"></a>


---

## <a id="api-endpoints"></a>5. API エンドポイント (s7-3)

### APIエンドポイント

- `POST /api/contact` — お問い合わせ（locale判定でSlack通知文言切替 + Supabase leads保存）
- `GET/POST/PATCH/DELETE /api/admin/*` — 管理CRUD（locale指定パラメータ追加）

---


---

## <a id="db-schema"></a>6. Supabase CMS テーブル (s8-2)

### Supabase CMSテーブル（localeカラム追加）

| テーブル | 変更内容 |
|---------|---------|
| `cms_posts` | `locale TEXT DEFAULT 'ja'` カラム追加 |
| `cms_services` | `locale TEXT DEFAULT 'ja'` カラム追加 |
| `cms_pricing` | `locale TEXT DEFAULT 'ja'`, `currency TEXT DEFAULT 'jpy'` カラム追加 |
| `cms_faqs` | `locale TEXT DEFAULT 'ja'` カラム追加 |
| `cms_works` | `locale TEXT DEFAULT 'ja'` カラム追加 |
| `cms_settings` | `locale TEXT DEFAULT 'ja'` カラム追加 |

**マイグレーションSQL**:
```sql
ALTER TABLE cms_posts    ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja';
ALTER TABLE cms_services ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja';
ALTER TABLE cms_pricing  ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja',
                         ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'jpy';
ALTER TABLE cms_faqs     ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja';
ALTER TABLE cms_works    ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja';
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'ja';
```

**共有テーブル（appexx-dashboardと同一プロジェクト）**: `leads`（locale='ja'/'en' カラムで区別）

<a id="s8-4"></a>

### 環境変数（Coolify設定）

```bash
NEXT_PUBLIC_SUPABASE_URL=https://yihdmgtxiqfdgdueolub.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=(Coolify appexx-dashboardから参照)
SUPABASE_SERVICE_ROLE_KEY=(Coolify appexx-dashboardから参照)
NEXT_PUBLIC_SITE_URL=https://paradigmjp.com
NEXT_PUBLIC_COMPANY_NAME=Paradigm合同会社
ADMIN_PASSWORD=paradigm-admin-2025
NEXT_PUBLIC_UMAMI_WEBSITE_ID=(Umamiで新サイト追加後に設定)
DATABASE_URI=(Supabase PostgreSQL 接続文字列・PayloadCMS 用)
PAYLOAD_SECRET=(PayloadCMS セッション署名鍵)
PAYLOAD_PUBLIC_SERVER_URL=https://paradigmjp.com
DIFY_API_KEY=(Dify チャットボット API キー)
DEEPSEEK_API_KEY=(P17 2026-04-27 追加・i18n 翻訳・Context Cache 90%OFF)
```

**P17 注意**: `DEEPSEEK_API_KEY` は **scripts/i18n-translate.mjs 実行時のみ必要**（buildtime/runtime には不要）。新ページ追加で messages key を増やした際にローカルで `DEEPSEEK_API_KEY=sk-xxx node scripts/i18n-translate.mjs` を走らせて 10 言語 messages を再生成する用途。

---


---

## <a id="design-system"></a>7. デザインシステム (s8-1)

### デザインシステム（新・確定）

**コンセプト**: Warm Modern Tech — カラフル・実在人物写真・温かみのあるモダンテック

参照ブランド: Loom / Notion / Figma / Intercom

#### カラーパレット

```css
@theme {
  /* ── Backgrounds ──────────────────── */
  --color-bg-base:     #FAFAF7;   /* ウォームオフホワイト */
  --color-bg-card:     #FFFFFF;
  --color-bg-ink:      #0D1117;   /* ダークセクション */

  /* ── Brand ────────────────────────── */
  --color-primary:     #1C1C2E;
  --color-accent:      #6366F1;   /* インディゴ */
  --color-accent-light:#818CF8;

  /* ── Warm Accents（新規）─────────── */
  --color-amber:       #F59E0B;   /* 温かみ・エネルギー */
  --color-coral:       #F97316;   /* 親しみ・CTAサブ */
  --color-teal:        #14B8A6;   /* AI・テック領域 */
  --color-rose:        #F43F5E;   /* 差し色 */

  /* ── Text ─────────────────────────── */
  --color-text:        #111827;
  --color-text-muted:  #6B7280;

  /* ── Surface（旧 #ffffff 純白から変更）*/
  --color-surface:     #FAFAF7;
}
```

#### フォント

| locale | フォント | 用途 |
|--------|---------|------|
| `/ja` | Noto Sans JP (300-800) | 本文・見出し全般 |
| `/en` | Plus Jakarta Sans (400-800) | 本文・見出し全般 |

#### セクション構成パターン（両locale共通ガイドライン）

```
Hero:         Meshグラデ（紫↔ティール↔アンバー）+ 実在人物写真
Social Proof: ウォームオフホワイト地 + クライアントロゴ
Services:     インク地（ダーク） + カラフルカード
Works:        ウォームオフホワイト地 + before/after + 顔写真
Team:         アンバー/コーラル系グラデ地 + 顔写真 + ひとこと
Blog:         ウォームオフホワイト地
CTA:          インディゴ↔ティールメッシュグラデ
```

#### 写真方針（確定）

- **フリー素材を使用**（Unsplash / Pexels / Pixabay 等）
- **⚠️ アニメ・漫画・イラスト素材は一切使用禁止。必ず実在人物の写真・動画のみ使用**
- スタイル: 典型的なストックフォトポーズを避け、自然・candid・作業感のあるものを厳選
- `/ja` 用: 日本人・アジア系・オフィス・対話・作業シーン
- `/en` 用: 多国籍・英語ビジネス・ラップトップ・カジュアルミーティングシーン
- ブログ著者写真: フリー素材の人物写真を使用
- 動画素材（ヒーロー背景等）: Pexels Videos 等のフリー動画も活用可

#### Difyチャットボット（locale別・確定）

| | `/ja` Bot | `/en` Bot |
|--|----------|----------|
| **言語** | 日本語 | 英語 |
| **学習内容** | 日本語版HP全ページ・サービス仕様・Docs・Supabase CMSデータ | 英語版HP全ページ・Japan Entry Package詳細・英語Docs |
| **共通学習** | Supabase テーブル構造・FAQ・料金・実績データ（最新を常時反映） | ← 同左 |
| **更新方法** | コンテンツ更新時にDifyナレッジベースを再インデックス（n8n自動化推奨） | ← 同左 |
| **配置** | 右下固定、デフォルト展開 | 右下固定、デフォルト展開 |

#### locale別トーン差分

| | `/ja` | `/en` |
|--|-------|-------|
| 第一印象 | 温かい・信頼・地に足がついた | グローバル・スタートアップ感・爽快 |
| アクセント主役 | アンバー＋インディゴ | ティール＋コーラル |
| 写真 | 日本的丁寧さ・対話感 | 多様な国籍・英語コミュニケーション |

<a id="s8-3"></a>

