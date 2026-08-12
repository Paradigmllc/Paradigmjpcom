# LinkedIn Japan Entry Outreach Operations

更新日: 2026-08-07  
対象: Paradigm LLC / Japan Entry Partner（海外SMB向け・英語運用）  
関連: `sales-os-operations-guide.md`, `poss-paradigmjpcom-implementation.md`

## 1. 目的とポジション

LinkedIn運用の目的は、Japan Entry Partner（`$15,000` Japan Market Setup ＋ Go-Live起点90日 Initial Japan Country Operations ＋ Month 4以降 `$2,000/月`）の適合リードを、海外SMBの意思決定者から獲得することである。

運用者のポジションは「日本進出のプロフェッショナル」。エージェンシーでもコンサルティング会社でもなく、**日本国内から一次情報を持って発信する個人の専門家**として立つ。

対象は EC / SaaS / Web3 の従業員10〜200名規模、意思決定者は Founder / CEO / Head of International / VP Growth。

言語は英語のみ。日本語投稿と混在させない（配信対象の読者層が特定できなくなり双方のリーチが落ちる）。

## 2. 二トラック構造

| Track | 内容 | 役割 |
|---|---|---|
| A. 発信 | 週3投稿 ＋ 日次コメント | 接触時の信頼担保。単独ではリードにならない |
| B. 接触 | 接続申請 → 観察メッセージ | 実際のリード生成 |

Track B の返信率は Track A の厚みに依存する。プロフィールと投稿が空の状態で接触した場合、返信率は実質ゼロになる。順序を逆にしない。

## 3. プラットフォーム制約（運用開始前に実アカウントで現行値を確認）

| 項目 | 無料アカウント | Sales Navigator Core |
|---|---|---|
| 接続申請 | 週 約100件 | 同等 |
| パーソナライズドノート | 月 約5通 | 制限緩和 |
| InMail | 不可 | 約50通 / 月 |
| 検索フィルタ | 限定的 | 企業規模・成長率・職種・シグナル |

**判断: Sales Navigator Core（月$99前後）は参入条件とする。** 無料枠のノート月5通では outbound が事業として成立しない。$15,000案件1件で9年分を回収するため、コストではなく前提として扱う。

上限値はLinkedIn側の予告なき変更対象であり、数値は運用時点で再確認する。

## 4. 接触シーケンス（1人あたり7〜10日）

SALES-CENTER ルール4（「教えてあげる」体裁・売り込まない）をLinkedInへ移植したもの。

| Day | アクション | 禁止事項 |
|---|---|---|
| D0 | 相手の投稿へコメント。日本文脈の具体を1つ | 自社言及・リンク |
| D2 | 接続申請。ノートなし、またはコメントへの言及のみ | 提案文 |
| 承認後 D+1 | 観察メッセージ。事実1つのみ | 提案・質問・リンク |
| D+5 | 反応があれば診断ツールのリンク → fit call | 価格の先出し |

### 観察メッセージの型

提案なし・質問なし・リンクなし。返信する義務を作らず、返信したくなる状態だけを作る。

```
Thanks for connecting.

I looked at your site earlier — one thing that stands out for Japan:
your checkout only offers card payment. In Japan, konbini payment and
carrier billing still carry a meaningful share of consumer transactions,
and its absence is a common reason Japanese buyers abandon at the final step.

Not pitching anything — just something most overseas teams find out six months late.
```

観察は必ず**相手のサイトを実際に見た上での固有の指摘**とする。テンプレの使い回しが判別された時点でこの手法は無効化する。

## 5. 日次クオータ

```
接続申請        15〜20件 / 日   （週100を絶対に超えない）
コメント          5〜8件 / 日   （ICPが集まる投稿へ15分）
観察メッセージ    承認された分のみ
フォローアップ    5件 / 日
```

週100超過は制限対象となり、アカウント全体のリーチが低下する。速度より継続を優先する。

自動化ツール（Phantombuster等）は使用しない。アカウント停止時に全資産を失う。

## 6. コンテンツ軸

海外SMBの中核不安は「日本は何がわからないのかがわからない」。したがって刺さるのはノウハウ論でも実績でもなく、**英語で検索しても出てこない日本の具体的事実**である。これは Paradigm 第3の強み（情報の非対称性アービトラージ）と一致する。

| 柱 | 内容 | 比率 |
|---|---|---|
| A. 隠れコスト・手続き開示 | 決済構成、出店条件差、PSE / 技適 / 薬機法、インボイス制度 | 3 |
| B. 失敗解剖 | 撤退した外資ブランドの理由分解（実名は慎重に） | 2 |
| C. 直訳 vs ローカライズ | Before / After のスクリーンショット | 2 |
| D. 意思決定の内部事情 | 稟議・決裁フロー、返信が遅い理由、商習慣 | 2 |
| E. オファー | Japan Entry の構造説明 | 1 |

A と D は競合が構造的に書けない。海外エージェンシーは一次情報を持たず、国内コンサルは英語で発信しないため。

