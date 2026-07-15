import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"
import DiagnosticReport from "@/components/diagnostic/DiagnosticReport"
import type { DiagnosticReportData } from "@/lib/sales/diagnostic"
import { ensureSafeDiagnosticReport } from "@/lib/sales/diagnostic/safe-report"
import { findManualWorkByReportToken } from "@/lib/sales/manual-japan-entry-store"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string; token: string }>
}

export const metadata: Metadata = {
  title: "Private Japan Entry Diagnostic | Paradigm",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

export default async function ManualWorkReportPage({ params }: Props) {
  const { locale, token } = await params
  if (locale !== "en" || !z.string().uuid().safeParse(token).success) notFound()
  let item = null
  try {
    item = await findManualWorkByReportToken(token)
  } catch (error) {
    console.error("[work-report] fetch failed:", error)
  }
  if (!item || !item.report_url || !("company_name" in item.report_data)) notFound()
  const data = ensureSafeDiagnosticReport(item.report_data as DiagnosticReportData, token, "en")
  return <DiagnosticReport data={data} locale="en" />
}
