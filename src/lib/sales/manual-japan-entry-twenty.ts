import "server-only"

import { countrySelectValue, industrySelectValue, sourceSelectValue } from "./twenty-sync-summaries"
import {
  createTwentyCompanyBase,
  findTwentyCompanyByDomain,
  patchTwentyCompanyHome,
} from "./twenty-sync-company-home"
import type { ManualCompanyProfile } from "./manual-japan-entry-types"

export async function syncManualWorkToTwenty(input: {
  domain: string
  profile: ManualCompanyProfile
  formUrl: string
  reportUrl: string
  initialMessage: string
}): Promise<{ status: "synced" | "duplicate"; companyId: string }> {
  const existing = await findTwentyCompanyByDomain(input.domain)
  if (existing?.id) return { status: "duplicate", companyId: existing.id }

  const company = await createTwentyCompanyBase({
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
  const patched = await patchTwentyCompanyHome(company.id, {
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
  })
  if (!patched.ok) throw new Error(patched.error)
  return { status: "synced", companyId: company.id }
}
