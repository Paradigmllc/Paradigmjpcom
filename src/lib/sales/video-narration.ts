import { callDeepSeek } from "@/lib/deepseek"
import type { DiagnosticReportData } from "./diagnostic"

const CORRUPT_TEXT = /縺|繝|譁|蜑|荳|譛|谿|險|螟|豕|邨|髻|蠕|蝠|逕|莠|陦|蛻|諡|蜷|繧|�/

const NARRATION_SYSTEM_PROMPT = `You are Paradigm's executive sales video director.

Create a concise 60-second diagnostic sales video narration.
Rules:
- Use only provided report evidence. Never invent unavailable data.
- Tone is calm, executive, specific, and helpful.
- Structure: hook, pain, fear, hope, cta.
- Each field must be one sentence.
- Return JSON only:
{
  "hook": "...",
  "pain": "...",
  "fear": "...",
  "hope": "...",
  "cta": "..."
}`

export interface NarrationScript {
  hook: string
  pain: string
  fear: string
  hope: string
  cta: string
}

function cleanText(value: string | null | undefined, fallback: string, max = 150): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim()
  if (!text || CORRUPT_TEXT.test(text)) return fallback
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

export function fallbackScript(data: DiagnosticReportData): NarrationScript {
  const isJa = data.report_locale === "ja"
  const safeCompanyName = cleanText(data.company_name, isJa ? "対象企業" : "the target company", 60)
  if (isJa) {
    return {
      hook: cleanText(
        data.hook,
        `${safeCompanyName}の公開データから、改善優先度と機会損失の仮説を60秒で整理します。`,
      ),
      pain: cleanText(
        data.acts[0]?.body,
        "検索、SNS、フォーム、表示速度などの公開シグナルから、比較検討中の顧客が迷いやすい箇所を特定しました。",
      ),
      fear: cleanText(
        data.acts[1]?.body,
        "このまま放置すると、小さな摩擦が毎月の機会損失として見えないまま積み上がります。",
      ),
      hope: `推定機会損失 ${data.total_loss} の一部は、信頼材料と問い合わせ導線を整えることで回収できる可能性があります。`,
      cta: `${safeCompanyName}向けの診断レポートと改善デモを見ながら、次に直すべき優先順位を確認しましょう。`,
    }
  }

  return {
    hook: cleanText(
      data.hook,
      `This brief turns public data for ${safeCompanyName} into a practical opportunity-loss view.`,
    ),
    pain: cleanText(
      data.acts[0]?.body,
      "Search, social, form, and stack signals show where comparison-stage buyers may hesitate.",
    ),
    fear: cleanText(
      data.acts[1]?.body,
      "If this remains unchanged, the opportunity loss keeps compounding quietly.",
    ),
    hope: `Part of the estimated ${data.total_loss} opportunity loss may be recoverable through clearer proof and a shorter CTA path.`,
    cta: "Review the diagnostic report and replacement demo to decide the next priorities in a short call.",
  }
}

function isNarrationScript(value: unknown): value is NarrationScript {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return ["hook", "pain", "fear", "hope", "cta"].every((key) => typeof record[key] === "string")
}

export async function generateNarrationScript(
  data: DiagnosticReportData,
): Promise<{ ok: boolean; script?: NarrationScript; error?: string }> {
  const userPrompt = JSON.stringify(
    {
      company: data.company_name,
      locale: data.report_locale,
      industry: data.industry,
      hook: data.hook,
      total_loss: data.total_loss,
      report_url: data.report_url,
      demo_url: data.demo_url,
      source_coverage: data.source_coverage.score,
      acts: data.acts.map((act) => ({
        headline: act.headline,
        body: act.body,
        metric: `${act.metric_label}: ${act.metric_value}${act.metric_unit}`,
        benchmark: act.metric_bench,
        severity: act.severity,
      })),
    },
    null,
    2,
  )

  const res = await callDeepSeek(
    [
      { role: "system", content: NARRATION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.35, maxTokens: 900, responseFormat: "json_object" },
  )

  if (!res.ok || !res.text) {
    return { ok: true, script: fallbackScript(data), error: res.error ?? "DeepSeek empty response; fallback used" }
  }

  try {
    const parsed = JSON.parse(res.text) as unknown
    if (!isNarrationScript(parsed)) {
      return { ok: true, script: fallbackScript(data), error: "Incomplete narration JSON shape; fallback used" }
    }
    return { ok: true, script: parsed }
  } catch (error) {
    return {
      ok: true,
      script: fallbackScript(data),
      error: `JSON parse failed; fallback used: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}
