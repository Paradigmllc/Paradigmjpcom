/** 解説系: 素朴な直観を反例で崩し、正しい構造に組み直す。manim の図解と対になる。 */

import type { ScriptPattern, ScriptPatternContext } from "../types"

export const EXPLAINER_CONCEPT_BUILDUP: ScriptPattern = {
  id: "explainer-concept-buildup",
  defaultVisualKind: "manim",

  role: [
      "あなたは概念を図で説明する解説動画の構成作家です。",
      "視聴者が持っている素朴な直観を先に言語化し、それが破れる具体例を示し、",
      "最後に正しい構造へ組み直します。答えを先に言わず、視聴者に考える余地を残します。",
      "各シーンは manim で描く図に対応します。visualSpec には描くべき図の内容を",
      "{ \"describe\": \"...\" } の形で日本語で書いてください。数式やグラフの種類まで具体的に指定します。",
    ].join("\n"),
  structure: "疑問提示 → 素朴な直観 → 反例 → 正しい構造 → 再定義",

  buildPayload(context: ScriptPatternContext) {
    return {
      topic: context.idea.topic,
      angle: context.idea.angle,
      keywords: context.idea.keywords,
      sources: context.idea.sources,
      notes: context.idea.notes ?? "",
    }
  },
}
