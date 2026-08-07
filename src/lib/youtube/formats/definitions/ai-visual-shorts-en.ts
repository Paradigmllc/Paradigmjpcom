/**
 * ビジュアルShorts(英語) — 動画生成モデル主体の縦型。
 * この形式群で最もGPUコストが高く、収益化リスクも高い。
 * 反復性の閾値を最も厳しく設定して量産判定を避ける。
 */

import type { ChannelFormat } from "../types"
import { qualityContract } from "./quality-presets"

export const AI_VISUAL_SHORTS_EN: ChannelFormat = {
  id: "ai-visual-shorts-en",
  label: "AI Visual Shorts (English)",
  locale: "en",
  aspect: "9:16",
  hypothesis:
    "生成映像主体のShortsは、GPUコストを回収できるRPMに到達するか。到達しない場合は決定論レンダリングに全面移行する。",

  research: {
    sources: ["youtube_data_api", "hackernews"],
    // YouTube 検索にはタイトル的な言い回しが効く。
    seedQueries: ["explained in 60 seconds", "how it actually works", "what nobody tells you"],
    // Hacker News には題材そのものを渡さないと当たらない(実測でタイトル語は0件だった)。
    sourceQueries: {
      hackernews: ["machine learning", "distributed systems", "cryptography", "compiler"],
    },
    watchChannels: [],
  },

  script: {
    patternId: "shorts-single-insight",
    framework: "hook → tension → reveal → payoff",
    targetSec: 45,
    sceneRange: [3, 6],
  },

  render: {
    primary: {
      renderer: "comfyui",
      options: { workflow: "svd_video", frameRate: 25, resolution: "1080x1920" },
    },
    fallback: {
      renderer: "hyperframes",
      options: { composition: "shorts-kinetic-type" },
    },
  },

  visual: {
    engine: "comfyui",
    checkpoint: "flux-dev-fp8.safetensors",
    // flux-dev は写実寄りの出力になるため、合成メディアの開示対象として扱う。
    realisticDepiction: true,
    styleRef: "youtube/ai-visual-shorts-en/style-ref.png",
  },

  voice: { engine: "edge_tts", voiceId: "en-US-AndrewNeural" },

  quality: qualityContract({
    locale: "en",
    targetDurationSec: 45,
    minSceneCount: 3,
    maxSceneCount: 6,
    overrides: {
      // Shorts は本数が出るぶん量産判定を受けやすい。最も厳しい閾値を置く。
      maxScriptSimilarityToRecent: 0.25,
      maxTitleSimilarityToRecent: 0.4,
      recentComparisonWindow: 30,
      maxIdenticalStructureStreak: 2,
      // 短尺でも密度は落とさない。
      minNarrationCharsPerMinute: 750,
    },
  }),

  cost: { gpuAllowed: true, maxGpuMinutes: 20, maxUsdPerVideo: 1.5 },
}
