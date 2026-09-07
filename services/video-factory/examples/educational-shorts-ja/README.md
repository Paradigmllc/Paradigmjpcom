# 日本語・縦型解説ショートの実生成 — 2026-09-07

2本の独立した初稿。既存219秒動画を切り抜くのではなく、縦型の原稿・図解・日本語音声12行を新規制作した。HyperFramesスキルの制作・検査ループを使用し、技術検査と人の創作承認を分離する。納品・公開・収益化・全ジャンル量産の合格ではない。

| 作品 | 映像 | 完成音量 | 実レンダー時間 |
| --- | --- | --- | --- |
| 街の雨は、どこへ？ | 1080×1920 / 24fps / 32秒 / 768枚 | -16.03 LUFS / -3.41 dBTP | 100.135秒 |
| 地下水って、地下の川？ | 1080×1920 / 24fps / 34.5秒 / 828枚 | -16.01 LUFS / -3.33 dBTP | 93.568秒 |

## 実物・根拠

ローカルルート: `/Users/apple/Desktop/Paradigm-video-QA-20260907`

- 街の雨: `city-rain-short/renders/city-rain-32s-master.mp4`
- 地下水: `groundwater-short/renders/groundwater-34s-master.mp4`
- 生成音声: `shorts-audio/`。Gitには含めない。
- 構造化QA: `shorts-batch-evidence.json`
- 各作品の `check.json`、`renders/rendered-contact.png`、`renders/loudness-{before,final}.log` に実測記録。
- 各作品の `publishing-notes.md` に公開タイトル案・説明文・USGSの出典・音声クレジット。公開・納品は未実施。

SHA-256:

```text
city: 4ac519c2f9cbaa19c050e4abd62886a9458315bdca55be3541cf0fde0993ced8
groundwater: 8aa56b45049d7d0ff343bc1152421e43e7588debfb44128e3c8a79c14d885302
```

地下水のMP4コンテナはAAC末尾のため34.517秒。映像は828枚 / 24fps = 34.5秒で、映像を水増ししていない。

## 検査と修正

- 最終ソース: 各14地点のレイアウト、各300 motionサンプル、コントラスト50件/57件。エラー0。連続する1枚の図に見出し6個を置く `timeline_track_too_dense` 警告は各1件残る。
- 完成MP4の6枚/7枚を目視し、図・字幕・終盤を確認。未使用のコンタクトシート枠は黒いが動画の黒フレームではない。
- 地下水の水面が見えなかったCSSスケールをSVGのy/heightアニメーションへ変更。洞窟を山に見せていた輪郭、弱い流れ線のコントラスト、和文の折返しも修正。
- 完成MP4を全編デコードし音量を測定、2パス補正後に再測定。上表は補正後ファイルの測定値。音声・映像のデコードエラーなし。
- 字幕は原稿全文と音声開始時刻から作成。ASR単語タイムスタンプではない。音声の自然さ・誤読・聞き疲れを人が聴いたという主張はしない。
- BGM・効果音なしの音声中心の図解。地下水には意図的な読み取り時間があり、全編liveness判定の合格ではない。人物・アニメ・ドラマの完成品質はこの2本では検証できない。

## 再現と費用

HyperFrames **0.7.87** と既存GSAPを使用。最新版への変更・新依存追加なし。`narration-request.json` と既存 `tools/aivis_narration_probe.py` で、新しい空のQA出力先へ音声を生成する。既存阿井田 茂 / Calm / model1.0.0 のACML1.0ポリシーを全文確認し、SHA-256 `841ec166f293db138d5e0ccacf2aaab71bb0eecdad128af8ab3378708e3259dc` に拘束した。再利用時も声・用途・ポリシーを再確認する。

`city-rain-short/assets/audio/` にc1〜c6.wav、`groundwater-short/assets/audio/` にg1〜g6.wavを配置してから、各ディレクトリで0.7.87の `check` と `render` を実行。原本レンダーを保持したままFFmpeg loudnormの2パスで音量調整する。

ローカルの空き容量不足でレンダー前の容量検査が拒否したため、既存サーバーのCPUを使用。600秒timeout、nice19、1worker、low-memory、Node512MB、フレームキャッシュなしで**逐次**レンダーした。新GPUレンタル・新有料API・新サブスクは0。共有サーバー原価は未配賦で、総費用0円とは呼ばない。採用1本あたり原価も未確定。

## スタジオでの扱い

既存project/review/artifactの保存形式に `shorts-batch-20260907-internal-qa` として2本を取り込む。レビューはpending、human_approved=false、qa_passed=falseを維持する。制作ソース・試写用成果物であって、新規API・GUI・DB機能の追加や本番コードのデプロイではない。

人による初稿の聴取・創作レビュー、説明が誤解を招かないかの確認、投稿先の要件・利用条件・最終承認が残る。作品を見ずに100点評価や実務量産開始を宣言しない。