## 7. 投稿の弾薬と資産還流

新規執筆は行わない。既存の英語ブログ22本を分解して在庫とする。

- `src/lib/japan-entry-blog.ts`（9本）
- `src/lib/japan-entry-blog-professional.ts`（5本）
- `src/lib/japan-entry-blog-additions.ts`（4本）
- `src/lib/japan-entry-blog-professional-web3.ts`（5本）

1記事あたり3〜5投稿へ分解でき、60〜100投稿分（約半年）に相当する。

還流の設計:

```
LinkedIn投稿（反応テスト） → 反応が良かったものだけ
  → 新規ブログ記事へ昇格 → pSEO / GEO で恒久資産化
```

LinkedInを新規コンテンツのA/Bテスト環境として扱う。これにより投稿単発の消費を防ぐ。

## 8. 投稿カレンダー（初月）

投稿は週3本、火・水・木の JST 22:00（米国東部 朝9時 / 欧州 昼13時）。

| 週 | 火 | 水 | 木 |
|---|---|---|---|
| W1 | 決済・コンビニ払いの実態 | 直訳LP Before / After | 日本法人は本当に必要か |
| W2 | 稟議フロー（返信が遅い理由） | 楽天 vs Amazon.co.jp 出店条件 | SaaS調達要件の日本差分 |
| W3 | 撤退事例の解剖 | 名刺・商習慣の実務 | 14営業日の中身（オファー枠） |
| W4 | PSE / 技適 / 薬機法 | ローカライズ Before / After 第2弾 | ローンチ後30日の測定項目 |

毎日投稿は行わない。1投稿あたりの初速が分散し、配信量が落ちる。

## 9. プロフィール要件

コメントと接触の受け皿。ここが未整備の場合、Track A / B の双方が漏れる。

| 要素 | 方針 |
|---|---|
| Headline | 肩書きではなくオファー。「Japan Market Entry for overseas EC / SaaS / Web3 teams — fixed scope, 14 business days, no local hire required」 |
| Featured | 診断ツール（`JapanEntryScoreTool`）を先頭に置く。`Apply — $15K` を先頭にしない |
| About | 日本のブラックボックス性 → 90日パートナーシップの構造。実績ではなく情報の質で信頼を作る |
| Banner | paradigmjp.com/en への視覚導線 |
| その他 | カスタムURL、Creator mode |

## 9.1 確定プロフィール文面（英語版・2026-08-07）

アカウント初期状態は見出し `OtherのUSCPA`、会社 `Other`、写真・バナー・About なし、つながり1・フォロワー2・投稿0、プロフィール言語 日本語のみ、URLはランダム文字列。以下で置き換える。

USCPA資格は本事業の訴求軸に含めない（2026-08-07 ユーザー判断）。ポジションは「東京拠点のJapan Entryの専門家」に統一する。

### Headline

```
Japan Market Entry for overseas SMBs | Fixed scope, 14 business days,
no local hire required | Based in Tokyo
```

コメント欄では見出しが1行に切り詰められるため、冒頭で「何をする人か」が確定する語順を優先する。

### About

```
Most overseas teams don't fail in Japan because Japan is hard.
They fail because the requirements are unlisted.

The consumption tax invoice system. Why card-only checkout quietly loses
buyers. Which decisions need a Japanese entity and which genuinely don't.
Why a Japanese counterpart goes silent for three weeks and then says yes.
None of this is difficult. It's just not written down in English.

I'm based in Tokyo and work with overseas e-commerce, SaaS, and Web3
companies — typically 10 to 200 people — that have decided to enter Japan
and want the route built before they commit headcount to it.

The engagement is deliberately narrow:
- A fixed Japan Market Setup, delivered in 14 business days
- 90 days of initial Japan country operations from your Go-Live Date
- Continuation only if the ongoing scope still earns its place

What this is not: a retainer that outlives its usefulness, a translation
service, or a promise that I will become your Japan employee.

If you're weighing whether Japan is worth the next two quarters, send me
the decision you're facing. I'll tell you what I'd need to know to answer
it — including if the answer is "not yet."
```

### 英語をプライマリ言語にする理由

LinkedInのプロフィール言語は翻訳ではなく別バージョンの実体であり、閲覧者のロケールに一致する版が無い場合はプライマリ版へフォールバックする。日本語のみの状態では、Tier 1対象である韓国ロケール・アラビア語ロケール等の閲覧者に日本語プロフィールが表示される。したがって英語をプライマリに設定する。

### 残りの設定項目

| 項目 | 内容 |
|---|---|
| 写真 | 必須。1接続の無名アカウントで写真も無い場合、接続申請はほぼ承認されない |
| バナー | `Japan Market Entry — Fixed Scope. 14 Business Days.` ＋ `paradigmjp.com/en` |
| カスタムURL | 例 `/in/toha-japanentry`。ランダム文字列は信頼を損なう |
| Experience | `Other` を `Paradigm LLC — Japan Entry Partner` に置換。未修正の場合、全投稿・全コメントに `Other` と表示される |
| Featured | 1番目に診断ツール、2番目に `/en/package`。`Apply — $15K` は置かない |
| 認証バッジ | `contact@paradigmjp.com` で職場認証 |

