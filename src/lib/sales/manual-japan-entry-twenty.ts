import "server-only"

import { countrySelectValue, industrySelectValue, sourceSelectValue } from "./twenty-sync-summaries"
import {
  createTwentyCompanyBase,
  findTwentyCompaniesById,
  findTwentyCompanyByDomain,
  findTwentyCompanyById,
  patchTwentyCompanyHome,
} from "./twenty-sync-company-home"
import { twentyFetch, type TwentyRecord } from "./twenty-sync-utils"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"

export class ManualTwentySyncError extends Error {
  constructor(message: string, readonly companyId: string) {
    super(message)
    this.name = "ManualTwentySyncError"
  }
}

export function twentyNumberMatches(actual: unknown, expected: number): boolean {
  if (typeof actual === "number") return Number.isFinite(actual) && actual === expected
  if (typeof actual !== "string" || !/^-?\d+(?:\.\d+)?$/.test(actual.trim())) return false
  const parsed = Number(actual)
  return Number.isFinite(parsed) && parsed === expected
}

function canonicalTwentyLink(value: string | null | undefined): string {
  if (!value) return ""
  try {
    const url = new URL(value)
    url.hash = ""
    url.hostname = url.hostname.toLowerCase()
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = ""
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "")
    return url.toString()
  } catch (error) {
    console.error("[manual-work-twenty] invalid link during read-back comparison:", { value, error })
    return value.trim()
  }
}

export function twentyLinkMatches(actual: string | null | undefined, expected: string): boolean {
  return canonicalTwentyLink(actual) === canonicalTwentyLink(expected)
}

export interface ManualTwentySyncInput {
  domain: string
  profile: ManualCompanyProfile
  formUrl: string | null
  reportUrl: string
  initialMessage: string | null
  ownedCompanyId?: string | null
  readiness?: { sendReady: boolean; reasons: string[] }
}

interface ManualTwentyExpected {
  payload: Record<string, unknown>
  summary: string
  country: string | null
  sendReady: boolean
}

export interface ManualTwentyBatchResult {
  companyId: string
  domain: string
  ok: boolean
  error?: string
}

interface TwentyBatchMutationResponse {
  data?: { createCompanies?: TwentyRecord[]; updateCompanies?: TwentyRecord[] }
}

function manualTwentyExpected(
  input: ManualTwentySyncInput,
  company: TwentyRecord,
): ManualTwentyExpected {
  const sendReady = input.readiness?.sendReady ?? Boolean(
    input.formUrl
    && input.initialMessage
    && input.profile.smbStatus === "qualified"
    && input.profile.japanEntryFitStatus === "qualified",
  )
  const reviewReasons = input.readiness?.reasons ?? []
  const classifiedCountry = countrySelectValue(input.profile.countryCode)
  const country = classifiedCountry ?? company.paradigmCountryName ?? null
  const summary = [
    "Manual Japan Entry workbench (not automated pipeline)",
    `Analysis state: ${sendReady ? "ready for human pre-send review" : "analyzed / review required"}`,
    "Outreach state: uncontacted / never sent automatically",
    `Company: ${input.profile.companyName}`,
    `Country: ${input.profile.countryCode ?? "unconfirmed"}`,
    `SMB classification: ${input.profile.smbStatus} (${input.profile.smbConfidence}/100)`,
    `Japan Entry fit: ${input.profile.japanEntryFitStatus} (${input.profile.japanEntryFitConfidence}/100)`,
    `Report URL: ${input.reportUrl}`,
    `Form URL: ${input.formUrl ?? "not verified"}`,
    ...(reviewReasons.length ? ["Review reasons:", ...reviewReasons.map((reason) => `- ${reason}`)] : []),
    "--- Initial first-touch draft (never sent automatically) ---",
    input.initialMessage ?? "No draft passed the production quality gate. Regeneration is required before outreach.",
  ].join("\n")
  return {
    summary,
    country,
    sendReady,
    payload: {
      name: input.profile.companyName,
      paradigmReportUrl: { primaryLinkLabel: "Japan Entry diagnostic", primaryLinkUrl: input.reportUrl },
      paradigmFormUrl: {
        primaryLinkLabel: input.formUrl ? "Verified form URL" : "",
        primaryLinkUrl: input.formUrl ?? "",
      },
      paradigmCountryName: country,
      paradigmIndustryName: industrySelectValue(input.profile.industry),
      paradigmSourceName: sourceSelectValue("manual_work"),
      paradigmSalesStatus: "手動確認 / 未対応",
      paradigmDataStatus: sendReady
        ? "Manual workbench / analyzed / pre-send review"
        : "Manual workbench / analyzed / evidence review required",
      paradigmNextAction: sendReady
        ? "フォーム・初回文面を人間確認（未送信）"
        : "不足根拠・フォーム・文面を確認（未送信）",
      paradigmSmbScore: input.profile.smbConfidence,
      paradigmOpportunityScore: input.profile.japanEntryFitConfidence,
      paradigmKarteSummary: { markdown: summary },
    },
  }
}

