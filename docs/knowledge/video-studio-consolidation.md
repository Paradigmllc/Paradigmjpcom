# 動画スタジオ統合設計

複数に分裂していた動画パイプラインを1本に統合し、複数 YouTube チャンネルを
リサーチ→台本→制作→検証→投稿まで一気通貫で回すための設計。

作成 2026-08-07。

---

## 1. 統合前に何があったか

調査で6本見つかった。うち2本（D・E）が目的重複、1本（B）が死亡、1本（E）が git 管理外だった。

| # | 名前 | 場所 | 判定 |
|---|---|---|---|
| A | 営業診断動画 | `src/lib/sales/video-generator.ts` | **残す**（営業用。統合対象外） |
| B | ComfyUI プロ動画 | `src/lib/sales/video-comfyui.ts` | **作り直し**。ComfyUI 到達不能で死亡 |
| C | VaaS 商用ジョブ | `src/lib/sales/video-pipeline.ts` 他 | **残す**（受注制作。統合対象外） |
| D | YouTube 自動運用 | `src/lib/youtube/` | **統合の骨格にする** |
| E | YouTube Media OS | `/opt/youtube-media-os`（git 管理外だった） | **筋肉として D に取り込む** |
| F | Pet Life Movie | `main` の `src/lib/pet-life-movie/` | **別事業**。統合対象外 |

A・C は営業/受注という別目的なので混ぜない。混ぜると品質要件（顧客提出物 vs 自社チャンネル）が
衝突して両方壊れる。F も消費者向け商品なので別。

**統合対象は D と E の2本だけ。**

---

## 2. なぜ D を骨格、E を筋肉にするか

同じ「YouTube 複数チャンネル運用」を狙いながら、強みが正反対だった。

| 観点 | D (`src/lib/youtube`) | E (media-os) |
|---|---|---|
| 言語 | TypeScript（型あり） | .mjs（型なし） |
| ジャンル追加 | **形式レジストリ**。`definitions/` に1ファイルで増える | テンプレートが個別実装 |
| 品質ゲート | **あり**。反復性/情報密度/未検証断定/合成メディア開示 | 部分的（5種の quality-core） |
| 人間審査 | **あり**。DB + admin UI + 履歴 | 署名レビューのみ |
| テスト | 175本 | 一部 |
| ナレーション | edge-tts のみ | **Kokoro / 声質モデル / 音声組み立て** |
| 音楽・効果音 | なし | **オリジナルスコア生成 / サウンドデザイン / ミックス** |
| 字幕 | 発話区間から生成 | **ASS 字幕 / フォント取得 / 転写検証** |
| GPU | なし（ComfyUI は死亡した B 側） | **Vast ライフサイクル / GPU アセット / ComfyUI 実行** |
| 長尺 | 未対応 | **10〜20分マスター + 縦切り出し** |
| 横断検証 | なし | **ポートフォリオ変動監査** |

骨格を E にすると型と品質ゲートと審査を作り直すことになる。
筋肉を D で作り直すと TTS・音楽・GPU・長尺を全部再実装することになる。
**D の器に E の中身を移すのが最短。**

---

## 3. 統合後の構造

```
src/lib/youtube/
  formats/        ジャンル定義（データ駆動。1ファイル追加で1ジャンル）
  research/       リサーチ（RSS / HN / Reddit / YouTube）
  script/         台本（構成→本文→メタの3段生成）
  render/         HyperFrames 合成（図表・字幕・レイアウト）
  quality/        公開前ゲート（AdSense 対策の核）
  review/         人間承認（DB + admin UI）
  ── 以下 E から移設 ──
  audio/          ナレーション / BGM / 効果音 / ミックス
  visual/         ComfyUI アセット / GPU / スタイル
  gpu/            Vast.ai ライフサイクル（使う時だけ課金）
  longform/       長尺マスター + 縦切り出し
  portfolio/      チャンネル横断の反復性監査
```

`scripts/media-os/*.mjs` は動く実装が既にあるので、**いきなり書き換えない**。
① まず .mjs のまま呼び出して動作確認 → ② 使うものだけ TS 化して `src/lib/youtube/` へ移設
→ ③ 移設できたら .mjs を削除、の順にする。一括書き換えは事故る。

---

## 4. ジャンル別の実現手段（全て OSS）

有料 API（HeyGen / Runway / ElevenLabs）は使わない。

| ジャンル | 実現手段 | 課金 |
|---|---|---|
| 解説アニメーション | **manim**（数式・図解アニメ） | 無料 |
| Loom風 画面解説 | **openscreen**（Screen Studio 代替） | 無料 |
| 漫画風 / アニメ風 / イラスト | **ComfyUI**（SDXL / AnimateDiff）on Vast.ai | GPU 従量 |
| まとめ・ニュース解説 | **HyperFrames**（既存。図表アニメ実装済み） | 無料 |
| キャラクターアバター | ComfyUI + 口パク同期 | GPU 従量 |
| 実写素材 | Openverse / Wikimedia（CC。**帰属表記の機械化が必須**） | 無料 |
| ナレーション | **Kokoro / Edge-TTS**、声質は **voice-pro**(E2/F5-TTS, CosyVoice) | 無料 |
| 字幕 | **Whisper** + ASS 字幕生成（E に実装済み） | 無料 |
| BGM・効果音 | オリジナルスコア生成（E に実装済み） | 無料 |
| 編集 | OpenCut EDL（E に `adapt-opencut-edl` あり） | 無料 |

