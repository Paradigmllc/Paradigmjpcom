/**
 * 解説系(日本語) — manim による決定論レンダリング。
 * 拡散モデルを使わないため AI スロップ判定を受けにくく、GPU も不要。
 */

import type { ChannelFormat } from "../types"
import { qualityContract } from "./quality-presets"

export const MANIM_EXPLAINER_JA: ChannelFormat = {
  id: "manim-explainer-ja",
  label: "解説アニメーション(日本語 / manim)",
  locale: "ja",
  aspect: "16:9",
  hypothesis:
    "コード生成による決定論レンダリングは、拡散モデル生成より視聴維持率と収益化安定性で優る。",

  research: {
    sources: ["youtube_data_api", "rss"],
    seedQueries: ["仕組み 解説", "なぜ 数学", "アルゴリズム 図解", "統計 誤解"],
    watchChannels: [],
  },

  script: {
    patternId: "explainer-concept-buildup",
    framework: "疑問提示 → 素朴な直観 → 反例 → 正しい構造 → 再定義",
    targetSec: 480,
    sceneRange: [8, 16],
  },

  render: {
    primary: { renderer: "manim", options: { quality: "high", fps: 60, resolution: "1920x1080" } },
    fallback: { renderer: "hyperframes", options: { composition: "explainer-fallback" } },
  },

  visual: { engine: "none" },

  voice: { engine: "edge_tts", voiceId: "ja-JP-KeitaNeural" },

  quality: qualityContract({
    locale: "ja",
    targetDurationSec: 480,
    minSceneCount: 8,
    maxSceneCount: 16,
    // 解説系は題材が近いと言い回しも寄るため、構成の反復にはより厳しくする。
    overrides: { maxIdenticalStructureStreak: 2 },
  }),

  cost: { gpuAllowed: false, maxGpuMinutes: 0, maxUsdPerVideo: 0.5 },
}
