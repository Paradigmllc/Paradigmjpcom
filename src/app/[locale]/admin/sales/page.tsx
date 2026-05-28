import type { Metadata } from "next"
import Link from "next/link"
import { cookies, headers } from "next/headers"
import { SalesCommandCenter } from "@/components/sales-dashboard/SalesCommandCenter"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { getSalesDashboardData } from "@/lib/sales/dashboard"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "営業ダッシュボード | Paradigm",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const requestHeaders = await headers()
  const auth = await authorizePayloadAdminRequest({
    headers: new Headers(requestHeaders),
    legacyToken: cookieStore.get("paradigm_admin_token")?.value,
  })
  return auth.ok
}

function UnauthorizedView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-zinc-950 text-white">
          <span className="text-sm font-semibold">P</span>
        </div>
        <h1 className="mt-5 text-xl font-semibold text-zinc-950">認証が必要です</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          営業ダッシュボードはPayloadCMS管理画面と同じログインで利用します。先に管理画面へログインしてください。
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          管理画面へ
        </Link>
      </section>
    </main>
  )
}

export default async function SalesDashboardPage() {
  const authed = await checkAuth()
  if (!authed) return <UnauthorizedView />

  const dashboard = await getSalesDashboardData()
  return <SalesCommandCenter data={dashboard} />
}
