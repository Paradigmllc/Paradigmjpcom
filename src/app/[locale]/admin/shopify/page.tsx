import type { Metadata } from "next"
import Link from "next/link"
import { cookies, headers } from "next/headers"
import { ShopifyOpsShell } from "@/components/shopify-ops/ShopifyOpsShell"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { getShopifyOpsDashboard } from "@/lib/shopify-ops/repository"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Tiny Shops of Japan 運営OS | Paradigm",
  robots: { index: false, follow: false, nocache: true },
}

type Props = { params: Promise<{ locale: string }> }

async function isAuthorized(): Promise<boolean> {
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
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-zinc-950">管理者認証が必要です</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">Tiny Shops of Japan 運営OSはPayload CMS管理者のみ利用できます。</p>
        <Link href="/admin" className="mt-6 inline-flex rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white">管理画面へ</Link>
      </section>
    </main>
  )
}

export default async function ShopifyOpsPage({ params }: Props) {
  const { locale } = await params
  if (!(await isAuthorized())) return <UnauthorizedView />
  const dashboard = await getShopifyOpsDashboard()
  return <ShopifyOpsShell dashboard={dashboard} locale={locale} />
}
