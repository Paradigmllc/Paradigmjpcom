# 日本語64秒・オリジナル図解の内部QA

これはレビュー用の再現ソースです。モデル承認、顧客納品、量産合格の証拠ではありません。生成済みMP4・音声・モデルをGitに入れないでください。

## 構成

- HyperFrames **0.7.87**、GSAP **3.14.2**、1280x720 / 24fps / 64秒。
- オリジナルSVGの海・山・雲・雨・地下水を、日本語ナレーション6本と同期。
- 字幕は原稿に合わせた段落単位。ASR文字起こしをそのまま字幕にしていません。
- AivisSpeechの既存CPUエンジン、阿井田 茂 / Calm、speaker ID `1310138977`。ポリシー本文SHA-256は `841ec166f293db138d5e0ccacf2aaab71bb0eecdad128af8ab3378708e3259dc`。新たな本番モデル登録・自動承認はしていません。

## 再現時

1. 専用QAフォルダーへこのソースをコピーする。エンジンURLはレビュー済み内部接続を指定し、公開しない。
2. `tools/aivis_narration_probe.py --base-url <internal-engine> --request narration-request.json --output assets/audio`。同じ出力先への自動再実行は禁止。
3. `audio-meta.json` の各実測尺がHTML内の音声・字幕窓と一致するか確認する。別の声・速度で生成した音声に、固定タイミングを使い回さない。
4. FFmpeg / FFprobeをPATHに配置し、`npx hyperframes@0.7.87 check --samples 15 --timeout 30000 --json` と実フレームの目視確認を行う。
5. `npx hyperframes@0.7.87 render --fps 24 --quality high --workers 1 --low-memory-mode`。
6. 全編の音量、字幕、説明内容を検査し、人の初稿レビューへ。技術検査だけで品質承認しない。

2026-09-07の音量補正済み実物: SHA-256 `102ee8e28e458c25fce645b120dec65e483243d0b496c7f5db70abca1cc4b072`。補正後 -16.04 LUFS / -2.76 dBTP。確認場所はスタジオQAレポートを参照。

科学的説明の参照: [USGS Water Cycle](https://www.usgs.gov/special-topics/water-science-school/water-cycle)、[Condensation](https://www.usgs.gov/water-science-school/science/condensation-and-water-cycle)。図は転載せず新規作図。縮尺・矢印は観測値ではありません。
