import {
  DIFY_DIAGNOSIS_WORKFLOW_KEY_ENV_NAMES,
  normalizeDifyCloudBaseUrl,
} from "./dify-cloud"
import { getAiPrompt } from "./ai-prompts"
import type { SalesCompany } from "./types"

type JsonRecord = Record<string, unknown>

export interface DifyDiagnosisResult {
  ok: boolean
  configured: boolean
  workflowEnvName?: string
  summary: {
    primaryPain: string
    evidence: string[]
    recommendedOffer: string
    confidence: number
  }
  raw?: JsonRecord
  error?: string
}

const FALLBACK_DIAGNOSIS = {
  primaryPain: "ウェブサイトの表示速度低下による直帰率の上昇",
  evidence: ["診断を実行できませんでした"],
  recommendedOffer: "改めて診断を実行してください。",
  confidence: 0,
}

function readOptionalEnv(name: string): string | null {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : null
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim()
  }
  return null
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
  if (typeof value === "string" && value.trim().length > 0) return [value.trim()]
  return []
}

function parseJsonObject(value: unknown): JsonRecord | null {
  if (asRecord(value)) return asRecord(value)
  if (typeof value !== "string") return null
  const stripped = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim()
  if (!stripped) return null
  try {
    return asRecord(JSON.parse(stripped))
  } catch (e) {
    console.warn("[dify-diagnosis] JSON parse failed:", e)
    return null
  }
}

function numberBetweenZeroAndOne(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback
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
      ? "表示速度の低下により、問い合わせ前の離脱や比較検討からの除外が発生している可能性があります。"
      : company.detected_issues?.includes("no_ogp")
        ? "SNSやメッセージ共有時に第一印象を作る情報が不足し、紹介や再訪の機会を逃している可能性があります。"
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

function compactMeta(meta: unknown): JsonRecord {
  const record = asRecord(meta) ?? {}
  return {
    scan: record.scan ?? null,
    tech: record.tech ?? null,
    place: record.place ?? null,
    form_discovery: record.form_discovery ?? null,
    contact_form_url: record.contact_form_url ?? null,
    source_runs: record.source_runs ?? null,
    source_coverage: record.source_coverage ?? null,
  }
}

function buildDifyPayload(company: SalesCompany): JsonRecord {
  return {
    company_id: company.id,
    company_name: company.company_name,
    domain: company.domain,
    industry: company.industry,
    region: company.region,
    report_locale: company.report_locale,
    target_country: company.target_country,
    template_variant: company.template_variant,
    source: company.source,
    report_url: company.report_url,
    pagespeed_mobile: company.pagespeed_mobile,
    pagespeed_desktop: company.pagespeed_desktop,
    detected_issues: company.detected_issues,
    enrichment_meta: compactMeta(company.meta),
  }
}

function normalizeDifySummary(raw: JsonRecord, fallback: DifyDiagnosisResult["summary"]): DifyDiagnosisResult["summary"] {
  const data = asRecord(raw.data) ?? raw
  const outputs = asRecord(data.outputs) ?? asRecord(raw.outputs) ?? {}
  const result = parseJsonObject(outputs.result) ?? parseJsonObject(data.result) ?? parseJsonObject(raw.result) ?? {}
  const merged = { ...outputs, ...result }

  const primaryPain =
    firstString(merged.primary_pain, merged.primaryPain, merged.summary, merged.pain, merged.diagnosis) ?? fallback.primaryPain
  const evidence = stringArray(merged.evidence ?? merged.evidence_points ?? merged.facts)
  const recommendedOffer =
    firstString(merged.recommended_offer, merged.recommendedOffer, merged.offer, merged.next_action) ?? fallback.recommendedOffer

  return {
    primaryPain,
    evidence: evidence.length > 0 ? evidence : fallback.evidence,
    recommendedOffer,
    confidence: numberBetweenZeroAndOne(merged.confidence, fallback.confidence),
  }
}

function resolveDifyDiagnosisCredential(): { envName: string; apiKey: string; baseUrl: string } | null {
  for (const envName of DIFY_DIAGNOSIS_WORKFLOW_KEY_ENV_NAMES) {
    const apiKey = readOptionalEnv(envName)
    if (apiKey) {
      const baseUrl = normalizeDifyCloudBaseUrl(readOptionalEnv("DIFY_DIAGNOSIS_BASE_URL") ?? readOptionalEnv("DIFY_BASE_URL"))
      return { envName, apiKey, baseUrl }
    }
  }
  return null
}

export async function runDifyDiagnosis(company: SalesCompany): Promise<DifyDiagnosisResult> {
  const fallback = localDiagnosis(company)
  const credential = resolveDifyDiagnosisCredential()
  
  if (!credential) {
    return { ok: true, configured: false, summary: fallback, error: "Dify diagnosis workflow key is not configured" }
  }

  const payload = buildDifyPayload(company)
  const userPayload = JSON.stringify(payload)

  try {
    const systemPrompt = await getAiPrompt("dify_diagnosis_system")
    const res = await fetch(`${credential.baseUrl}/workflows/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credential.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          ...payload,
          system_prompt: systemPrompt,
          user_payload: userPayload,
        },
        response_mode: "blocking",
        user: `sales-os-${company.id.slice(0, 8)}`,
      }),
      signal: AbortSignal.timeout(60_000),
    })

    const rawText = await res.text()
    const raw = rawText ? (JSON.parse(rawText) as JsonRecord) : {}
    if (!res.ok) {
      console.error("[dify-diagnosis] request failed:", res.status, rawText.slice(0, 300))
      return {
        ok: false,
        configured: true,
        workflowEnvName: credential.envName,
        summary: fallback,
        raw,
        error: `Dify HTTP ${res.status}`,
      }
    }

    return {
      ok: true,
      configured: true,
      workflowEnvName: credential.envName,
      summary: normalizeDifySummary(raw, fallback),
      raw,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error("[dify-diagnosis] failed:", message)
    return { ok: false, configured: true, workflowEnvName: credential.envName, summary: fallback, error: message }
  }
}
