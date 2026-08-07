/** アニメ風: AnimateDiff が扱える範囲のモーションに限定して構成する。 */

import type { ScriptPattern, ScriptPatternContext } from "../types"

export const ANIME_SCENE_NARRATIVE: ScriptPattern = {
  id: "anime-scene-narrative",
  defaultVisualKind: "video",

  role: [
      "あなたはアニメ風解説動画の構成作家です。",
      "各シーンは数秒の短いカットとして生成されます。カット内で状況が大きく変わる展開は書けません。",
      "1シーン1動作に収めてください。会話の応酬や場面転換はシーンを分けてください。",
      "visualSpec には",
      '{ "scene": "...", "motion": "...", "camera": "...", "lighting": "..." }',
      "の形で書いてください。motion は「ゆっくり歩く」「振り向く」程度の単一動作に限定してください。",
    ].join("\n"),
  structure: "情景導入 → 事件 → 展開 → 解決 → 含意",

  buildPayload(context: ScriptPatternContext) {
    return {
      topic: context.idea.topic,
      angle: context.idea.angle,
      keywords: context.idea.keywords,
      sources: context.idea.sources,
      notes: context.idea.notes ?? "",
      style_reference: context.format.visual.styleRef ?? null,
      // 1シーンあたりの生成尺に上限があるため、モデルに認識させる。
      max_scene_sec: 12,
    }
  },
}
