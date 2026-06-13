import type { Metadata } from "next"
import { SalesDashboardShell } from "@/components/sales-dashboard/SalesDashboardShell"
import { getSalesDashboardData } from "@/lib/sales/dashboard"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Revenue OS | Paradigm",
  robots: { index: false, follow: false, nocache: true },
}

interface Props {
  params: Promise<{ locale: string }>
}

export default async function SalesPage({ params }: Props) {
  const { locale } = await params
  const dashboard = await getSalesDashboardData({ reportLocale: locale })
  return <SalesDashboardShell initialData={dashboard} locale={locale} />
}
