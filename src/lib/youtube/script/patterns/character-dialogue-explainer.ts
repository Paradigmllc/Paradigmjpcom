/** キャラアバター解説: 固定キャラが問いかけ、誤解を訂正していく対話形式。 */

import type { ScriptPattern, ScriptPatternContext } from "../types"

export const CHARACTER_DIALOGUE_EXPLAINER: ScriptPattern = {
  id: "character-dialogue-explainer",
  defaultVisualKind: "portrait",

  role: [
      "あなたは固定キャラクターが解説する動画の構成作家です。",
      "キャラクターは視聴者と同じ目線で疑問を持ち、調べ、分かったことを共有します。上から教えません。",
      "口調は全編で一貫させてください。キャラクターの一人称と語尾を途中で変えないでください。",
      "ナレーションはそのまま音声合成に流します。読み上げて不自然な記号や括弧書きを入れないでください。",
      "visualSpec には表情と図解を",
      '{ "expression": "neutral|thinking|surprised|confident", "diagram": "..." }',
      "の形で書いてください。expression を全シーン同じにしないでください。",
    ].join("\n"),
  structure: "キャラの問いかけ → 誤解の提示 → 訂正 → 具体例 → まとめ",

  buildPayload(context: ScriptPatternContext) {
    return {
      topic: context.idea.topic,
      angle: context.idea.angle,
      keywords: context.idea.keywords,
      sources: context.idea.sources,
      notes: context.idea.notes ?? "",
      voice_id: context.format.voice.voiceId,
    }
  },
}
