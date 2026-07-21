import "server-only"

import { countrySelectValue, industrySelectValue, sourceSelectValue } from "./twenty-sync-summaries"
import {
  createTwentyCompanyBase,
  findTwentyCompanyByDomain,
  patchTwentyCompanyHome,
} from "./twenty-sync-company-home"
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

export async function syncManualWorkToTwenty(input: {
  domain: string
  profile: ManualCompanyProfile
  formUrl: string | null
  reportUrl: string
  initialMessage: string | null
  ownedCompanyId?: string | null
  readiness?: { sendReady: boolean; reasons: string[] }
}): Promise<{ status: "synced" | "duplicate"; companyId: string }> {
  const existing = await findTwentyCompanyByDomain(input.domain)
  const company = existing?.id
    ? existing
    : await createTwentyCompanyBase({
        companyName: input.profile.companyName,
        domain: input.domain,
      })
  if (!company.id) throw new Error("Twenty company ID was not returned")
  const sendReady = input.readiness?.sendReady ?? Boolean(
    input.formUrl
    && input.initialMessage
    && input.profile.smbStatus === "qualified"
    && input.profile.japanEntryFitStatus === "qualified",
  )
  const reviewReasons = input.readiness?.reasons ?? []
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
  const expected = {
    name: input.profile.companyName,
    paradigmReportUrl: { primaryLinkLabel: "Japan Entry diagnostic", primaryLinkUrl: input.reportUrl },
    paradigmFormUrl: {
      primaryLinkLabel: input.formUrl ? "Verified form URL" : "",
      primaryLinkUrl: input.formUrl ?? "",
    },
    paradigmCountryName: countrySelectValue(input.profile.countryCode),
    paradigmIndustryName: industrySelectValue(input.profile.industry),
    paradigmSourceName: sourceSelectValue("manual_work"),
    // Twenty select fields reject values outside their configured option set.
    // Readiness detail belongs in dataStatus/nextAction while sales stays unsent.
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
  }
  const patched = await patchTwentyCompanyHome(company.id, expected)
  if (!patched.ok) throw new ManualTwentySyncError(patched.error, company.id)
  let saved
  try {
    saved = await findTwentyCompanyByDomain(input.domain)
  } catch (error) {
    throw new ManualTwentySyncError(
      `Twenty保存確認リクエストに失敗しました: ${error instanceof Error ? error.message : "unknown error"}`,
      company.id,
    )
  }
  const mismatches = [
    saved?.id === company.id ? null : "companyId",
    saved?.name === expected.name ? null : "name",
    twentyLinkMatches(saved?.paradigmReportUrl?.primaryLinkUrl, input.reportUrl) ? null : "reportUrl",
    twentyLinkMatches(saved?.paradigmFormUrl?.primaryLinkUrl, input.formUrl ?? "") ? null : "formUrl",
    saved?.paradigmCountryName === expected.paradigmCountryName ? null : "country",
    saved?.paradigmIndustryName === expected.paradigmIndustryName ? null : "industry",
    saved?.paradigmSourceName === expected.paradigmSourceName ? null : "source",
    saved?.paradigmSalesStatus === expected.paradigmSalesStatus ? null : "salesStatus",
    saved?.paradigmDataStatus === expected.paradigmDataStatus ? null : "dataStatus",
    saved?.paradigmNextAction === expected.paradigmNextAction ? null : "nextAction",
    twentyNumberMatches(saved?.paradigmSmbScore, expected.paradigmSmbScore) ? null : "smbScore",
    twentyNumberMatches(saved?.paradigmOpportunityScore, expected.paradigmOpportunityScore) ? null : "opportunityScore",
    saved?.paradigmKarteSummary?.markdown === summary ? null : "initialMessageSummary",
  ].filter((value): value is string => value !== null)
  if (mismatches.length > 0) {
    throw new ManualTwentySyncError(`Twenty保存確認に失敗しました: ${mismatches.join(", ")}`, company.id)
  }
  return { status: "synced", companyId: company.id }
}
