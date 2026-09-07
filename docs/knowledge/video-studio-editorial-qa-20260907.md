# 自作動画スタジオ：章台本・音声同期の実装検証

日付: 2026-09-07。PR #740 の開発ブランチ。未デプロイ。

## 今回の実装

- Pydantic `EditorialChapter` / `EditorialShot` が原稿、映像指示、画面の要点、素材、音声、秒数を保持する。
- 標準の長尺7分割を引き伸ばすのではなく、入力された章とショットをそのままタイムラインへコンパイル。完成尺との一致、章IDの重複、言語分離、権利宣言を検査する。120秒超では章台本必須。
- 構造上限は30分・999ショット・1ショット0.5〜30秒。これは入力・計画の上限であり、30分の作品品質や量産成功率の実証ではない。
- API `/v1/briefs/plan` と既存GUIの章台本欄から無課金の構造検証ができる。既存 `studio_project_created` の brief / manifest JSON を既存DBへ保存する設計を維持。DB bell / Slack の既存通知経路を維持する。
- 各ショットの音声を実測して配置。音源不足・尺超過はGPU起動前に停止する。勝手な読み上げ切断や倍速は行わない。音声変更後は組み立て直す。
- 編集用HyperFramesテンプレートは、入力された章題・見出し・本文・要点だけを表示。偽のグラフ・架空の製品画面は生成しない。動画品質評価を技術QAと混同しない。
- `.html.j2` をHTMLとしてエスケープする。原稿のHTML/scriptを実行させない回帰検査を追加。
- 支給素材が読めない実制作で空動画を返さない。短い支給動画の無断ループも禁止。
- 部分修正の未変更ショットは、入力・実装・素材ハッシュ・動画ハッシュが一致する検証記録がある場合だけ再利用。記録がない過去案件は安全に停止する。無断で他ショットを再生成しない。通常の全体実行に自動キャッシュや自動リトライは導入していない。
- 認識できる直接接続のWan生成グラフは、フレーム数/FPSから不足尺をGPU起動前に検出する。未知のグラフには推測値を付けず、既存の生成後ネイティブ尺検査を残す。
- GPU停止処理の「runningでなければ停止済み」という誤判定を修正。実状態がstopped/exited、希望状態と割当状態がstoppedのすべてを確認し、loading/frozen/offline等を成功扱いしない。確認できない場合は既存の状態API/GUIとDB bell + Slack向けoperator eventへ停止失敗を記録する。停止中でもストレージ費用は残るため、全課金停止とは表示しない。
- OSS workerが応答しても必要な承認済みprofile/revisionが欠ければreadyにしない。検証例外後にもworker変数が残り、readyと誤判定する経路を修正。

## 実際の36秒作品

内部QAプロジェクト `editorial-ja-36s-internal-qa`。3章・6ショット、各6秒。

- ローカル成果物: `/Users/apple/Desktop/Paradigm-video-QA-20260907/editorial-workspace/projects/editorial-ja-36s-internal-qa/master/master.mp4`
- 1280×720、24fps、36.020秒、H.264、実音声あり、WebVTT字幕あり。
- 音量測定: mean -25.1 dBFS / peak -7.5 dBFS。台本の間に無音区間がある。音量指標は自然な発音の保証ではない。
- HyperFrames 0.7.87 + FFmpeg で本当にレンダリングした。プレースホルダー生成ではない。
- この映像は文字・説明編集の検証作品。映画的T2V、人物演技、口形同期、長編全体の一貫性、商用採用率の証明ではない。
- 人による下書き/最終承認、外部公開、顧客納品はしていない。

### 日本語音声の原因切り分け

HyperFrames CLIのKokoro経路で日本語の短文を直接渡すと23.68秒となり、実用的な読み上げと判断できなかった。Kokoro用の日本語音素変換へ切り替えた候補では、6つの原稿が2.688 / 3.179 / 3.221 / 3.072 / 4.416 / 4.245秒で生成された。人の聴感評価と誤読チェックは未完了。