### GitHub スターから採用するもの

| OSS | 用途 |
|---|---|
| `3b1b/manim` | 解説アニメーション本体 |
| `siddharthvaddem/openscreen` | Loom風 画面録画 |
| `abus-aikorea/voice-pro` | 声質クローン・多言語（ElevenLabs 代替） |
| `linouk23/youtube_uploader_selenium` | 投稿。**Data API のクォータを消費しない** |
| `praw-dev/praw` | Reddit リサーチ（匿名 JSON が 403 になった問題の解決） |
| `riyanshaikh134/youtube-channels-video-scraper` | 競合チャンネル分析 |
| `jina-ai/reader` | URL→LLM 入力（リサーチ前処理） |
| `alirezamika/autoscraper` | 軽量スクレイパ |
| `lwthiker/curl-impersonate` | ブロック回避（規約の範囲で） |
| `Paradigmllc/gspread-pandas` + `burnash/gspread` | チャンネル実績を Google Sheets で追跡 |
| `Vibrant-Colors/node-vibrant` | サムネの配色抽出 |
| `danielmiessler/Fabric` | 台本プロンプトの型 |

---

## 5. コスト方針

**原則: 常時稼働するものに金を払わない。**

| 項目 | 方針 |
|---|---|
| GPU | Vast.ai を `withVastComfyInstance` で **create → 実行 → finally で destroy**。常時起動禁止 |
| LLM | DeepSeek 既定（Context Caching でヒット時 入力 90% 引き）。精度が要る所だけ上位モデル |
| TTS | Kokoro / Edge-TTS。ローカル実行で 0 円 |
| 音楽 | 自前スコア生成。ライセンス料 0 |
| レンダリング | 自前サーバーの CPU。**ただし本番サイトと同居しているので長尺は要注意** |
| 保管 | R2（エグレス無料） |

### Vast.ai の扱い（要件として明示された）

`scripts/media-os/vast-lifecycle.mjs` に既に正しい形がある。

```js
export async function withVastComfyInstance(config, action) {
  const instanceId = await createVastComfyInstance(config);
  try { return await action({ instanceId, endpoint: ... }); }
  finally { await destroyVastInstance(instanceId, config.apiKey); }
}
```

**守ること**: ① `finally` で必ず destroy ② ジョブ単位で起動しバッチでまとめる
③ 起動したまま落ちた場合に備えて孤児インスタンスの定期回収 ④ 起動/破棄を必ず記録して課金と突合。

---

## 6. AdSense 対策（品質）

収益化剥奪の主因は「大量生産された無価値コンテンツ」判定。**機械判定と人間審査の二段**で防ぐ。

### 機械判定（`quality/policy-gate.ts`。実装済み）

- **反復性**: 文字 3-gram Jaccard + 構成指紋。直近 N 本との差分を測る。
  チャンネル単位の反復が判定材料になるため、1本単体では測れない
- **情報密度**: 尺に対する情報量
- **未検証の断定**: 出典の無い数値・断定を弾く
- **メタデータ整合**: タイトル/説明/本文の不一致
- **合成メディア開示**: AI 音声・AI 映像の開示

### 追加すべきもの

- **ポートフォリオ横断監査**（E の `portfolio-variation-audit`）：
  チャンネル間でテンプレが同じだと「量産」と見なされる。チャンネル横断で反復性を測る
- **出典必須**: 実測で「ゲート通過した台本が出典に無い税率を創作」した事故がある。
  数値には必ず出典 URL を紐付け、無い数値は台本から落とす

### 人間審査（`review/`。実装済み）

ゲート通過 ≠ 公開可能。**公開前に必ず人間が承認**。承認履歴を残す。

---

## 7. 実施順序

**原則: 動いているものを壊さない。E は動かしたまま、D 側に移してから止める。**

1. **[完了] E を git に保全** — `09784e65`
2. **E の現状棚卸し** — `database is locked` の原因（SQLite 競合）を特定。Supabase へ寄せる判断
3. **Vast ライフサイクルの TS 化** — 最優先。コスト直結。孤児回収と課金記録も同時に
4. **音声レーン移設** — Kokoro TTS + 字幕 + BGM。既存 `render/tts.ts` を置き換え
5. **ComfyUI レーン再建** — 死んだ B は捨て、E の `run-comfyui-assets` を Vast ライフサイクル上で再建
6. **ジャンル追加** — manim / openscreen / 漫画風 / アニメ風 を形式レジストリに定義
7. **長尺 + 縦切り出し** — 10〜20分マスター → Shorts/TikTok/IG
8. **投稿層** — youtube_uploader_selenium + Telegram 承認
9. **実績追跡** — gspread-pandas で Sheets へ。チャンネル横断の検証
10. **E の停止** — 全機能が D 側で動いてから `/opt/youtube-media-os` を止める

---

## 8. 未決事項

以下はユーザー判断が要る。

- **チャンネル構成**: 何チャンネルを、どのジャンルで、どの言語で立てるか
- **本番デプロイ**: 現在この作業ブランチは main から 1,554 コミット遅れで未デプロイ。
  統合物をどう本番に載せるか（main へマージするか、別アプリとして切るか）
- **レンダリング先**: 本番サイトと同居ホストで長尺を回すのは危険。専用ホストを立てるか
- **実写素材**: CC-BY の帰属表記を機械的に守る実装が要る。やるかどうか
