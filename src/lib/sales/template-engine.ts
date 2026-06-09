/**
 * lib/sales/template-engine.ts — 診断レポート生成エンジン
 *
 * 業種プロファイル + 課題プロファイル + DeepSeek を組み合わせ、
 * データドリブンで多様な診断文面を生成する。単一テンプレ依存を解消。
 *
 * 出力は 5 段階:
 *   1. Hook (業種別・衝撃の現実認識)
 *   2. Pain (課題別・ビジネス痛点・業界平均対比)
 *   3. Fear (未来予測・3-12 ヶ月後)
 *   4. Loss (損失試算・¥単位)
 *   5. CTA (解決アクション・費用感含む)
 */

import { callDeepSeek, cacheHitRatio } from "@/lib/deepseek"
import { getIndustryProfile, pickStructuralChallenges, type IndustryCode, type IndustryProfile } from "./industry-profiles"
import { getIssueProfile, type IssueCode, type IssueProfile } from "./issue-profiles"
import type { Severity } from "./types"

export interface TemplateEngineInput {
  industry: IndustryCode
  issueCode: IssueCode
  companyName: string
  domain: string
  prefecture?: string | null
  pagespeedMobile?: number | null
  pagespeedDesktop?: number | null
  detectedIssues?: string[]
  locale: "ja" | "en"
  /** 既存のテンプレ文言（DB にあれば参考入力として使う） */
  existingTemplate?: {
    headline?: string | null
    painBody?: string | null
    fearBody?: string | null
    hopeBody?: string | null
    lossCalculation?: string | null
    ctaText?: string | null
  } | null
}

export interface GeneratedDiagnosticContent {
  hook: string
  act1Pain: {
    headline: string
    body: string
    metricLabel: string
    metricValue: string
    metricUnit: string
    severity: Severity
  }
  act2Fear: {
    headline: string
    body: string
    metricLabel: string
    metricValue: string
    metricUnit: string
    severity: Severity
  }
  act3Hope: {
    headline: string
    body: string
    ctaText: string
    metricLabel: string
    metricValue: string
    metricUnit: string
    severity: Severity
  }
  totalLoss: string
  generatedBy: "profile" | "deepseek" | "fallback"
}

const SYSTEM_PROMPT_JA = `あなたは Paradigm 合同会社の Web 診断レポートを生成する AI です。
以下の構造化データをもとに、一貫した説得ストーリーを書いてください。

# 文体
- ですます調・冷静で誠実
- 「御社」を主語
- データの羅列禁止。具体値を文中に自然に織り込む
- 1 段落 3-4 文以内

# 出力 JSON 形式
{
  "hook": "1-2文・35-50字・業種特性を踏まえた現実認識",
  "pain": { "headline": "課題ラベル (5-8字)", "body": "3-4文・150-200字・具体値+業界平均対比" },
  "fear": { "headline": "リスクラベル (5-8字)", "body": "3-4文・150-200字・3-12ヶ月後予測" },
  "loss": { "headline": "損失ラベル (5-8字)", "body": "2-3文・100-150字・¥単位の数値根拠" },
  "cta": { "headline": "改善ラベル (5-8字)", "body": "1-2文・60-80字・費用 ¥X 万円〜含む" }
}`

const SYSTEM_PROMPT_EN = `You are a diagnostic report AI for Paradigm LLC. Write a coherent persuasive narrative from the structured data below.

# Tone
- Professional, calm, evidence-based
- Use the company name directly
- No data dumping. Weave specific numbers naturally into sentences
- 3-4 sentences per paragraph max

# Output JSON format
{
  "hook": "1-2 sentences, 15-25 words, industry-specific reality check",
  "pain": { "headline": "5-8 words issue label", "body": "3-4 sentences, 80-120 words, concrete numbers + benchmark comparison" },
  "fear": { "headline": "5-8 words risk label", "body": "3-4 sentences, 80-120 words, 3-12 month deterioration forecast" },
  "loss": { "headline": "5-8 words loss label", "body": "2-3 sentences, 60-90 words, financial impact with numbers" },
  "cta": { "headline": "5-8 words action label", "body": "1-2 sentences, 25-40 words, starting cost included" }
}`

