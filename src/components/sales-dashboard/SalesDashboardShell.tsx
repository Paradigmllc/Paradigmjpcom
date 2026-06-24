"use client"

import { useQuery } from "@tanstack/react-query"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { SalesCommandCenter } from "./SalesCommandCenter"
import type { SalesDashboardData } from "@/lib/sales/dashboard"

async function fetchDashboard(locale: string): Promise<SalesDashboardData> {
  const params = new URLSearchParams({ report_locale: locale })
  const res = await fetch(`/api/sales/dashboard?${params.toString()}`, { cache: "no-store" })
  if (!res.ok) {
    let errorMsg = `Dashboard fetch failed (${res.status})`
    try {
      const body = await res.json()
      errorMsg = body.error ?? errorMsg
    } catch (parseErr) {
      console.error("[SalesDashboardShell] error response parse failed:", parseErr)
    }
    throw new Error(errorMsg)
  }
  const json = await res.json()
  if (!json.ok || !json.dashboard) {
    throw new Error(json.error ?? "Dashboard data unavailable")
  }
  return json.dashboard as SalesDashboardData
}

export const DASHBOARD_QUERY_KEY = ["sales-dashboard"] as const

function Shell({ initialData, locale, twentyUrl }: { initialData: SalesDashboardData; locale: string; twentyUrl: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, locale],
    queryFn: () => fetchDashboard(locale),
    initialData,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50">
        <div className="text-sm text-zinc-500">ダッシュボードを読み込み中...</div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-sm font-semibold text-red-800">ダッシュボードの読み込みに失敗しました</h2>
          <p className="mt-2 text-xs text-red-600">{error instanceof Error ? error.message : "不明なエラー"}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex h-9 items-center rounded-md bg-red-100 px-4 text-xs font-semibold text-red-700 hover:bg-red-200"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  return <SalesCommandCenter data={data} locale={locale} twentyUrl={twentyUrl} />
}

export function SalesDashboardShell({ initialData, locale, twentyUrl }: { initialData: SalesDashboardData; locale: string; twentyUrl: string }) {
  return (
    <QueryProvider>
      <Shell initialData={initialData} locale={locale} twentyUrl={twentyUrl} />
    </QueryProvider>
  )
}
