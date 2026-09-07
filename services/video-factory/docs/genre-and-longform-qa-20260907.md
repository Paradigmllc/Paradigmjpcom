# ジャンル別の実生成と3章解説の内部QA — 2026-09-07

## 結論と境界

完成スタジオ・世界最高峰・無人量産の合格ではない。今回、同じOSS中心の構成で複数ジャンルの**実映像**と、**64秒 / 219秒の日本語解説**を作り、実物で確認できる段階へ進めた。技術成功を100点評価へ置き換えず、人による初稿レビュー・最終承認は未実施のまま維持する。

ユーザーから、人物・解説・漫画・アニメ・ドラマ・実写などのオールラウンド、ショートと長編、低コストを同時に求められている。商用SaaSの個別契約を増やす依頼ではない。既存の10/100判定を取り消す証拠もまだない。

## 実物の場所

ローカルQAルート: `/Users/apple/Desktop/Paradigm-video-QA-20260907`。モデル・音声・動画はGitに入れない。

| 系統 | レビュー用実物 | 確認結果 / 未解決 |
|---|---|---|
| 人物・演技 | `wan-qa-genres-20260907/portrait-continuity-review.mp4` | 顔・ボブ髪・ブラウスはおおむね継続。2カット目の右端に意図しない別人物。生成結果そのままでは演出不合格。口パク未検証 |
| 人物・編集修正 | `wan-qa-genres-20260907/portrait-reframe-review.mp4` | 960x528、左上からの固定crop。別人物を画面外にし、主役の表情を見やすくした比較案。ネイティブ生成の修正ではなく、画角・画素数を失う編集上の対処。原本保持 |
| 漫画風 | `wan-qa-genres-20260907/manga-continuity-review.mp4` | 墨線の一貫性とコートの動きは見えるが、人物の黒つぶれ・顔の小ささ・演出指示の不足。列車のヘッドライトは確認できず |
| アニメ風 | `wan-qa-genres-20260907/anime-continuity-review.mp4` | 衣装・背景・描線を継続、腕を下ろして歩く動作が出た。人物が遠く、表情・指の細部の品質は不足。シリーズ全体の同一人物維持は未検証 |
| ドラマ | `wan-qa-genres-20260907/drama-continuity-review.mp4` | 封筒・照明・人物の大枠を継続し、視線・笑顔・立ち上がりが出た。暗部が重く、終端では顔が画面上端に寄る。小道具・手指・複数人の芝居は合格していない |
| 実写風 | `wan-qa-genres-20260907/liveaction-continuity-review.mp4` | 岩・灯台・波は2カットを通して継続。空の白飛びと右上の暗い円弧が残り、カメラ前進も弱い。架空の景観で、実在の撮影記録ではない |
| 解説・短尺 | `water-cycle-ja/renders/water-cycle-ja-review-normalized.mp4` | 新規SVG・日本語ナレーション・原稿字幕、64秒。6段階の動く図解。音声の人の聴取は未完了 |
| 解説・3章 | `water-cycle-chapters-ja/renders/water-cycle-219s-review.mp4` | 219秒、5256フレーム、3章、18音声。第一章64秒を1回使用し、追加2章は新規作図・原稿・音声。長編ドラマの品質証明ではない |

5ジャンル10本を原本のstream copyで連結した比較版: `wan-qa-genres-20260907/genre-comparison-50s-review.mp4`。50.416667秒 / 1210フレーム / 1280x704 / 音声なし。人物→漫画→アニメ→ドラマ→実写、各約10秒。SHA-256 `13248784175fbfd8176eee37e871a31dcb6f430e807afc3892f63e0cd303c3ba`、全フレームdecodeでエラー0。欠点を隠さず、元の生成映像を比較できる。投稿用の完成動画ではない。

## GPU実験（生成・削除・独立確認完了）

- 単一インスタンス `50152759` / machine `12418` / RTX 4090。ラベル `paradigm-comfyui-wan-qa-genres-20260907`。
- 見積compute `$0.3622222222222223/hour`、100GB disk。事前見積$1以内は**請求上のハード上限ではない**。確定請求は未取得。
- 90分の実験上限、900秒bootstrap、600秒/生成、残り650秒未満なら次の生成を開始しない。同じGPUを再利用し、代替レンタル・自動リトライはしない。
- `vastai/comfy@sha256:694125bebb5b00d77878693770c9550602e9cbf644e9fe3d9b3b35ee27385e8d`。既存承認モデルのchecksum検証後に、隔離した未登録グラフでQA。本番registryや承認は変更していない。
- 実行コードはapp内の専用 `/tmp/studio-genre-qa.Lnlcbh`、成果物は `/data/video-factory/projects/wan-qa-genres-20260907`。`/opt/video-factory` の本番コードは上書きしていない。
- 1280x704 / 121フレーム / 24fps / 50steps / shift5 / CFG5。各ジャンル2本目は1本目の末尾フレームをI2Vへ渡す。単にプロンプトを同じにしただけではないが、長期の人物同一性を保証する手法でもない。
- 全10本の生成完了。起動から削除まで4506秒（75分6秒）、各生成は約418–431秒。`cleanup.json` removed=true、独立したprovider read-backでも対象削除済み・残存インスタンス0台を確認。
- 経過時間×見積compute単価は約$0.45338。storage/network/請求調整を含まない概算で、確定請求額ではない。採用済み完成動画は0本のため、採用1本あたり総原価は未確定。

