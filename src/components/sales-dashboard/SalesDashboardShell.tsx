"use client"

import { useQuery } from "@tanstack/react-query"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { SalesCommandCenter } from "./SalesCommandCenter"
import type { SalesDashboardData } from "@/lib/sales/dashboard"

async function fetchDashboard(): Promise<SalesDashboardData> {
  const res = await fetch("/api/sales/dashboard", { cache: "no-store" })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Dashboard fetch failed (${res.status})`)
  }
  const json = await res.json()
  if (!json.ok || !json.dashboard) {
    throw new Error(json.error ?? "Dashboard data unavailable")
  }
  return json.dashboard as SalesDashboardData
}

export const DASHBOARD_QUERY_KEY = ["sales-dashboard"] as const

function Shell({ initialData, locale }: { initialData: SalesDashboardData; locale: string }) {
  const { data } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: fetchDashboard,
    initialData,
  })

  return <SalesCommandCenter data={data} locale={locale} />
}

export function SalesDashboardShell({ initialData, locale }: { initialData: SalesDashboardData; locale: string }) {
  return (
    <QueryProvider>
      <Shell initialData={initialData} locale={locale} />
    </QueryProvider>
  )
}
