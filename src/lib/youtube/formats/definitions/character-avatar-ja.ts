/**
 * キャラクターアバター解説(日本語) — 1枚のキャラ画を LivePortrait で喋らせ、
 * HyperFrames で図解と合成する。HeyGen の代替にあたる構成。
 */

import type { ChannelFormat } from "../types"
import { qualityContract } from "./quality-presets"

export const CHARACTER_AVATAR_JA: ChannelFormat = {
  id: "character-avatar-ja",
  label: "キャラクターアバター解説(日本語)",
  locale: "ja",
  aspect: "16:9",
  hypothesis:
    "固定キャラクターの継続露出はチャンネル記憶率を高め、登録者転換率を無人格ナレーションより改善する。",

  research: {
    sources: ["youtube_data_api", "rss"],
    seedQueries: ["初心者向け 解説", "ニュース わかりやすく", "用語 意味"],
    watchChannels: [],
  },

  script: {
    patternId: "character-dialogue-explainer",
    framework: "キャラの問いかけ → 誤解の提示 → 訂正 → 具体例 → まとめ",
    targetSec: 360,
    sceneRange: [6, 14],
  },

  render: {
    primary: {
      renderer: "hyperframes",
      options: { composition: "avatar-explainer", avatarSlot: "bottom-right", diagramSlot: "center" },
    },
  },

  visual: {
    engine: "comfyui",
    checkpoint: "animagine-xl-4.0.safetensors",
    styleRef: "youtube/character-avatar-ja/style-ref.png",
    character: {
      faceRef: "youtube/character-avatar-ja/character-ref.png",
      livePortrait: true,
    },
  },

  // クローン音声でキャラの声を固定する。edge_tts の既製声だと同型チャンネルと被る。
  voice: {
    engine: "voice_pro",
    voiceId: "paradigm-character-ja-01",
    cloneRef: "youtube/character-avatar-ja/voice-ref.wav",
  },

  quality: qualityContract({
    locale: "ja",
    targetDurationSec: 360,
    minSceneCount: 6,
    maxSceneCount: 14,
  }),

  cost: { gpuAllowed: true, maxGpuMinutes: 12, maxUsdPerVideo: 0.9 },
}
