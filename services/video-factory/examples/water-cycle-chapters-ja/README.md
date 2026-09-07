# 日本語3章・3分39秒の内部QA

64秒の循環説明を第1章として1回だけ使用し、新規の地下水・都市流出の2章を加えたレビュー用ソースです。長編ドラマ、アバター会話、量産の品質合格ではありません。

## 入力とタイムライン

- `assets/chapter-one.mp4`: 隣の `water-cycle-ja` の実際の64秒完成尺。音量補正済みSHA-256 `102ee8e28e458c25fce645b120dec65e483243d0b496c7f5db70abca1cc4b072`。
- `assets/audio/07.wav`〜`18.wav`: 新規12原稿。既存AivisSpeech / 阿井田 茂の同じ声・速度1.0で生成。権利・ポリシーの確認手順は隣のREADMEと `aivis_narration_probe.py` を参照。
- 第1章 0–64秒、第2章 64–139.541667秒、第3章 139.541667–219秒。画像の固定延長や第1章の反復ではありません。
- ナレーション・字幕は実測尺から配置。再合成した音声の尺が変わったら、音声窓・字幕窓・章窓を全て再計算すること。

## 検証とレンダー

HyperFrames **0.7.87**を維持。新規ライブラリ導入不要。

```sh
npx hyperframes@0.7.87 check --samples 18 --timeout 30000 --json
npx hyperframes@0.7.87 snapshot --at 63,64.8,80,103,138,140.5,169,185,218 --timeout 30000 --describe false
npx hyperframes@0.7.87 render --fps 24 --quality high --workers 1 --low-memory-mode --frames-cache-dir off
```

FFmpeg / FFprobeが必要。検証とレンダーを低メモリ環境で同時に多重起動しない。初回の10秒ナビゲーション制限ではタイムアウトし、30秒に設定した検証は成功しました。検査の省略や本番バージョンの更新で回避しないでください。

実レンダーは **219秒 / 5256フレーム / H.264+AAC / 1280x720 / 24fps**。M1 8GBで1 worker、8分45.6秒。SHA-256 `e70656615aa29ffe051d2885168f93b5518c59d95eb2b46c01027d34e1ace110`。-16.15 LUFS / -2.66 dBTP。全編のレイアウト18地点・コントラスト22件の検査と完成フレームの目視確認を実施しました。長編のmotion assertionは未設定で、合格件数に含めません。

第1章にはキーフレーム間隔の警告があります。この試行の書き出しは全1536フレームを抽出し coverage=1 でしたが、任意シークの安定性は別途検証が必要です。

ASRはCPU int8 / faster-whisper 1.2.1 / Systran small、revision `536b0662742c02347bc0e980a01041f333bce120`。全編の音声ミックスを参照原稿で誘導せず文字起こしし、217.86秒まで発話を検出。漢字・単語の誤認識が複数あり、自然な発音・可聴品質の合否は未確定です。原稿字幕をASR結果で上書きしないでください。

`register_sandbox_review.py` は既存Factoryコンソールの成果物・pendingレビュー形式に取り込みます。既存stateを上書きせず、権利・技術QA・人の承認・配信承認を付与しません。

参考: [地下水の流れ](https://www.usgs.gov/water-science-school/science/groundwater-flow-and-water-cycle)、[地表流出](https://www.usgs.gov/water-science-school/science/surface-runoff-and-water-cycle)。図はオリジナルの模式図で、粒の数や矢印の速さを実測値として解釈しないでください。
