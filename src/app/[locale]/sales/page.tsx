import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import { SalesDashboardShell } from "@/components/_archive_sales-dashboard/SalesDashboardShell"
import { getSalesDashboardData } from "@/lib/_archive_sales-dashboard/dashboard"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { twentyBaseUrl } from "@/lib/sales/twenty-sync-utils"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Revenue OS | Paradigm",
  robots: { index: false, follow: false, nocache: true },
}

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ token?: string }>
}

async function checkAuth(searchParams: { token?: string }): Promise<boolean> {
  // Method 1: PayloadCMS admin cookie (if logged into /admin)
  const cookieStore = await cookies()
  const requestHeaders = await headers()
  const payloadAuth = await authorizePayloadAdminRequest({
    headers: new Headers(requestHeaders),
    legacyToken: cookieStore.get("paradigm_admin_token")?.value,
  })
  if (payloadAuth.ok) return true

  // Method 2: Token from URL query param or TRIGGER_WEBHOOK_SECRET
  const expectedToken = process.env.TRIGGER_WEBHOOK_SECRET
  if (expectedToken && searchParams.token === expectedToken) return true

  return false
}

export default async function SalesPage({ params, searchParams }: Props) {
  const { locale } = await params
  const sp = await searchParams

  if (!(await checkAuth(sp))) {
    redirect(`/${locale}/admin`)
  }

  const dashboard = await getSalesDashboardData({ reportLocale: locale })
  return (
    <SalesDashboardShell
      initialData={dashboard}
      locale={locale}
      twentyUrl={twentyBaseUrl() ?? "https://twenty.paradigmjp.com"}
    />
  )
}
