#!/usr/bin/env node
/**
 * generate-templates-bulk.mjs — Sprint 11
 *
 * 役割: 8 業種 × 7 課題 = 56 templates を DeepSeek V4 PRO で生成し、
 *       Supabase sales_templates に upsert (Notion は別途 sync で投入).
 *
 * 入力:
 *   DEEPSEEK_API_KEY (必須)
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (必須)
 *
 * Context Cache 最大化のため system prompt 冒頭固定・user prompt のみ変化.
 * 56 件 × Context cache hit で実コスト ~$0.50 想定.
 */

import { readFileSync } from "node:fs"

const INDUSTRIES = [
  { code: "beauty_salon", label: "美容室", customer: "予約検討中のお客様" },
  { code: "dental", label: "歯科医院", customer: "歯科を探している患者" },
  { code: "restaurant", label: "飲食店", customer: "店舗を探している来店検討者" },
  { code: "construction", label: "建設業", customer: "施工事例を探している施主" },
  { code: "accounting", label: "会計事務所", customer: "顧問先を探している経営者" },
  { code: "retail", label: "小売店", customer: "オンライン購買意欲のある顧客" },
  { code: "cleaning", label: "清掃業", customer: "見積もり依頼を検討している顧客" },
  { code: "consulting", label: "コンサル", customer: "専門性で選ぶ問い合わせ検討者" },
]

const ISSUES = [
  { code: "speed_critical", label: "ページ速度致命的", severity: "critical" },
  { code: "ua_残存", label: "アナリティクス UA 残存", severity: "critical" },
  { code: "ssl_expired", label: "SSL 期限切れ・脆弱", severity: "critical" },
  { code: "wp_outdated", label: "WordPress 旧バージョン", severity: "warning" },
  { code: "no_ogp", label: "OGP 未設定", severity: "warning" },
  { code: "no_sns", label: "SNS 連携なし", severity: "warning" },
  { code: "copyright_old", label: "コピーライト古い", severity: "info" },
]

const SYSTEM_PROMPT = `あなたは Paradigm 合同会社の診断レポート用テンプレ生成エディタです。
業種と課題コードを受け取って、JSON 形式で 5 つのテキストフィールド (headline / pain / fear / loss / cta_text) を生成します。

【制約】
1. ですます調・冷静で誠実な口調 (煽らない)
2. 業界統計を根拠に出す (景表法対策・「業界平均」「○○の調査」)
3. 御社固有の数値と断言しない (景表法リスク回避)
4. 売り込み言葉禁止 (「お得」「破格」「業界最安」)
5. 主訴・処方箋・経過観察 等の医療用語は禁止 (B2B 大人語彙)
6. headline = 15-30 字 (見出し)
7. pain = 60-100 字 (事実の提示)
8. fear = 60-100 字 (損失の具体化)
9. loss = 30-60 字 (推定金額 ¥XX,000 / 月)
10. cta_text = 12-25 字 (アクション)

【出力】
JSON 厳守:
{
  "headline": "...",
  "pain": "...",
  "fear": "...",
  "loss": "¥XX,000 / 月の機会損失 (...)",
  "cta_text": "..."
}`

const DEEPSEEK_API = "https://api.deepseek.com/v1/chat/completions"
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? ""

if (!DEEPSEEK_KEY) {
  console.error("❌ DEEPSEEK_API_KEY not set. Aborting.")
  process.exit(1)
}
if (!SUPABASE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY not set. Aborting.")
  process.exit(1)
}

async function generateOne(industry, issue) {
  const userPrompt = `業種: ${industry.label} (${industry.code})・想定顧客: ${industry.customer}
課題コード: ${issue.code} (${issue.label})・重要度: ${issue.severity}

上記の業種×課題に合わせた診断レポート 1 Act 分の文言を JSON で生成してください。`

  const res = await fetch(DEEPSEEK_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-v4-pro", // 永久ルール
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 1500,
    }),
  })
  if (!res.ok) {
    throw new Error(`DeepSeek ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content ?? ""
  return JSON.parse(text)
}

async function supabaseUpsert(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/sales_templates?on_conflict=industry,issue_code`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  }
}

async function main() {
  const total = INDUSTRIES.length * ISSUES.length
  let done = 0
  const batch = []

  for (const industry of INDUSTRIES) {
    for (const issue of ISSUES) {
      done++
      const prefix = `[${String(done).padStart(2, "0")}/${total}] ${industry.code} × ${issue.code}`
      try {
        const json = await generateOne(industry, issue)
        batch.push({
          template_name: `${industry.label} × ${issue.label}`,
          industry: industry.code,
          issue_code: issue.code,
          severity: issue.severity,
          headline: json.headline,
          pain: json.pain,
          fear: json.fear,
          loss: json.loss,
          cta_text: json.cta_text,
          is_active: true,
          last_synced: new Date().toISOString(),
        })
        console.log(`${prefix} ✅`)
      } catch (e) {
        console.error(`${prefix} ❌ ${e.message}`)
      }
      // 8 件毎に Supabase に flush (rate limit & atomicity)
      if (batch.length >= 8) {
        await supabaseUpsert(batch)
        console.log(`  → Supabase upsert ${batch.length} rows`)
        batch.length = 0
      }
    }
  }
  if (batch.length > 0) {
    await supabaseUpsert(batch)
    console.log(`  → Supabase upsert ${batch.length} rows (final)`)
  }
  console.log(`\n✅ Done. ${total} templates generated.`)
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})
