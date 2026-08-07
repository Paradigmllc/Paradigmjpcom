/**
 * アニメ風(日本語) — AnimateDiff によるモーション生成。
 * この形式群のなかでは最も GPU を使うため、コスト対効果の検証対象に置く。
 */

import type { ChannelFormat } from "../types"
import { qualityContract } from "./quality-presets"

export const ANIME_EXPLAINER_JA: ChannelFormat = {
  id: "anime-explainer-ja",
  label: "アニメ風解説(日本語)",
  locale: "ja",
  aspect: "16:9",
  hypothesis:
    "AnimateDiff のモーションは、静止画コマ形式に対する追加GPUコストに見合う視聴維持率の上乗せを生むか。",

  research: {
    sources: ["youtube_data_api", "rss"],
    seedQueries: ["アニメで解説", "ストーリー 解説", "歴史 わかりやすく"],
    watchChannels: [],
  },

  script: {
    patternId: "anime-scene-narrative",
    framework: "情景導入 → 事件 → 展開 → 解決 → 含意",
    targetSec: 300,
    sceneRange: [6, 12],
  },

  render: {
    primary: {
      renderer: "comfyui",
      options: { workflow: "animatediff_video", frameRate: 24, framesPerScene: 32 },
    },
    // GPU 予算を超えた場合や ComfyUI 停止時は静止画 + カメラワークに退避する。
    fallback: {
      renderer: "hyperframes",
      options: { composition: "still-with-camera-motion" },
    },
  },

  visual: {
    engine: "comfyui",
    checkpoint: "animagine-xl-4.0.safetensors",
    loras: [{ name: "anime-cinematic-xl.safetensors", strength: 0.6 }],
    styleRef: "youtube/anime-explainer-ja/style-ref.png",
    character: { faceRef: "youtube/anime-explainer-ja/character-ref.png" },
  },

  voice: { engine: "edge_tts", voiceId: "ja-JP-NanamiNeural" },

  quality: qualityContract({
    locale: "ja",
    targetDurationSec: 300,
    minSceneCount: 6,
    maxSceneCount: 12,
  }),

  cost: { gpuAllowed: true, maxGpuMinutes: 45, maxUsdPerVideo: 3.5 },
}
