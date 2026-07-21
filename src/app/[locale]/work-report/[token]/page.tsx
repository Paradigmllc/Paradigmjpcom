import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"
import ManualJapanEntryReport from "@/components/work-report/ManualJapanEntryReport"
import { resolveManualJapanEntryReportData } from "@/lib/sales/manual-japan-entry-report-resolver"
import { findManualWorkByReportToken } from "@/lib/sales/manual-japan-entry-store"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ locale: string; token: string }>
}

export const metadata: Metadata = {
  title: "Japan Entry Strategy Report | Paradigm",
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
  if (!item || !item.report_url) notFound()
  const data = resolveManualJapanEntryReportData(item)
  return <ManualJapanEntryReport data={data} />
}
