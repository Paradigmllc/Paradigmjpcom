/**
 * ニュース / トレンド(日本語) — HyperFrames のみで作る低コスト形式。
 * Reddit の伸長投稿を先行指標として使い、リサーチ層の予測精度を測る。
 */

import type { ChannelFormat } from "../types"
import { qualityContract } from "./quality-presets"

export const NEWS_TREND_JA: ChannelFormat = {
  id: "news-trend-ja",
  label: "ニュース・トレンド解説(日本語)",
  locale: "ja",
  aspect: "16:9",
  hypothesis:
    "Google News の初報は日本語YouTubeの検索需要に3〜7日先行する。先行検知した題材は同ジャンル平均を上回る。",

  research: {
    sources: ["rss", "youtube_data_api"],
    // YouTube 検索にはタイトル的な言い回しが効く。
    seedQueries: ["ニュース 解説", "何が起きたのか", "わかりやすく 解説"],
    // RSS は主要ニュース一覧を使う。検索フィードは単発記事が多く、
    // description に関連見出しが入らないため事実材料が取れない(実測)。
    sourceQueries: { rss: ["*"] },
    watchChannels: [],
  },

  script: {
    patternId: "news-brief-with-context",
    framework: "事実 → 背景 → 論点 → 影響 → 未確定事項の明示",
    targetSec: 240,
    sceneRange: [5, 10],
  },

  render: {
    primary: {
      renderer: "hyperframes",
      options: { composition: "news-brief", lowerThird: true, sourceBadge: true },
    },
  },

  visual: { engine: "none" },

  voice: { engine: "edge_tts", voiceId: "ja-JP-KeitaNeural" },

  quality: qualityContract({
    locale: "ja",
    targetDurationSec: 240,
    minSceneCount: 5,
    maxSceneCount: 10,
    overrides: {
      // ニュースは構成が定型になりやすいので、構成反復の許容を広めに取る代わりに
      // 台本の類似度を強く締め、内容の使い回しを防ぐ。
      maxScriptSimilarityToRecent: 0.28,
      maxIdenticalStructureStreak: 6,
      // 速報性より正確性を優先する。全主張に一次ソースを要求する。
      requireSourceForClaims: true,
    },
  }),

  cost: { gpuAllowed: false, maxGpuMinutes: 0, maxUsdPerVideo: 0.3 },
}
