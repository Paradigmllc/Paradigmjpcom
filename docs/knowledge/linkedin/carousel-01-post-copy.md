# Carousel 01 — The Japan Entry Sequence

デッキ: `carousel-01-japan-entry-sequence.html` → 同名 `.pdf`  
形式: LinkedIn ドキュメント投稿（PDFカルーセル 12ページ）  
運用仕様: `../linkedin-japan-entry-outreach-operations.md`

## 形式の理由

LinkedInの投稿本文は3,000字上限、約200字で折り返される。長文の専門記事を本文に流し込む形式は存在しない。深い内容を保存・再訪される形で届ける唯一の手段が**ドキュメント投稿**であり、これはLinkedInで最も滞在時間が長い形式である。滞在時間は配信量を決める主要因のため、密度の高いカルーセルはリーチの面でも最有利になる。

本文は「読ませる」ためではなく「PDFを開かせる」ために書く。結論を本文で言い切らない。

## 投稿本文（そのまま貼る）

```
Most overseas teams don't fail in Japan because Japan is hard.

They fail because they did the right things in the wrong order — and paid
for the same work twice.

I've watched this happen often enough that the pattern is now predictable,
so I mapped it.

A Japan launch is not a checklist. It's a dependency graph. Classification
sits upstream of the entity decision. The entity decision sits upstream of
the disclosure page, the invoicing, and the payment route. Those sit
upstream of translation. And translation sits upstream of anything you
spend money to acquire.

Run it in the order that feels most productive and you get this:

— You incorporate, then discover the permit needed a different structure
— You translate, then the claims change, then you translate again
— You sign a distributor before you know what your channel is worth
— You run paid acquisition to a surface that structurally cannot convert,
  then conclude Japanese demand is weak

Every one of those is a competent action. That's what makes the pattern
invisible from the inside — nothing looks like a mistake while it's
happening.

The 12 pages below are the map: the five gates, what has to be true before
each one, the four most common order errors, and three conditions where I'd
tell you to wait rather than enter.

Save it before you brief your team.

Which gate are you standing at? Tell me, and I'll tell you what usually
breaks next.
```

文字数は約1,400。冒頭2行で折り返されるため、1行目に結論の否定形（"don't fail because Japan is hard"）を置いて続きを開かせる。

## デッキ設計の判断

| 項目 | 値 | 理由 |
|---|---|---|
| ページサイズ | 1080 × 1350（4:5） | モバイルフィードの占有面積が最大。1:1より縦に長く、スクロールを止める |
| 表紙 | 大見出し ＋ "12 pages" ＋ "Save this" | ドキュメント投稿は**1ページ目がサムネイル**になる。縮小表示で読める字詰めが必須 |
| 地色 | `#FBFAF8`（オフホワイト） | LinkedInのUIは純白。わずかに温かい紙色にすることで「投稿」ではなく「資料」として視認される。最も効果の大きい1手 |
| 見出し書体 | Outfit 600 | paradigmjp.com と同一。サイトへ遷移した際の同一ブランド認知 |
| 本文書体 | Noto Sans 300 | 同上。300ウェイトで資料的な静けさを出す |
| アクセント | `#1D4ED8` 単色 | サイトの blue-700 と一致。多色にすると資料の格が落ちる |
| 余白 | 上下左右 92–96px | 密度ではなく余白が「専門家の資料」の signal になる |

**多色・グラデーション・アイコン・写真は使わない。** 情報の非対称性で売る資料の説得力は、装飾量と反比例する。

## レンダリング

```
node docs/knowledge/linkedin/render-carousel.mjs \
  docs/knowledge/linkedin/carousel-01-japan-entry-sequence.html
```

同ディレクトリに PDF を出力する。LinkedInの投稿画面で「ドキュメントを追加」からアップロードする。

**アップロード時のタイトルは投稿本文と別に設定される。** カルーセル下部に表示されるため、ここも設計対象とする。

```
The Japan Entry Sequence — what has to be true before each step
```

## 公開前の確認

本デッキは特定の条文・数値を断定していない。規制カテゴリの例示（食品／化粧品／電気用品／無線設備／暗号資産等）は一般的な整理に留めてあり、個別案件の判定は専門家領域であることを Gate 0 と Gate 3 で明示している。この境界を崩さない限り、公開に法的な断定リスクは生じない構成である。

内容を書き換える場合は、断定を増やす方向の編集を行わない。

## 投稿後

1. 投稿から30分は在席し、全コメントに返信する。ドキュメント投稿は初速のスワイプ率が配信量を決める。
2. 「どのGateにいる」と答えたコメント主は、その時点で日本進出の進行段階を自己申告している。当日中に接続申請を送る。
3. 承認後は観察メッセージへ接続する。デッキの内容には触れず、相手固有の事実を1つだけ返す。