function buildUserPrompt(input: TemplateEngineInput, industry: IndustryProfile, issue: IssueProfile): string {
  const benchmark = issue.industryBenchmark[input.industry]
  const challenges = pickStructuralChallenges(industry, 2, input.locale)
  const impacts = issue.businessImpact[input.locale]
  const forecast = issue.deteriorationForecast[input.locale]

  return input.locale === "ja"
    ? `# 対象企業
- 企業名: ${input.companyName}
- ドメイン: ${input.domain}
- 業種: ${industry.labelJa}（客単価 ¥${industry.avgTicketYen.toLocaleString()}）
${input.prefecture ? `- 所在: ${input.prefecture}` : ""}

# 業種背景
${challenges.map((c) => `- ${c}`).join("\n")}

# 検出課題: ${issue.labelJa}
- 技術説明: ${issue.technicalExplanation.ja}
- 現在値: ${benchmark ? `${benchmark.value}（${benchmark.interpretation}）` : "未測定"}
${input.pagespeedMobile != null ? `- PSI モバイル: ${input.pagespeedMobile}/100` : ""}
${input.pagespeedDesktop != null ? `- PSI デスクトップ: ${input.pagespeedDesktop}/100` : ""}
- 改善難易度: ${issue.fixDifficulty}/10（概算 ${issue.fixEffortHours} 時間）

# ビジネスインパクト
${impacts.map((i) => `- ${i}`).join("\n")}

# 将来予測
- 3 ヶ月後: ${forecast.months3}
- 6 ヶ月後: ${forecast.months6}
- 12 ヶ月後: ${forecast.months12}

# 損失試算コンテキスト
${industry.lossContext.ja}

# 参考テンプレ（あれば）
${input.existingTemplate?.headline ? `- 見出し案: ${input.existingTemplate.headline}` : ""}
${input.existingTemplate?.painBody ? `- Pain 文面案: ${input.existingTemplate.painBody}` : ""}

上記データをもとに JSON を返してください。`
    : `# Target Company
- Name: ${input.companyName}
- Domain: ${input.domain}
- Industry: ${industry.labelEn} (avg ticket ¥${industry.avgTicketYen.toLocaleString()})
${input.prefecture ? `- Location: ${input.prefecture}` : ""}

# Industry Context
${challenges.map((c) => `- ${c}`).join("\n")}

# Detected Issue: ${issue.labelEn}
- Technical: ${issue.technicalExplanation.en}
- Current: ${benchmark ? `${benchmark.value} (${benchmark.interpretation})` : "not measured"}
${input.pagespeedMobile != null ? `- PSI Mobile: ${input.pagespeedMobile}/100` : ""}
${input.pagespeedDesktop != null ? `- PSI Desktop: ${input.pagespeedDesktop}/100` : ""}
- Fix difficulty: ${issue.fixDifficulty}/10 (est. ${issue.fixEffortHours} hours)

# Business Impact
${impacts.map((i) => `- ${i}`).join("\n")}

# Deterioration Forecast
- 3 months: ${forecast.months3}
- 6 months: ${forecast.months6}
- 12 months: ${forecast.months12}

# Loss Calculation Context
${industry.lossContext.en}

# Reference Template (if any)
${input.existingTemplate?.headline ? `- Headline: ${input.existingTemplate.headline}` : ""}
${input.existingTemplate?.painBody ? `- Pain body: ${input.existingTemplate.painBody}` : ""}

Return JSON only.`
}

function computeDefaultLoss(industry: IndustryProfile, issue: IssueProfile, pagespeedMobile: number | null | undefined): string {
  const webRevenue = industry.avgTicketYen * industry.monthlyVisitors * industry.webDependencyRatio
  const speedPenalty = pagespeedMobile != null && pagespeedMobile < 50 ? 0.35 : 0.20
  const monthlyLoss = Math.round(webRevenue * speedPenalty)

  if (issue.code === "speed_critical") {
    return `毎月の機会損失: 約 ¥${(monthlyLoss / 10000).toFixed(0)} 万円（月間Web経由機会 ¥${(webRevenue / 10000).toFixed(0)} 万円 × 表示速度による離脱率 ${Math.round(speedPenalty * 100)}%）`
  }
  if (issue.code === "ssl_expired") {
    return `毎月の信用毀損: 約 ¥${(monthlyLoss / 10000).toFixed(0)} 万円（SSL未対応による離脱率 84% × 月間Web経由機会 ¥${(webRevenue / 10000).toFixed(0)} 万円）`
  }
  if (issue.code === "wp_outdated") {
    return `年間の潜在的損失: 約 ¥${(monthlyLoss / 10000 * 12).toFixed(0)} 万円（改ざん被害時の復旧費用 ¥50-100 万円 + SEOペナルティによる機会損失）`
  }
  return `毎月の機会損失: 約 ¥${(monthlyLoss / 10000).toFixed(0)} 万円（${issue.labelJa}によるWeb集客力低下）`
}

