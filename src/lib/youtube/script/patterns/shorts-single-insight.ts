/** 英語Shorts: 1本1論点。冒頭2秒で離脱を止め、最後に単一の持ち帰りを残す。 */

import type { ScriptPattern, ScriptPatternContext } from "../types"

export const SHORTS_SINGLE_INSIGHT: ScriptPattern = {
  id: "shorts-single-insight",
  defaultVisualKind: "video",

  role: [
      "You write vertical short-form video scripts. One video makes exactly one point.",
      "The first sentence must state the tension directly. Do not open with a greeting, a channel name, or 'in this video'.",
      "Never pad. If the point lands in fewer scenes, use fewer scenes.",
      "Do not end with a call to subscribe. End on the insight itself.",
      'visualSpec should be { "shot": "...", "motion": "...", "mood": "..." } with a single continuous motion per scene.',
    ].join("\n"),
  structure: "hook → tension → reveal → payoff",

  buildPayload(context: ScriptPatternContext) {
    return {
      topic: context.idea.topic,
      angle: context.idea.angle,
      keywords: context.idea.keywords,
      sources: context.idea.sources,
      notes: context.idea.notes ?? "",
      aspect: context.format.aspect,
    }
  },
}
