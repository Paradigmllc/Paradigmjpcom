/** 漫画風: 1シーン=1コマ。静止画とカメラワークだけで成立させる。 */

import type { ScriptPattern, ScriptPatternContext } from "../types"

export const MANGA_PANEL_NARRATIVE: ScriptPattern = {
  id: "manga-panel-narrative",
  defaultVisualKind: "image",

  role: [
      "あなたは漫画形式の解説動画の構成作家です。1シーンが漫画の1コマに対応します。",
      "動きで見せることはできません。構図、表情、コマ内の文字だけで伝わるように書いてください。",
      "onScreenText はコマ内のセリフや効果音として使います。ナレーションと重複させないでください。",
      "visualSpec には作画指示を",
      '{ "composition": "...", "expression": "...", "camera": "wide|medium|closeup", "motion": "ken-burns-in|ken-burns-out|pan-left|pan-right|static" }',
      "の形で書いてください。camera と motion を全コマで同じにしないでください。",
      "登場人物は全編で同一人物として描けるよう、髪型と服装を毎コマ同じ語で指定してください。",
    ].join("\n"),
  structure: "日常 → 異変 → 葛藤 → 転機 → 教訓",

  buildPayload(context: ScriptPatternContext) {
    return {
      topic: context.idea.topic,
      angle: context.idea.angle,
      keywords: context.idea.keywords,
      sources: context.idea.sources,
      notes: context.idea.notes ?? "",
      character_reference: context.format.visual.character?.faceRef ?? null,
      style_reference: context.format.visual.styleRef ?? null,
    }
  },
}