interface DeepSeekGeneratedContent {
  hook: string
  pain: { headline: string; body: string }
  fear: { headline: string; body: string }
  loss: { headline: string; body: string }
  cta: { headline: string; body: string }
}

function mapDeepSeekToOutput(parsed: DeepSeekGeneratedContent, issue: IssueProfile): GeneratedDiagnosticContent {
  return {
    hook: parsed.hook,
    act1Pain: {
      headline: parsed.pain.headline,
      body: parsed.pain.body,
      metricLabel: issue.metricLabelJa,
      metricValue: String(issue.industryBenchmark[Object.keys(issue.industryBenchmark)[0] as IndustryCode]?.value ?? "?"),
      metricUnit: issue.metricUnit,
      severity: issue.severity,
    },
    act2Fear: {
      headline: parsed.fear.headline,
      body: parsed.fear.body,
      metricLabel: issue.severity === "critical" ? "緊急度" : "リスク度",
      metricValue: issue.severity === "critical" ? "高" : issue.severity === "warning" ? "中" : "注意",
      metricUnit: "",
      severity: issue.severity,
    },
    act3Hope: {
      headline: parsed.cta.headline,
      body: parsed.cta.body,
      ctaText: parsed.cta.body,
      metricLabel: "改善所要時間",
      metricValue: `${issue.fixEffortHours}`,
      metricUnit: "時間",
      severity: "info",
    },
    totalLoss: parsed.loss.body,
    generatedBy: "deepseek",
  }
}

function buildProfileFallbackContent(industry: IndustryProfile, issue: IssueProfile, input: TemplateEngineInput): GeneratedDiagnosticContent {
  const lang = input.locale
  const benchmark = issue.industryBenchmark[input.industry]
  const challenges = pickStructuralChallenges(industry, 1, lang)
  const impacts = issue.businessImpact[lang]
  const forecast = issue.deteriorationForecast[lang]

  const hook = lang === "ja"
    ? `${industry.labelJa}の${issue.labelJa}に関する診断です。${challenges[0] ?? ""}`
    : `Diagnostic for ${industry.labelEn}: ${issue.labelEn}. ${challenges[0] ?? ""}`

  const painBody = lang === "ja"
    ? `${impacts[0] ?? ""}\n\n業界平均: ${benchmark?.value ?? "?"}${issue.metricUnit}。${benchmark?.interpretation ?? ""}\n\n改善難易度: ${issue.fixDifficulty}/10。所要時間の目安: ${issue.fixEffortHours} 時間。`
    : `${impacts[0] ?? ""}\n\nIndustry benchmark: ${benchmark?.value ?? "?"}${issue.metricUnit}. ${benchmark?.interpretation ?? ""}\n\nFix difficulty: ${issue.fixDifficulty}/10. Estimated effort: ${issue.fixEffortHours} hours.`

  const fearBody = lang === "ja"
    ? `このまま対策を取らない場合、以下のリスクが現実化します:\n\n• 3 ヶ月後: ${forecast.months3}\n• 6 ヶ月後: ${forecast.months6}\n• 12 ヶ月後: ${forecast.months12}`
    : `Without intervention, the following risks will materialize:\n\n• 3 months: ${forecast.months3}\n• 6 months: ${forecast.months6}\n• 12 months: ${forecast.months12}`

  const loss = computeDefaultLoss(industry, issue, input.pagespeedMobile)

  const ctaBody = lang === "ja"
    ? `Paradigm では、${issue.labelJa}の改善を含む Web サイト総合診断と改善提案を ¥15 万円〜承っています。まずは無料診断レポートの詳細をご確認ください。`
    : `Paradigm offers comprehensive web diagnostics including ${issue.labelEn} improvement starting from ¥150,000. Review the full diagnostic report for a tailored action plan.`

  return {
    hook,
    act1Pain: {
      headline: issue.labelJa,
      body: painBody,
      metricLabel: issue.metricLabelJa,
      metricValue: String(benchmark?.value ?? "?"),
      metricUnit: issue.metricUnit,
      severity: issue.severity,
    },
    act2Fear: {
      headline: lang === "ja" ? "将来予測" : "Future Forecast",
      body: fearBody,
      metricLabel: lang === "ja" ? "リスク度" : "Risk Level",
      metricValue: issue.severity === "critical" ? "高" : issue.severity === "warning" ? "中" : "低",
      metricUnit: "",
      severity: issue.severity,
    },
    act3Hope: {
      headline: lang === "ja" ? "改善アクション" : "Recommended Action",
      body: ctaBody,
      ctaText: ctaBody,
      metricLabel: lang === "ja" ? "改善所要時間" : "Est. Effort",
      metricValue: `${issue.fixEffortHours}`,
      metricUnit: "hrs",
      severity: "info",
    },
    totalLoss: loss,
    generatedBy: "profile",
  }
}

