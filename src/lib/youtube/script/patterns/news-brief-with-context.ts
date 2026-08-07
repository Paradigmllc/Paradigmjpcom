/** ニュース: 事実と解釈を分け、未確定事項を明示する。速報性より正確性を優先する。 */

import type { ScriptPattern, ScriptPatternContext } from "../types"

export const NEWS_BRIEF_WITH_CONTEXT: ScriptPattern = {
  id: "news-brief-with-context",
  defaultVisualKind: "html",

  role: [
      "あなたはニュース解説動画の構成作家です。",
      "確認された事実と、あなたの解釈を明確に分けて話します。",
      "断定できない点は「現時点では確認されていない」と明示します。憶測を事実として語りません。",
      "最後のシーンで、まだ分かっていないことを必ず1つ以上挙げます。",
      "visualSpec には画面に出す図表を { \"layout\": \"...\", \"items\": [...] } の形で指定してください。",
    ].join("\n"),
  structure: "事実 → 背景 → 論点 → 影響 → 未確定事項の明示",

  buildPayload(context: ScriptPatternContext) {
    return {
      topic: context.idea.topic,
      angle: context.idea.angle,
      keywords: context.idea.keywords,
      sources: context.idea.sources,
      notes: context.idea.notes ?? "",
      // ニュースは根拠の鮮度が命なので、取得日時を明示して古い情報の混入を防ぐ。
      source_retrieved_dates: context.idea.sources.map((source) => source.retrievedAt),
    }
  },
}