function manualTwentyReadbackIssues(
  saved: TwentyRecord | null,
  companyId: string,
  input: ManualTwentySyncInput,
  expected: ManualTwentyExpected,
): string[] {
  return [
    saved?.id === companyId ? null : "companyId",
    saved?.name === input.profile.companyName ? null : "name",
    twentyLinkMatches(saved?.paradigmReportUrl?.primaryLinkUrl, input.reportUrl) ? null : "reportUrl",
    twentyLinkMatches(saved?.paradigmFormUrl?.primaryLinkUrl, input.formUrl ?? "") ? null : "formUrl",
    saved?.paradigmCountryName === expected.country ? null : "country",
    saved?.paradigmIndustryName === expected.payload.paradigmIndustryName ? null : "industry",
    saved?.paradigmSourceName === expected.payload.paradigmSourceName ? null : "source",
    saved?.paradigmSalesStatus === expected.payload.paradigmSalesStatus ? null : "salesStatus",
    saved?.paradigmDataStatus === expected.payload.paradigmDataStatus ? null : "dataStatus",
    saved?.paradigmNextAction === expected.payload.paradigmNextAction ? null : "nextAction",
    twentyNumberMatches(saved?.paradigmSmbScore, input.profile.smbConfidence) ? null : "smbScore",
    twentyNumberMatches(saved?.paradigmOpportunityScore, input.profile.japanEntryFitConfidence) ? null : "opportunityScore",
    saved?.paradigmKarteSummary?.markdown === expected.summary ? null : "initialMessageSummary",
  ].filter((value): value is string => value !== null)
}

export async function syncManualWorkToTwenty(
  input: ManualTwentySyncInput,
): Promise<{ status: "synced" | "duplicate"; companyId: string }> {
  const existing = input.ownedCompanyId
    ? await findTwentyCompanyById(input.ownedCompanyId)
    : await findTwentyCompanyByDomain(input.domain)
  if (input.ownedCompanyId && existing?.id !== input.ownedCompanyId) {
    throw new ManualTwentySyncError("Owned Twenty company could not be read back", input.ownedCompanyId)
  }
  const company = existing?.id
    ? existing
    : await createTwentyCompanyBase({
        companyName: input.profile.companyName,
        domain: input.domain,
      })
  if (!company.id) throw new Error("Twenty company ID was not returned")
  const expected = manualTwentyExpected(input, company)
  const patched = await patchTwentyCompanyHome(company.id, expected.payload)
  if (!patched.ok) throw new ManualTwentySyncError(patched.error, company.id)
  let saved
  try {
    saved = input.ownedCompanyId
      ? await findTwentyCompanyById(input.ownedCompanyId)
      : await findTwentyCompanyByDomain(input.domain)
  } catch (error) {
    throw new ManualTwentySyncError(
      `Twenty保存確認リクエストに失敗しました: ${error instanceof Error ? error.message : "unknown error"}`,
      company.id,
    )
  }
  const mismatches = manualTwentyReadbackIssues(saved, company.id, input, expected)
  if (mismatches.length > 0) {
    throw new ManualTwentySyncError(`Twenty保存確認に失敗しました: ${mismatches.join(", ")}`, company.id)
  }
  return { status: "synced", companyId: company.id }
}

export async function syncManualWorkToTwentyBatch(
  inputs: ManualTwentySyncInput[],
): Promise<ManualTwentyBatchResult[]> {
  const companyIds = inputs.map((input) => input.ownedCompanyId).filter((value): value is string => Boolean(value))
  if (companyIds.length !== inputs.length || new Set(companyIds).size !== inputs.length || inputs.length > 60) {
    throw new Error("Manual work Twenty batch reconciliation requires 1-60 unique owned company IDs")
  }
  if (inputs.length === 0) return []

  const before = await findTwentyCompaniesById(companyIds)
  const expectedById = new Map<string, ManualTwentyExpected>()
  const mutations: Array<Record<string, unknown>> = []
  const earlyFailures: ManualTwentyBatchResult[] = []
  for (const input of inputs) {
    const companyId = input.ownedCompanyId as string
    const company = before.get(companyId)
    if (!company) {
      earlyFailures.push({ companyId, domain: input.domain, ok: false, error: "Owned Twenty company could not be read back" })
      continue
    }
    const expected = manualTwentyExpected(input, company)
    expectedById.set(companyId, expected)
    mutations.push({
      id: companyId,
      domainName: { primaryLinkLabel: input.domain, primaryLinkUrl: `https://${input.domain}` },
      ...expected.payload,
    })
  }
  if (mutations.length === 0) return earlyFailures

  const written = await twentyFetch<TwentyBatchMutationResponse>("/rest/batch/companies?upsert=true&depth=0", {
    method: "POST",
    body: JSON.stringify(mutations),
  })
  if (!written.ok) {
    return [
      ...earlyFailures,
      ...inputs.filter((input) => expectedById.has(input.ownedCompanyId as string)).map((input) => ({
        companyId: input.ownedCompanyId as string,
        domain: input.domain,
        ok: false,
        error: written.error,
      })),
    ]
  }

  const returned = new Set(
    [
      ...(written.data.data?.createCompanies ?? []),
      ...(written.data.data?.updateCompanies ?? []),
    ].flatMap((company) => company.id ? [company.id] : []),
  )
  const after = await findTwentyCompaniesById([...expectedById.keys()])
  const verified = inputs.filter((input) => expectedById.has(input.ownedCompanyId as string)).map((input): ManualTwentyBatchResult => {
    const companyId = input.ownedCompanyId as string
    if (!returned.has(companyId)) {
      return { companyId, domain: input.domain, ok: false, error: "Twenty batch response omitted company" }
    }
    const expected = expectedById.get(companyId) as ManualTwentyExpected
    const issues = manualTwentyReadbackIssues(after.get(companyId) ?? null, companyId, input, expected)
    return issues.length === 0
      ? { companyId, domain: input.domain, ok: true }
      : { companyId, domain: input.domain, ok: false, error: `Twenty保存確認に失敗しました: ${issues.join(", ")}` }
  })
  return [...earlyFailures, ...verified]
}