/**
 * 業種×課題の組み合わせから、診断レポートの文面を生成する。
 *
 * 1. DeepSeek が利用可能かつ Dify が未設定なら DeepSeek で生成
 * 2. DeepSeek が失敗したらプロファイルからフォールバック生成
 * 3. どちらも使えなければ最小限の fallback
 */
export async function generateDiagnosticContent(
  input: TemplateEngineInput,
): Promise<GeneratedDiagnosticContent> {
  const industry = getIndustryProfile(input.industry)
  const issue = getIssueProfile(input.issueCode)

  if (!industry || !issue) {
    return buildMinimalFallback(input)
  }

  // DeepSeek が利用可能なら AI 生成を試行
  try {
    const systemPrompt = input.locale === "ja" ? SYSTEM_PROMPT_JA : SYSTEM_PROMPT_EN
    const userPrompt = buildUserPrompt(input, industry, issue)
    const res = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.6, maxTokens: 1200, responseFormat: "json_object" },
    )
    if (res.ok && res.text) {
      const parsed = JSON.parse(res.text) as DeepSeekGeneratedContent
      if (parsed.hook && parsed.pain && parsed.fear && parsed.loss && parsed.cta) {
        return mapDeepSeekToOutput(parsed, issue)
      }
    }
  } catch (e) {
    console.warn("[template-engine] AI generation failed, falling back to profile:", e)
  }

  return buildProfileFallbackContent(industry, issue, input)
}

function buildMinimalFallback(input: TemplateEngineInput): GeneratedDiagnosticContent {
  return {
    hook: input.locale === "ja"
      ? `${input.companyName} の Web サイト診断`
      : `Website Diagnostic for ${input.companyName}`,
    act1Pain: {
      headline: input.locale === "ja" ? "診断結果" : "Findings",
      body: input.locale === "ja"
        ? "現在、詳細な診断データを収集中です。しばらくしてから再度ご確認ください。"
        : "Detailed diagnostic data is being collected. Please check back shortly.",
      metricLabel: "",
      metricValue: "",
      metricUnit: "",
      severity: "info",
    },
    act2Fear: {
      headline: input.locale === "ja" ? "リスク" : "Risk",
      body: input.locale === "ja"
        ? "診断データの収集が完了次第、リスク評価を表示します。"
        : "Risk assessment will be displayed once diagnostic data collection is complete.",
      metricLabel: "",
      metricValue: "",
      metricUnit: "",
      severity: "info",
    },
    act3Hope: {
      headline: input.locale === "ja" ? "推奨アクション" : "Recommendation",
      body: input.locale === "ja"
        ? "Paradigm の Web 診断サービスについて詳しくはお問い合わせください。"
        : "Contact Paradigm to learn more about our web diagnostic services.",
      ctaText: "",
      metricLabel: "",
      metricValue: "",
      metricUnit: "",
      severity: "info",
    },
    totalLoss: "",
    generatedBy: "fallback",
  }
}