- 検証用パッケージ: kokoro-onnx 0.6.1、Misaki 0.9.4、pyopenjtalk 0.4.1、ONNX Runtime 1.29.0。
- `JAG2P(version='pyopenjtalk')` → `Kokoro.create(..., voice='jf_alpha', is_phonemes=True)`。
- モデル: `kokoro-v1.0.onnx` SHA-256 `7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5`。
- 音声バンク: `voices-v1.0.bin` SHA-256 `bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d`。
- モデルカード: <https://huggingface.co/hexgrad/Kokoro-82M>。日本語処理: <https://github.com/hexgrad/misaki> / <https://github.com/r9y9/pyopenjtalk>。
- 既存本番のライセンス/モデル台帳には承認を追加していない。コード・重み・音声バンク・辞書の利用条件と帰属表示を別々に確認し、正規の人間承認とexact hash bindingを行うまでsandbox扱い。
- 個別TTSサービスへの課金API呼び出しはなし。ローカル試験環境へだけ導入。モデルや生成音声をGitには入れない。

## 検証と残課題

- 最終検証: service pytest **150/150**、Ruff、mypy 64ファイル、root TypeScript、イベント受信API Vitest **5/5**、PC/モバイルE2E **2/2**が合格。Prefectのテスト終了時ログ警告は既存で残る（プロセスexit 0）。
- 60秒 / 600秒 / 1800秒の章コンパイル、同意チェック、認証付き計画API、音声実尺検査、部分修正の改変検出をテスト。
- GUI E2E: ローカル実APIでPC/390pxモバイルの両方を操作。正常計画、尺不一致、JSON構文エラー、ボタンのローディング解除、横スクロールなしを確認。
- 実行方法: `EDITORIAL_QA_OUTPUT=<artifact-directory> node services/video-factory/tools/verify-editorial-console.mjs`。ローカル8788のAPIとChromeを使い、制作runは送信しない。
- UIは現在、章台本のJSONを扱う上級者向け入力。自然文から自動で高品質な長編脚本を完成させる機能や、ワンクリックのOSS日本語TTSを実装済みとは表示しない。
- 3〜5分の内容が重複しない実作品、長尺時の音声/字幕の聴感評価、人物/被写体の同一性、用途別の採用秒単価、実課金台帳とdispatch/callbackの連動が残る。
- root npm auditは修正版がnpm未公開のimage-size/Payload等で失敗。検査無視・脆弱性許可リスト追加・本番反映はしていない。
- 本番完了には既存PR全体の費用制御の未接続部分、CI、正式release gate、本番fingerprint、人間による品質承認が必要。

## 5秒・720pの生成候補

隔離実験 `motion-candidate-20260907` は**生成前の起動タイムアウトで終了**。コピーしたT2Vグラフのlengthのみ49→121へ変更する検証を予定したが、GPUはloadingのままで、モデルハッシュ検査・生成段階まで到達しなかった。新しい720p動画の品質改善を示す結果は得られていない。

- Vast instance: 50131323 / label `paradigm-motion-candidate-20260907`。
- 20分のbootstrap打ち切り。後処理を含む実行時間1,216秒。停止→削除を実行し、別API照会でも対象なしを確認した。無断の再レンタルはなし。
- Hetzner成果物: `/data/video-factory/projects/motion-candidate-20260907/failure.json` は `TimeoutError`、`cleanup.json` は `removed:true`。MP4は0件。
- 設定価格: compute $0.162222/hour、稼働中に返された合計表示は $0.215556/hour。上限見積り$1、実費の最終確定は未確認。
- [公式インスタンス管理](https://docs.vast.ai/guides/instances/manage-instances)ではloadingは大きなイメージや低速回線で長引くと説明される。今回の状態表示もイメージpullだったが、ホスト内部の原因を断定する証拠はない。
- [公式状態定義](https://docs.vast.ai/sdk/python/reference/show-instances)と[課金説明](https://docs.vast.ai/guides/reference/billing)を照合。loading時間をそのままGPU実課金と計算しない。停止状態でもストレージ料金が続く。
- 次の有料試験は成功したホスト履歴・イメージキャッシュ・回線速度・準備時間込みの採用秒単価を比較して選定する。安い時間単価だけで選び、起動待ちを無制限に延長しない。今回の本番モデル/ワークフロー台帳への承認追加は0件。
