import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

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
    "あなたは Paradigm 合同会社のシニアセールス担当です。診断データに基づき、中小企業経営者向け問い合わせフォームに送る営業メッセージを作成します。",
    "",
    "【目的】経営者が「自分の会社の話だ」と感じ、診断レポートをクリックしたくなる文面を作る。",
    "",
    "【絶対ルール】",
    "1. 200-300字以内。フォーム送信欄に収まる長さ。",
    "2. 上から目線禁止。「教えてあげる」ではなく「共有したい発見があります」のスタンス。",
    "3. 検証済みメトリクスから1つの具体的な数字 × 1つの観測事実 × 1つの次のアクション。",
    "4. 損失や売上を推測しない。conversion rate、離脱率、Revenue Leak、機会損失額は、入力に明示された一次/APIデータがある場合だけ使う。",
    "5. 入力のverified_metricsにある数字だけを使い、sourceとconfidenceを尊重する。unknownの項目は本文で断定しない。",
    "6. 必ず末尾に診断レポートURL {{report_url}} を含める。「詳細はこちら」など自然な導線で。",
    "7. 売り込み臭・誇大表現・断定を避け、アドバイザリー調を保つ。",
    "",
    "【推奨構成】",
    "1行目: 「〇〇（企業名）様のサイトを拝見し、1点気になることがありました」",
    "2行目: 具体的な検証済みデータ＋観測されたビジネス上の不足",
    "3行目: 金額や離脱率は、入力に検証済みデータがある場合のみ記載。なければ『測定していない』と明示するか省略する。",
    "4行目: CTA（「診断レポートの内容とJapan Entryの適合性を確認します {{report_url}}」）",
    "",
    "【禁止ワード】「驚くべき」「業界No.1」「絶対」「必ず」「今すぐ契約を」",
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

  const { data, error } = await sb.from(DB_TABLES.SALES_AI_PROMPTS).select("prompt_text").eq("id", id).single()
  if (error || !data) {
    if (error && error.code !== "PGRST116" && error.code !== "42P01" && error.code !== "PGRST205") {
      console.warn(`[sales-ai-prompts] failed to fetch prompt '${id}':`, error.message)
    }
    return fallback
  }

  return data.prompt_text
}
