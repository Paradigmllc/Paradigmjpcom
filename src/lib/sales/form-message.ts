/**
 * lib/sales/form-message.ts — 営業フォームメッセージ生成 (Sprint 10-A)
 *
 * 役割: sales_companies (リード) と sales_templates (業種×課題) を組み合わせ、
 *       DeepSeek V3 で「教えてあげる体裁」のフォーム送信文面を生成。
 *
 * 戦略原典:
 *   - グローバル CLAUDE.md s11.5 SALES-CENTER: Stage 1 = フォーム営業ドリブン
 *   - Notion 営業MVP壁打ち②: 「1 つの痛み × 1 つの数字 × 1 つのアクション」が CVR 最大
 *   - 心理設計: 損失訴求 > 欲望訴求 (プロスペクト理論 2.5x)
 *
 * 出力: 1 文面 = 200-300 文字程度 (フォーム入力欄に収まるサイズ)
 */

import { callDeepSeek, type DeepSeekResponse } from "@/lib/deepseek"
import { findCompanyById } from "./companies"
import { matchTemplate } from "./templates"
import type { Industry, IssueCode, SalesCompany } from "./types"

/* ───── 固定 System Prompt (Context Cache 最大化のため毎回同じ) ───── */

const SALES_SYSTEM_PROMPT = `あなたは Paradigm 合同会社のシニアセールス担当として、日本の中小企業 (SMB) のお問い合わせフォームに送る短い営業メッセージを生成します。

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
[1 行: 改善方向の示唆 + 診断レポート URL: {{report_url}}]`

/* ───── User Prompt builder ───── */

function buildUserPrompt(input: {
  company: SalesCompany
  industry: Industry
  issueCode: IssueCode
  templateHeadline: string | null
  templatePain: string | null
  templateLoss: string | null
}): string {
  const { company, industry, issueCode, templateHeadline, templatePain, templateLoss } = input
  return `【対象企業】
会社名: ${company.company_name}
業種: ${industry}
ドメイン: ${company.domain}
${company.prefecture ? `所在: ${company.prefecture}` : ""}

【検出した最重要課題】
コード: ${issueCode}
${templateHeadline ? `見出し: ${templateHeadline}` : ""}
${templatePain ? `痛み: ${templatePain}` : ""}
${templateLoss ? `損失: ${templateLoss}` : ""}

【検出データ】
${company.pagespeed_mobile != null ? `モバイルスコア: ${company.pagespeed_mobile}点` : ""}
${company.pagespeed_desktop != null ? `PCスコア: ${company.pagespeed_desktop}点` : ""}

上記をもとに、200-300 文字のフォーム送信文面を 1 つ生成してください。
末尾に {{report_url}} プレースホルダを必ず含めること。`
}

/* ───── Public API ───── */

export interface GenerateFormMessageResult {
  ok: boolean
  message?: string
  used_template_id?: string | null
  usage?: DeepSeekResponse["usage"]
  error?: string
}

/**
 * companyId から 1 つフォームメッセージを生成して返す.
 *
 * 1. company を取得
 * 2. detected_issues[0] と industry でテンプレを matching
 * 3. DeepSeek にプロンプト投入 (system prompt 固定で cache hit 90%+)
 * 4. 結果テキストをそのまま返す (caller 側で {{report_url}} を実 URL に置換)
 */
export async function generateFormMessage(
  companyId: string,
): Promise<GenerateFormMessageResult> {
  const company = await findCompanyById(companyId)
  if (!company) return { ok: false, error: "company not found" }
  if (!company.industry) return { ok: false, error: "company.industry is null" }
  const firstIssue = (company.detected_issues ?? [])[0]
  if (!firstIssue) return { ok: false, error: "company has no detected_issues" }

  // テンプレ取得 (なければ null pain/loss でも DeepSeek に投げる)
  const template = await matchTemplate(company.industry, firstIssue)

  const userPrompt = buildUserPrompt({
    company,
    industry: company.industry,
    issueCode: firstIssue,
    templateHeadline: template?.headline ?? null,
    templatePain: template?.pain ?? null,
    templateLoss: template?.loss ?? null,
  })

  const res = await callDeepSeek(
    [
      { role: "system", content: SALES_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.5, maxTokens: 500 },
  )

  if (!res.ok || !res.text) {
    return { ok: false, error: res.error ?? "DeepSeek empty response" }
  }

  return {
    ok: true,
    message: res.text.trim(),
    used_template_id: template?.id ?? null,
    usage: res.usage,
  }
}

/**
 * 生成済みメッセージの {{report_url}} を実 URL に置換するヘルパ.
 * n8n が送信直前に置換するために使う.
 */
export function fillReportUrl(message: string, reportUrl: string): string {
  return message.replaceAll("{{report_url}}", reportUrl)
}