## 解説系の実検証

- 64秒版: SHA-256 `102ee8e28e458c25fce645b120dec65e483243d0b496c7f5db70abca1cc4b072`。補正後 -16.04 LUFS / -2.76 dBTP。レイアウト15地点・motion 300サンプル・コントラスト49件を確認。
- 219秒版: SHA-256 `e70656615aa29ffe051d2885168f93b5518c59d95eb2b46c01027d34e1ace110`。-16.15 LUFS / -2.66 dBTP。レイアウト18地点・コントラスト22件、最終ソースで警告/エラー0。長編motion assertionは未設定で、成功数に含めない。
- 3章版の低コントラスト注記を除去し、地表流出を地中の線に見せていた図の位置を修正。章境界を含む10スナップショットと、完成MP4の9サンプルを目視。
- HyperFramesは0.7.87を維持。M1 8GB / 1 worker / low-memory、219秒の書き出しは8分45.6秒。1536枚の第1章ソースフレームを全抽出。元MP4の疎なキーフレームに関する警告はあり、任意シークの安定性は未証明。
- 既存AivisSpeech CPU engineの阿井田 茂 / Calm / model1.0.0、ACML1.0ポリシーを実際に読み、SHA拘束。原稿06本+追加12本を順番に合成。本人の発言・実人物のナレーションと誤認させない。
- CPU int8 / faster-whisper1.2.1 / smallの固定revisionで参照原稿の誘導なしにASR検査。終端217.86秒まで発話を検出。一方、草地・雨量・地下水の文など複数誤認識があり、自然さ/発音は**聴取前の未判定**。自動の合格スコアを付けない。
- 低ディスク状態のため、今回取得したWhisper smallのモデルキャッシュ486.2MBだけを検査終了後に削除。固定revisionで再取得可能。生成物・原稿・音声は保持。

再現ソース: [`../examples/water-cycle-ja`](../examples/water-cycle-ja/README.md)、[`../examples/water-cycle-chapters-ja`](../examples/water-cycle-chapters-ja/README.md)。科学的説明はUSGS一次資料を参照し、図は転載せず新規作図した。

## 既存ダッシュボードへの接続

- `register_sandbox_review.py` はsandbox名の既存MP4のみを、既存 `ProjectState` / `CreativeReview.pending` / 成果物APIへ取り込む。新しい別ダッシュボードを作らない。
- state・レビューをcreate-onlyで保護。path traversal・外部symlink・既存state・承認済みとする入力を拒否。全workspaceフォルダーを用意し、完成したstateを最後にatomic renameする。
- 最初の取込で本番webユーザー `nextjs` が `assets/input` を作れずHTTP500になることをログで特定。APIキー不一致ではなかった。既存workspace初期化を取込に追加し、このQAフォルダーだけを補完。本番の権限を緩める回避はしていない。
- 64秒版・219秒版・5ジャンル比較版と人物crop案をサーバーへ保管し、qa_failed / pendingで登録。ブロック理由は個別の画質/演出欠点と聴取・創作レビュー未完了。技術QAや配信を勝手に承認しない。
- 登録後、3プロジェクトの既存認証済みAPIで取得200を確認。短尺/3章は動画各1件、ジャンルQAは原本10件・正規化scene10件・比較masterとcrop各1件の計22件。新UIの本番稼働確認とは区別する。
- macOS tarのAppleDouble `._master.mp4` 2件が動画数を水増しした。ヘッダを確認してこのメタデータ2件だけを削除し、以後の転送は `COPYFILE_DISABLE=1 tar`。動画原本は保持。
- ブラウザでは `/video-factory-console` がCMSログインへ転送。Chromeの既存セッションも同じ。未デプロイの `/ja/admin/video-studio-control` は404。**本番GUIの確認・新UIの本番公開は未完了**。認証を迂回しない。

## 検証・残る受入条件

- service pytest 188件成功（既存Prefect終了時logging警告あり）、Ruff、mypy66ファイル、root TypeScript成功。音声クレジットの事前チェック、取込フォルダー初期化、ジャンル一括実験で紛らわしいcandidate指定の事前拒否も最終全件実行に含む。
- GPUモデルや有料APIを呼ぶCIテストは追加していない。ASRもテストはmockのみ。動画・音声・モデル・鍵をGitへ追加しない。
- 本番コードのリリースは依然正式gate経由のみ。PR #740はdraft。直前head `0a65478a` のrun `34116226118` はnpm auditでvalidate failure、deploy skipped。13 vulnerabilities / 8 highを確認し、共通CMS依存の監査失敗を迂回してmerge/deployしない。
- 人物の会話/口パク、多人数演技、長時間のキャラクター/衣装/物体の一貫性、ジャンルごとのSaaS比較、実際に採用された1本あたりの総原価、複数本連続運用、投稿後の成果は未検証。
- この初稿の人による創作レビューと、本番CMSの再ログインが必要。コードのテスト成功を完成宣言に使わない。
