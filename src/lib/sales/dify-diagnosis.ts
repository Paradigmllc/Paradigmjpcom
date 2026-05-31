import { normalizeDifyCloudApiUrl, normalizeDifyCloudBaseUrl } from "./dify-cloud"
import type { SalesCompany } from "./types"

type JsonRecord = Record<string, unknown>

export interface DifyDiagnosisResult {
  ok: boolean
  configured: boolean
  summary: {
    primaryPain: string
    evidence: string[]
    recommendedOffer: string
    confidence: number
  }
  raw?: JsonRecord
  error?: string
}

function readOptionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

function localDiagnosis(company: SalesCompany): DifyDiagnosisResult["summary"] {
  const meta = company.meta ?? {}
  const scan = asRecord(meta.scan)
  const tech = asRecord(meta.tech)
  const place = asRecord(meta.place)
  const evidence: string[] = []

  if (typeof company.pagespeed_mobile === "number") {
    evidence.push(`モバイル表示速度スコア: ${company.pagespeed_mobile}/100`)
  }
  if (typeof company.pagespeed_desktop === "number") {
    evidence.push(`デスクトップ表示速度スコア: ${company.pagespeed_desktop}/100`)
  }
  const techCount = typeof tech?.count === "number" ? tech.count : null
  if (techCount !== null) evidence.push(`検出技術スタック: ${techCount}件`)
  if (typeof scan?.is_wordpress === "boolean" && scan.is_wordpress) {
    evidence.push("WordPress利用を検出")
  }
  if (asRecord(place)?.found === true) {
    evidence.push("Google Places情報を検出")
  }
  for (const issue of company.detected_issues ?? []) {
    evidence.push(`検出課題: ${issue}`)
  }

  const primaryPain =
    company.detected_issues?.includes("speed_critical")
      ? "表示速度の低下により、問い合わせ前の離脱が発生している可能性があります。"
      : company.detected_issues?.includes("no_ogp")
        ? "SNSやメッセージ共有時に、第一印象を作る情報が不足している可能性があります。"
        : company.detected_issues?.includes("wp_outdated")
          ? "CMSやプラグイン運用に改善余地があり、保守性と安全性の両面でリスクがあります。"
          : "Web上の信頼形成と問い合わせ導線に改善余地があります。"

  return {
    primaryPain,
    evidence: evidence.slice(0, 8),
    recommendedOffer: "Web診断レポートをもとに、優先度の高い改善から小さく着手する提案を行う。",
    confidence: evidence.length >= 3 ? 0.78 : 0.52,
  }
}

function normalizeDifySummary(raw: JsonRecord, fallback: DifyDiagnosisResult["summary"]): DifyDiagnosisResult["summary"] {
  const data = asRecord(raw.data) ?? raw
  const outputs = asRecord(data.outputs) ?? asRecord(raw.outputs) ?? {}
  const primaryPain =
    typeof outputs.primary_pain === "string"
      ? outputs.primary_pain
      : typeof outputs.primaryPain === "string"
        ? outputs.primaryPain
        : typeof outputs.summary === "string"
          ? outputs.summary
          : fallback.primaryPain
  const evidence = stringArray(outputs.evidence)
  const recommendedOffer =
    typeof outputs.recommended_offer === "string"
      ? outputs.recommended_offer
      : typeof outputs.recommendedOffer === "string"
        ? outputs.recommendedOffer
        : fallback.recommendedOffer
  const confidence =
    typeof outputs.confidence === "number" && Number.isFinite(outputs.confidence)
      ? Math.max(0, Math.min(1, outputs.confidence))
      : fallback.confidence

  return {
    primaryPain,
    evidence: evidence.length > 0 ? evidence : fallback.evidence,
    recommendedOffer,
    confidence,
  }
}

export async function runDifyDiagnosis(company: SalesCompany): Promise<DifyDiagnosisResult> {
  const fallback = localDiagnosis(company)
  const apiKey = readOptionalEnv("DIFY_DIAGNOSIS_API_KEY") ?? readOptionalEnv("DIFY_API_KEY")
  const baseUrl = normalizeDifyCloudBaseUrl(readOptionalEnv("DIFY_DIAGNOSIS_BASE_URL") ?? readOptionalEnv("DIFY_BASE_URL"))
  const endpoint = normalizeDifyCloudApiUrl(readOptionalEnv("DIFY_DIAGNOSIS_API_URL") ?? `${baseUrl}/v1/workflows/run`)

  if (!apiKey) {
    return { ok: true, configured: false, summary: fallback, error: "Dify diagnosis API key is not configured" }
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          company_id: company.id,
          company_name: company.company_name,
          domain: company.domain,
          industry: company.industry,
          region: company.region,
          pagespeed_mobile: company.pagespeed_mobile,
          pagespeed_desktop: company.pagespeed_desktop,
          detected_issues: company.detected_issues,
          enrichment_meta: company.meta,
        },
        response_mode: "blocking",
        user: `paradigm-sales-${company.id}`,
      }),
      signal: AbortSignal.timeout(60_000),
    })

    const rawText = await res.text()
    const raw = rawText ? (JSON.parse(rawText) as JsonRecord) : {}
    if (!res.ok) {
      console.error("[dify-diagnosis] request failed:", res.status, rawText.slice(0, 300))
      return { ok: false, configured: true, summary: fallback, raw, error: `Dify HTTP ${res.status}` }
    }

    return {
      ok: true,
      configured: true,
      summary: normalizeDifySummary(raw, fallback),
      raw,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("[dify-diagnosis] failed:", message)
    return { ok: false, configured: true, summary: fallback, error: message }
  }
}
