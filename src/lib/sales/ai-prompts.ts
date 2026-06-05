import { getServiceSalesSupabase } from "@/lib/supabase"

export interface SalesAiPrompt {
  id: string
  prompt_text: string
  description: string | null
  updated_at: string
}

export const DEFAULT_AI_PROMPT_IDS = ["dify_diagnosis_system", "sales_form_message_system"] as const

const FALLBACK_PROMPTS: Record<(typeof DEFAULT_AI_PROMPT_IDS)[number], string> = {
  dify_diagnosis_system: [
    "You are Paradigm Revenue OS diagnosis workflow.",
    "Use only the provided company facts, source evidence, and URLs.",
    "Return strict JSON only. Do not wrap it in markdown.",
    'Schema: {"primary_pain": string, "evidence": string[], "recommended_offer": string, "confidence": number}.',
    "primary_pain must explain what the evidence means for the prospect's revenue, trust, operations, or risk.",
    "evidence must cite concrete observed facts. Do not invent market size, law, penalty, CAGR, or competitor claims.",
    "recommended_offer must map the pain to one Paradigm offer and the next practical action.",
    "If evidence is thin, lower confidence and say what still needs human/API confirmation.",
  ].join("\n"),
  sales_form_message_system: [
    "あなたは Paradigm 合同会社のシニアセールス担当として、日本の中小企業向け問い合わせフォームに送る短い営業メッセージを作成します。",
    "",
    "絶対ルール:",
    "1. 200-300字以内で、問い合わせフォーム送信欄に収まる長さにする。",
    "2. 上から目線ではなく、丁寧で親身なアドバイザー口調にする。",
    "3. 1つの課題、1つの根拠、1つの次アクションに絞る。",
    "4. 断定的な失敗訴求や恐怖訴求を避ける。",
    "5. 業界統計や第三者データを根拠にする場合は、未確認の固有数値として断定しない。",
    "6. 末尾に診断レポートURLのプレースホルダー {{report_url}} を必ず含める。",
    "7. 売り込み臭の強い表現や、誇大広告的な表現は禁止する。",
    "8. 医療、法務、税務などの専門助言に見える断定は禁止する。",
    "",
    "推奨構成:",
    "[1行目: 業界統計または観測事実に基づく短い示唆]",
    "[1行目: 相手企業に起き得る営業・信頼・運用面の影響]",
    "[1行目: 改善の方向性と診断レポートURL: {{report_url}}]",
  ].join("\n"),
}

const FALLBACK_DESCRIPTIONS: Record<(typeof DEFAULT_AI_PROMPT_IDS)[number], string> = {
  dify_diagnosis_system:
    "Dify 企業診断ワークフローに渡す system prompt。提供済みの事実とURLだけで厳密なJSON診断を返すための指示です。",
  sales_form_message_system:
    "問い合わせフォーム送信用アウトバウンド文面を生成する system prompt。{{report_url}} プレースホルダーが必須です。",
}

export function getFallbackAiPromptRows(updatedAt = new Date().toISOString()): SalesAiPrompt[] {
  return DEFAULT_AI_PROMPT_IDS.map((id) => ({
    id,
    prompt_text: FALLBACK_PROMPTS[id],
    description: FALLBACK_DESCRIPTIONS[id],
    updated_at: updatedAt,
  }))
}

export async function getAiPrompt(id: string): Promise<string> {
  const fallback = Object.prototype.hasOwnProperty.call(FALLBACK_PROMPTS, id)
    ? FALLBACK_PROMPTS[id as (typeof DEFAULT_AI_PROMPT_IDS)[number]]
    : ""
  const sb = getServiceSalesSupabase()
  if (!sb) return fallback

  const { data, error } = await sb.from("sales_ai_prompts").select("prompt_text").eq("id", id).single()
  if (error || !data) {
    if (error && error.code !== "PGRST116" && error.code !== "42P01" && error.code !== "PGRST205") {
      console.warn(`[sales-ai-prompts] failed to fetch prompt '${id}':`, error.message)
    }
    return fallback
  }

  return data.prompt_text
}
