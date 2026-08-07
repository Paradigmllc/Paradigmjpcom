/**
 * lib/youtube/formats/definitions/index.ts — 形式カタログ
 *
 * 新しいチャンネル形式を足すときは、このディレクトリに1ファイル追加して
 * 下の配列に載せる。型定義、DB制約、レジストリ本体には手を触れない。
 */

import type { ChannelFormat } from "../types"

import { AI_VISUAL_SHORTS_EN } from "./ai-visual-shorts-en"
import { ANIME_EXPLAINER_JA } from "./anime-explainer-ja"
import { CHARACTER_AVATAR_JA } from "./character-avatar-ja"
import { MANGA_EXPLAINER_JA } from "./manga-explainer-ja"
import { MANIM_EXPLAINER_JA } from "./manim-explainer-ja"
import { NEWS_TREND_JA } from "./news-trend-ja"

export const FORMAT_DEFINITIONS: ChannelFormat[] = [
  MANIM_EXPLAINER_JA,
  NEWS_TREND_JA,
  MANGA_EXPLAINER_JA,
  CHARACTER_AVATAR_JA,
  ANIME_EXPLAINER_JA,
  AI_VISUAL_SHORTS_EN,
]
