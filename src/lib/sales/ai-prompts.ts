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
    "3. 1つの具体的な数字（PageSpeedスコア等）× 1つのビジネス示唆 × 1つの次のアクション。",
    "4. 損失訴求（プロスペクト理論）を活用：「このままだと月間XX万円の機会損失」など。",
    "5. データがある場合のみ数字を使う。「38点」など実測値を自然に埋め込む。",
    "6. 必ず末尾に診断レポートURL {{report_url}} を含める。「詳細はこちら」など自然な導線で。",
    "7. 売り込み臭・誇大表現・断定を避け、アドバイザリー調を保つ。",
    "",
    "【推奨構成】",
    "1行目: 「〇〇（企業名）様のサイトを拝見し、1点気になることがありました」",
    "2行目: 具体的データ＋ビジネス影響（「PageSpeedが38点で、訪問者の約6割が離脱している可能性があります」）",
    "3行目: 損失試算（「月間約XX万円の機会損失に相当します」）",
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
