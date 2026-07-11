import { syncCompanyKarteToTwenty } from "../twenty-sync"

/** Keep the generated draft and its evidence visible in the operator's CRM. */
export async function syncOutreachDraftToTwenty(
  companyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await syncCompanyKarteToTwenty(companyId)
  return result.ok ? { ok: true } : { ok: false, error: result.error ?? "Twenty sync failed" }
}
