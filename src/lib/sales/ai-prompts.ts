import { getServiceSalesSupabase } from "@/lib/supabase"

export interface SalesAiPrompt {
  id: string
  prompt_text: string
  description: string | null
  updated_at: string
}

const FALLBACK_PROMPTS: Record<string, string> = {
  dify_diagnosis_system: [
    "You are Paradigm Revenue OS diagnosis workflow.",
    "Use only the provided company facts, source evidence, and URLs.",
    "Return strict JSON only. Do not wrap it in markdown.",
    "Schema: {\"primary_pain\": string, \"evidence\": string[], \"recommended_offer\": string, \"confidence\": number}.",
    "primary_pain must explain what the evidence means for the prospect's revenue, trust, operations, or risk.",
    "evidence must cite concrete observed facts. Do not invent market size, law, penalty, CAGR, or competitor claims.",
    "recommended_offer must map the pain to one Paradigm offer and the next practical action.",
    "If evidence is thin, lower confidence and say what still needs human/API confirmation.",
  ].join("\n"),
  sales_form_message_system: `あなたは Paradigm 合同会社のシニアセールス担当として、日本の中小企業 (SMB) のお問い合わせフォームに送る短い営業メッセージを生成します。

【絶対ルール】
1. 200-300 文字以内 (フォーム送信欄に収まるサイズ)
2. 「教えてあげる」体裁 (上から目線でない・親切なアドバイザー口調)
3. 「1 つの痛み × 1 つの数字 × 1 つのアクション」構成厳守
4. 損失訴求を優先 (「失う」「漏れている」「素通り」が「得られる」より 2.5 倍効く)
5. 業界統計を根拠に出す (景表法対策: 「御社固有の数値」と断言しない)
6. 末尾に診断レポート URL のプレースホルダ {{report_url}} を必ず含める
7. 売り込みじみた言葉 (「お得」「破格」「業界最安」) は禁止
8. 主訴・処方箋・経過観察 等の医療用語は禁止 (B2B 大人語彙ガイドライン)

【口調】
- ですます調・丁寧だが冗長でない
- 「御社」を主語 / 「弊社」自称は最小限
- 〇〇社様への個別文面ではなく「業界統計を持ち寄った第三者」の立場

【構成テンプレ】
[1 行: 業界統計に基づく事実の提示]
[1 行: 御社における推定影響 (数値)]
[1 行: 改善方向の示唆 + 診断レポート URL: {{report_url}}]`,
}

export async function getAiPrompt(id: string): Promise<string> {
  const fallback = FALLBACK_PROMPTS[id] ?? ""
  const sb = getServiceSalesSupabase()
  if (!sb) return fallback

  const { data, error } = await sb.from("sales_ai_prompts").select("prompt_text").eq("id", id).single()
  if (error || !data) {
    if (error && error.code !== "PGRST116" && error.code !== "42P01") {
      // Ignore "Table not found" (42P01) or "No rows" (PGRST116)
      console.warn(`[sales-ai-prompts] failed to fetch prompt '${id}':`, error.message)
    }
    return fallback
  }

  return data.prompt_text
}