### Week 0 — 接触開始前の必須工程

つながり1・フォロワー2の状態で外部へ接続申請を送ると、実体のないアカウントと判断され承認率が壊滅し、スパム判定にも触れやすい。既存の知人・取引先・元同僚など確実に承認される相手に50〜100件を先に積む。国・業種は問わない。これが完了して初めてTier 1へ入る。

## 10. 測定

週次で以下4項目のみを追う。投稿のリアクション数は指標としない（$15,000の意思決定者は反応せず、無言でプロフィールを閲覧する）。

| 指標 | 意味 | 基準 |
|---|---|---|
| プロフィール閲覧数 | コメント戦略の有効性 | 週次で増加していること |
| 接続承認率 | ターゲティング精度 | 30%を下回ったら対象を見直す |
| 観察メッセージ返信率 | 文面の質 | 10%目安。5%以下で文面差し替え |
| 診断ツール流入数 | 最終KPI | — |

## 11. 禁止事項

- 自動化ツールの使用
- 接続直後のセールスDM
- 日本語投稿と英語投稿の混在
- 観察メッセージのテンプレ使い回し
- 週100件を超える接続申請
- 実績・事例の誇張。実績が不足する場合は Founding partner 枠として事実のまま提示し、情報の質で信頼を構築する

## 12. 地域戦略

### 12.1 前提 — LinkedIn浸透率のアジア域内格差

「アジア圏中心」とLinkedInは部分的にミスマッチである。浸透率が域内で極端に不均一なため、チャネルと地域の組み合わせを先に分離する。

| 浸透度 | 国 |
|---|---|
| 強 | シンガポール、オーストラリア、インド、フィリピン |
| 中 | 韓国（テック・スタートアップ層に限る）、香港 |
| 弱 | 台湾（Facebook / LINE中心）、タイ、ベトナム |
| 不可 | 中国 |

**台湾・タイは日本進出の実需が濃いがLinkedInでは到達できない。** 本ドキュメントの対象外とし、別チャネル（Facebook広告 / 現地パートナー）で扱う。この制約を明記しない場合、後日「台湾が伸びない」を運用品質の問題として誤診断する。

### 12.2 Tier順序（同時並行しない）

1日15〜20接続の物理上限では1度に1 Tierしか回せない。順次投入する。

| Tier | 期間 | 地域 | 狙う理由 | 弱点 |
|---|---|---|---|---|
| 1 | W1–6 | シンガポール / 韓国テック / 豪州 | 日本進出の実需が最も濃い（K-beauty、韓国SaaS、SG発Web3、豪州消費財）。時差が近くfit callが取りやすい。決裁が速い | `$15,000` への価格感度が欧米より高い |
| 2 | W7–14 | 米国 / 英国 | 単価最高、LinkedIn最強、日本を次の市場と見る企業が多い | 市場参入コンサルの競合が最多。一次情報での差別化が必須 |
| 3 | W15– | UAE / サウジ | 単価最高、意思決定が速く関係性重視 | 日本進出の実需が薄い |

中東は「日本に入りたい」より「日本から中東に入れたい」側の需要が濃い可能性がある。これは Japan Entry の逆方向であり別商品となる。本スコープ外。

### 12.3 Sales Navigator 検索条件（Tier 1）

```
Geography          Singapore, Australia, South Korea
Company headcount  11-50, 51-200
Job title          Founder, Co-Founder, CEO, Managing Director,
                   Head of International, Head of Growth, VP Growth
Seniority          Owner / Partner, CXO, VP, Director
Industry           Software Development, Internet, Retail, Consumer Goods
Spotlight          Recent funding event / Headcount growth
```

高インテント層の切り出しキーワード。母数は小さいが返信率が大きく変わるため最優先で消化する。

```
("expanding to Japan" OR "Japan market" OR "entering Japan" OR "APAC expansion")
```

### 12.4 無料の高精度シグナル

LinkedIn求人検索で勤務地 `Japan` のポジションを募集している海外SMBを抽出する。求人を出した時点で進出意図が確定しているため、有料データベースのどのフィルタよりも精度が高い。コストゼロ。Tier 1と並行して毎週実行する。

### 12.5 Apollo を使わない判断

Apollo無料プランは People Search API が使用不可（`API_INACCESSIBLE`、2026-08-07確認）。加えてApolloの主価値はメールアドレス取得であり、SALES-CENTERルール4によりコールドメールを主経路としない本運用では、Sales Navigatorと機能が重複する。**本ワークフローではApolloを使用せず、Sales Navigatorに集約する。**

## 13. 未確定事項

- Sales Navigator Core の契約可否（本運用の前提条件）
- プロフィール文面一式の作成（Headline / About / Featured）
- 台湾・タイ向けの別チャネル設計
- 投稿・接触実績のDB化と既存営業ダッシュボードへの接続（実施判断は別途）
