/**
 * 漫画風(日本語) — ComfyUI でコマの静止画だけ生成し、
 * HyperFrames 側でコマ割りとカメラワークを付ける。
 *
 * 動画生成モデルを使わないので GPU 課金が静止画推論のぶんだけで済み、
 * IP-Adapter で画風とキャラを固定できるためシリーズ性も保てる。
 */

import type { ChannelFormat } from "../types"
import { qualityContract } from "./quality-presets"

export const MANGA_EXPLAINER_JA: ChannelFormat = {
  id: "manga-explainer-ja",
  label: "漫画風解説(日本語)",
  locale: "ja",
  aspect: "16:9",
  hypothesis:
    "静止画コマ + カメラワークは、動画生成モデルの1/10のコストで同等以上の視聴維持率を出せる。",

  research: {
    sources: ["youtube_data_api", "rss"],
    seedQueries: ["体験談 漫画", "実話 マンガ", "失敗談 解説", "トラブル 対処"],
    watchChannels: [],
  },

  script: {
    patternId: "manga-panel-narrative",
    framework: "日常 → 異変 → 葛藤 → 転機 → 教訓",
    targetSec: 420,
    sceneRange: [10, 20],
  },

  render: {
    primary: {
      renderer: "hyperframes",
      options: { composition: "manga-panels", panelTransition: "ken-burns", gutterPx: 12 },
    },
  },

  visual: {
    engine: "comfyui",
    // ComfyUI ホストに配置済みであること。flux-dev では漫画線画は出ない。
    checkpoint: "animagine-xl-4.0.safetensors",
    loras: [{ name: "manga-monochrome-xl.safetensors", strength: 0.8 }],
    styleRef: "youtube/manga-explainer-ja/style-ref.png",
    character: { faceRef: "youtube/manga-explainer-ja/character-ref.png" },
  },

  voice: { engine: "edge_tts", voiceId: "ja-JP-NanamiNeural" },

  quality: qualityContract({
    locale: "ja",
    targetDurationSec: 420,
    minSceneCount: 10,
    maxSceneCount: 20,
    // 物語形式は構成が似通いやすいので、台本の類似度側を厳しくして担保する。
    overrides: { maxScriptSimilarityToRecent: 0.3, maxIdenticalStructureStreak: 4 },
  }),

  cost: { gpuAllowed: true, maxGpuMinutes: 8, maxUsdPerVideo: 0.6 },
}
