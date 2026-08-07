/**
 * lib/youtube/script/patterns/index.ts — 台本パターンのレジストリ
 *
 * 形式定義の script.patternId がここのIDと1対1で対応する。
 * 対応が切れている状態は起動時に検出できるよう、専用の検証関数を用意してある。
 */

import type { ScriptPattern } from "../types"

import { ANIME_SCENE_NARRATIVE } from "./anime-scene-narrative"
import { CHARACTER_DIALOGUE_EXPLAINER } from "./character-dialogue-explainer"
import { EXPLAINER_CONCEPT_BUILDUP } from "./explainer-concept-buildup"
import { MANGA_PANEL_NARRATIVE } from "./manga-panel-narrative"
import { NEWS_BRIEF_WITH_CONTEXT } from "./news-brief-with-context"
import { SHORTS_SINGLE_INSIGHT } from "./shorts-single-insight"

const PATTERNS: ScriptPattern[] = [
  EXPLAINER_CONCEPT_BUILDUP,
  NEWS_BRIEF_WITH_CONTEXT,
  MANGA_PANEL_NARRATIVE,
  CHARACTER_DIALOGUE_EXPLAINER,
  ANIME_SCENE_NARRATIVE,
  SHORTS_SINGLE_INSIGHT,
]

const REGISTRY = new Map(PATTERNS.map((pattern) => [pattern.id, pattern]))

export function listPatterns(): ScriptPattern[] {
  return [...REGISTRY.values()]
}

export function getPattern(id: string): ScriptPattern | null {
  return REGISTRY.get(id) ?? null
}

export function requirePattern(id: string): ScriptPattern {
  const pattern = getPattern(id)
  if (!pattern) {
    throw new Error(`[youtube/script] 未登録の台本パターンです: ${id} (登録済み: ${[...REGISTRY.keys()].join(", ")})`)
  }
  return pattern
}
