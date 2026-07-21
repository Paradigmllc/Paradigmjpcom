import "server-only"

import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "./db-tables"
import { parseManualCompanyProfile } from "./manual-japan-entry-profile"
import { resolveManualJapanEntryReportData } from "./manual-japan-entry-report-resolver"
import { isManualJapanEntryReportData, type ManualJapanEntryReportData } from "./manual-japan-entry-report-types"
import { syncManualWorkToTwenty } from "./manual-japan-entry-twenty"
import type { ManualJapanEntryWorkRow } from "./manual-japan-entry-types"

const DEDICATED_REPORT_URL = /^https:\/\/paradigmjp\.com\/en\/work-report\/[0-9a-f-]{36}$/i

function client() {
  const supabase = getServiceSalesSupabase()
  if (!supabase) throw new Error("Sales Supabase is not configured")
  return supabase
}

function workRow(value: unknown): ManualJapanEntryWorkRow {
  return {
    ...(value as ManualJapanEntryWorkRow),
    source_attributions: [],
  }
}

function hasDedicatedReport(row: ManualJapanEntryWorkRow): boolean {
  return typeof row.report_url === "string" && DEDICATED_REPORT_URL.test(row.report_url)
}

async function findOwnedBy(
  field: "twenty_company_id" | "domain",
  value: string,
): Promise<ManualJapanEntryWorkRow | null> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .select("*")
    .eq(field, value)
    .in("twenty_sync_status", ["synced", "duplicate"])
    .not("report_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const row = workRow(data)
  return hasDedicatedReport(row) ? row : null
}

export async function findManualWorkOwningTwentyHome(input: {
  twentyCompanyId: string
  domain: string
}): Promise<ManualJapanEntryWorkRow | null> {
  return await findOwnedBy("twenty_company_id", input.twentyCompanyId)
    ?? await findOwnedBy("domain", input.domain)
}

export async function findManualWorkLegacyReportAlias(slug: string): Promise<{
  token: string
  companyName: string
} | null> {
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .select("report_token,company_name,report_url")
    .eq("legacy_report_slug", slug)
    .not("report_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(2)
  if (error) throw new Error(error.message)
  const rows = (data ?? []).filter((value) => {
    const row = value as { report_url?: unknown }
    return typeof row.report_url === "string" && DEDICATED_REPORT_URL.test(row.report_url)
  }) as Array<{ report_token: string; company_name: string | null; report_url: string }>
  if (rows.length !== 1) {
    if (rows.length > 1) console.warn("[manual-work-authority] ambiguous legacy report slug:", slug)
    return null
  }
  return {
    token: rows[0].report_token,
    companyName: rows[0].company_name ?? slug,
  }
}

export async function persistCurrentManualWorkReport(
  item: ManualJapanEntryWorkRow,
  report: ManualJapanEntryReportData,
): Promise<void> {
  if (isManualJapanEntryReportData(item.report_data)) return
  const { data, error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .update({ report_data: report })
    .eq("id", item.id)
    .select("id")
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) throw new Error("Current manual report could not be persisted")
}

export async function restoreManualWorkTwentyHome(input: {
  twentyCompanyId: string
  domain: string
}): Promise<{ protected: false } | { protected: true; reportUrl: string; workId: string }> {
  const item = await findManualWorkOwningTwentyHome(input)
  if (!item || !item.report_url) return { protected: false }

  const profile = parseManualCompanyProfile(item.profile)
  const reviewPassed = item.message_review?.passed === true
  const sendReady = Boolean(
    item.form_url
    && item.initial_message
    && reviewPassed
    && profile.smbStatus === "qualified"
    && profile.japanEntryFitStatus === "qualified",
  )
  const reasons = sendReady
    ? []
    : [item.error_message || "Saved manual work artifacts require operator review before outreach."]
  const currentReport = resolveManualJapanEntryReportData(item)
  await persistCurrentManualWorkReport(item, currentReport)
  const synced = await syncManualWorkToTwenty({
    domain: item.domain,
    profile,
    formUrl: item.form_url,
    reportUrl: item.report_url,
    initialMessage: item.initial_message,
    ownedCompanyId: input.twentyCompanyId,
    readiness: { sendReady, reasons },
  })
  if (synced.companyId !== input.twentyCompanyId) {
    throw new Error("Manual work ownership resolved to a different Twenty company")
  }
  const { error } = await client()
    .from(DB_TABLES.MANUAL_JAPAN_ENTRY_WORK)
    .update({
      twenty_company_id: synced.companyId,
      twenty_sync_status: synced.status,
    })
    .eq("id", item.id)
  if (error) throw new Error(error.message)
  return { protected: true, reportUrl: item.report_url, workId: item.id }
}
