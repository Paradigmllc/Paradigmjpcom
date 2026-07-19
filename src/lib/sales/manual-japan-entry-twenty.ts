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

export async function syncManualWorkToTwenty(input: {
  domain: string
  profile: ManualCompanyProfile
  formUrl: string
  reportUrl: string
  initialMessage: string
  ownedCompanyId?: string | null
}): Promise<{ status: "synced" | "duplicate"; companyId: string }> {
  const existing = await findTwentyCompanyByDomain(input.domain)
  if (existing?.id && existing.id !== input.ownedCompanyId) return { status: "duplicate", companyId: existing.id }

  const company = existing?.id
    ? existing
    : await createTwentyCompanyBase({
        companyName: input.profile.companyName,
        domain: input.domain,
      })
  if (!company.id) throw new Error("Twenty company ID was not returned")
  const summary = [
    "Manual Japan Entry workbench (not automated pipeline)",
    "State: uncontacted / human review required before sending",
    `Company: ${input.profile.companyName}`,
    `Country: ${input.profile.countryCode ?? "unconfirmed"}`,
    `SMB classification: ${input.profile.smbStatus} (${input.profile.smbConfidence}/100)`,
    `Japan Entry fit: ${input.profile.japanEntryFitStatus} (${input.profile.japanEntryFitConfidence}/100)`,
    `Report URL: ${input.reportUrl}`,
    `Form URL: ${input.formUrl}`,
    "--- Initial first-touch draft (never sent automatically) ---",
    input.initialMessage,
  ].join("\n")
  const expected = {
    name: input.profile.companyName,
    paradigmReportUrl: { primaryLinkLabel: "Japan Entry diagnostic", primaryLinkUrl: input.reportUrl },
    paradigmFormUrl: { primaryLinkLabel: "Verified form URL", primaryLinkUrl: input.formUrl },
    paradigmCountryName: countrySelectValue(input.profile.countryCode),
    paradigmIndustryName: industrySelectValue(input.profile.industry),
    paradigmSourceName: sourceSelectValue("manual_work"),
    paradigmSalesStatus: "手動確認 / 未対応",
    paradigmDataStatus: "Manual workbench / verified public evidence",
    paradigmNextAction: "初回文面を人間確認（未送信）",
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
    saved?.paradigmReportUrl?.primaryLinkUrl === input.reportUrl ? null : "reportUrl",
    saved?.paradigmFormUrl?.primaryLinkUrl === input.formUrl ? null : "formUrl",
    saved?.paradigmCountryName === expected.paradigmCountryName ? null : "country",
    saved?.paradigmIndustryName === expected.paradigmIndustryName ? null : "industry",
    saved?.paradigmSourceName === expected.paradigmSourceName ? null : "source",
    saved?.paradigmSalesStatus === expected.paradigmSalesStatus ? null : "salesStatus",
    saved?.paradigmDataStatus === expected.paradigmDataStatus ? null : "dataStatus",
    saved?.paradigmNextAction === expected.paradigmNextAction ? null : "nextAction",
    saved?.paradigmSmbScore === expected.paradigmSmbScore ? null : "smbScore",
    saved?.paradigmOpportunityScore === expected.paradigmOpportunityScore ? null : "opportunityScore",
    saved?.paradigmKarteSummary?.markdown === summary ? null : "initialMessageSummary",
  ].filter((value): value is string => value !== null)
  if (mismatches.length > 0) {
    throw new ManualTwentySyncError(`Twenty保存確認に失敗しました: ${mismatches.join(", ")}`, company.id)
  }
  return { status: "synced", companyId: company.id }
}
