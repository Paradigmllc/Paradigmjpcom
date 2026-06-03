import type { Metadata } from "next"
import type { ReactNode } from "react"
import Link from "next/link"
import { cookies, headers } from "next/headers"
import { ArrowLeft, ExternalLink, Lock, RadioTower, ShieldCheck, Video } from "lucide-react"
import { SalesVideoPipelinePanel } from "@/components/sales-dashboard/SalesVideoPipelinePanel"
import { authorizePayloadAdminRequest } from "@/lib/admin-auth"
import { getSalesDashboardData } from "@/lib/sales/dashboard"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "動画制作ライン | Paradigm Revenue OS",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
}

export default async function StudioPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const authed = await checkAuth()
  if (!authed) return <UnauthorizedView />

  const dashboard = await getSalesDashboardData({ reportLocale: locale })
  const studioUrl = process.env.NEXT_PUBLIC_OPENMONTAGE_STUDIO_URL?.trim() || "https://studio.paradigmjp.com"
  const openMontageReady = dashboard.videoPipeline.config.renderers.openmontage

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <Link
                href={`/${locale}/admin/sales?tab=videoPipeline`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
              >
                <ArrowLeft size={16} aria-hidden />
                Revenue OS に戻る
              </Link>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white">
                  <Video size={14} aria-hidden />
                  動画制作ライン
                </span>
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">
                  {studioUrl.replace(/^https?:\/\//, "")}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${openMontageReady ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-amber-50 text-amber-800 ring-amber-200"}`}>
                  OpenMontage {openMontageReady ? "接続済み" : "未設定"}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                OpenMontage / n8n 連携の正規ジョブ投入UI
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
                ここは OpenMontage 公式GUIの複製ではなく、Paradigm Revenue OS から動画制作ジョブを投入するための正規フロントドアです。
                OpenMontage はレンダラー/制作エージェントとして n8n 経由で呼び出し、ジョブ・承認・納品URLは Supabase SSOT に保存します。
              </p>
            </div>
            <a
              href="https://github.com/calesthio/OpenMontage"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 hover:border-zinc-400"
            >
              OpenMontage OSS
              <ExternalLink size={15} aria-hidden />
            </a>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <StatusTile
              icon={<RadioTower size={17} aria-hidden />}
              label="投入経路"
              value="n8n Webhook"
              detail={dashboard.videoPipeline.config.n8n.ready ? "ジョブ投入可能" : "N8N_VIDEO_PIPELINE_WEBHOOK_URL を確認"}
            />
            <StatusTile
              icon={<ShieldCheck size={17} aria-hidden />}
              label="保存先"
              value="Supabase / R2"
              detail={dashboard.videoPipeline.config.r2.ready ? "納品URL保存可能" : "R2公開URLは未設定"}
            />
            <StatusTile
              icon={<Video size={17} aria-hidden />}
              label="制作エンジン"
              value="OpenMontage"
              detail={openMontageReady ? "OPENMONTAGE_API_URL 設定済み" : "環境変数設定後に有効化"}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <SalesVideoPipelinePanel data={dashboard} />
      </section>
    </main>
  )
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
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 sm:p-6">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-zinc-950 text-white">
          <Lock size={18} aria-hidden />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-zinc-950">管理者認証が必要です</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          動画制作ラインは Revenue OS の管理者向け画面です。Payload 管理画面へログインしてから再度アクセスしてください。
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

function StatusTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-zinc-950">{value}</div>
      <p className="mt-1 text-xs leading-5 text-zinc-600">{detail}</p>
    </div>
  )
}
