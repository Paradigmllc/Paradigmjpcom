"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Clapperboard,
  ChevronRight,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  ListChecks,
  Rocket,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Video,
} from "lucide-react"
import { Toaster } from "sonner"

import {
  AnalyticsPanel,
  CrmPanel,
  IntegrationsPanel,
  MigrationPanel,
  OperatorPanel,
  OverviewPanel,
} from "./SalesCommandPanels"
import { SalesAgentTeamPanel } from "./SalesAgentTeamPanel"
import { SalesAutomationPanel } from "./SalesAutomationPanel"
import { SalesDocsPanel } from "./SalesDocsPanel"
import { SalesOperationsAuditPanel } from "./SalesOperationsAuditPanel"
import { SalesTemplateWorkbenchPanel } from "./SalesTemplateWorkbenchPanel"
import { SalesUnifiedOpsPanel } from "./SalesUnifiedOpsPanel"
import { SalesProVideoStudioPanel } from "./SalesProVideoStudioPanel"
import { SalesReportVideoStudioPanel } from "./SalesReportVideoStudioPanel"
import { ExternalStudioSyncPanel } from "./ExternalStudioSyncPanel"
import { SalesPipelinePanel } from "./SalesPipelinePanel"
import { AiPromptsPanel } from "./AiPromptsPanel"
import type { SalesDashboardData } from "@/lib/sales/dashboard"

type SalesTab =
  | "automation"
  | "operator"
  | "agentTeam"
  | "reportVideoStudio"
  | "proVideoStudio"
  | "keystatic"
  | "directus"
  | "supabaseStudio"
  | "crm"
  | "analytics"
  | "integrations"
  | "prompts"
  | "audit"
  | "docs"
  | "migration"

type SalesCommandCenterProps = {
  data: SalesDashboardData
  locale: string
}

type TabItem = {
  id: SalesTab
  label: string
  eyebrow: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  externalGui?: true
}

const tabItems: TabItem[] = [
  { id: "automation", label: "CSV・自動診断", eyebrow: "INTAKE", description: "投入から企業カルテ生成", icon: UploadCloud },
  { id: "reportVideoStudio", label: "レポート動画", eyebrow: "GPULESS", description: "診断解説・HyperFrames", icon: Video },
  { id: "proVideoStudio", label: "プロ級動画", eyebrow: "GPU STUDIO", description: "Vast.ai + ComfyUI", icon: Clapperboard },
  { id: "operator", label: "オペレーター", eyebrow: "QUEUE", description: "人間確認が必要な作業", icon: ListChecks },
  { id: "agentTeam", label: "AIチーム", eyebrow: "AGENTS", description: "Hermes / Telegram / Slack", icon: Bot },
  { id: "directus", label: "資料・スライド", eyebrow: "DIRECTUS", description: "Directus正規GUI", icon: Sparkles, externalGui: true },
  { id: "keystatic", label: "デモサイト管理", eyebrow: "KEYSTATIC", description: "Keystatic正規GUI", icon: Globe2, externalGui: true },
  { id: "supabaseStudio", label: "診断レポート", eyebrow: "SUPABASE", description: "Supabase Studio", icon: Database, externalGui: true },
  { id: "crm", label: "CRM設定", eyebrow: "TWENTY", description: "表示列と選択肢マスター", icon: BriefcaseBusiness },
  { id: "analytics", label: "分析", eyebrow: "METABASE", description: "営業KPIとボトルネック", icon: BarChart3, externalGui: true },
  { id: "integrations", label: "統合", eyebrow: "OSS / API", description: "接続・残量・未設定", icon: Database },
  { id: "prompts", label: "AIプロンプト", eyebrow: "PROMPTS", description: "Dify・DeepSeek指示", icon: Bot },
  { id: "audit", label: "運用監査", eyebrow: "GUARDRAILS", description: "安全制御と漏れ検知", icon: ShieldCheck },
  { id: "docs", label: "使い方", eyebrow: "RUNBOOK", description: "実務フローと判断基準", icon: FileText },
  { id: "migration", label: "移行計画", eyebrow: "INFRA", description: "サーバー・SSOT移行", icon: Rocket },
]

const tabIds = new Set<SalesTab>(tabItems.map((tab) => tab.id))
const externalGuiIds = new Set<SalesTab>(["directus", "analytics", "keystatic", "supabaseStudio"])

const localeLabels: Record<string, { country: string; language: string }> = {
  ja: { country: "日本", language: "日本語" },
  en: { country: "英語圏", language: "English" },
  ko: { country: "韓国", language: "한국어" },
  zh: { country: "中国", language: "简体中文" },
  de: { country: "ドイツ", language: "Deutsch" },
  fr: { country: "フランス", language: "Français" },
  es: { country: "スペイン", language: "Español" },
  pt: { country: "ポルトガル", language: "Português" },
  ru: { country: "ロシア", language: "Русский" },
  ar: { country: "アラブ圏", language: "العربية" },
  vi: { country: "ベトナム", language: "Tiếng Việt" },
  id: { country: "インドネシア", language: "Bahasa Indonesia" },
}

function normalizeTab(value: string | null): SalesTab {
  if (value === "batches" || value === "workspace") return "automation"
  if (value === "videoPipeline") return "reportVideoStudio"
  return value && tabIds.has(value as SalesTab) ? (value as SalesTab) : "automation"
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function statusLabel(status: string): string {
  if (status === "ready") return "正常稼働"
  if (status === "degraded") return "一部遅延・要確認"
  return status
}

function withPath(baseUrl: string, pathname: string): string {
  try {
    const url = new URL(baseUrl)
    if (!url.pathname || url.pathname === "/") url.pathname = pathname
    return url.toString()
  } catch (error) {
    console.error("[sales-command-center] invalid external GUI URL:", error)
    return baseUrl
  }
}

function toolUrl(data: SalesDashboardData, slug: string): string | null {
  return data.toolConnections.find((tool) => tool.slug === slug)?.baseUrl ?? null
}

function resolveExternalGuiUrl(tab: SalesTab, data: SalesDashboardData): string {
  if (tab === "directus") return withPath(toolUrl(data, "directus") ?? "https://directus.paradigmjp.com", "/admin")
  if (tab === "keystatic") return toolUrl(data, "keystatic") ?? "https://keystatic.paradigmjp.com"
  if (tab === "supabaseStudio") return process.env.NEXT_PUBLIC_SUPABASE_STUDIO_URL?.trim() || "https://supabase.com/dashboard/project/yihdmgtxiqfdgdueolub"
  if (tab === "analytics") return toolUrl(data, "metabase") ?? process.env.METABASE_BASE_URL?.trim() ?? "https://metabase.paradigmjp.com"
  return "/"
}

function MetricTile({ label, value, helper, delay }: { label: string; value: string; helper: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="relative min-w-0 overflow-hidden rounded-xl border border-zinc-200/60 bg-white/60 p-4 shadow-sm backdrop-blur-md transition-colors hover:border-zinc-300"
    >
      <p className="truncate text-xs font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-900">{value}</p>
      <p className="mt-1 truncate text-xs font-medium text-zinc-400">{helper}</p>
    </motion.div>
  )
}

function ExternalGuiPanel({ tab, data }: { tab: SalesTab; data: SalesDashboardData }) {
  const item = tabItems.find((candidate) => candidate.id === tab) ?? tabItems[0]
  const Icon = item.icon
  const url = resolveExternalGuiUrl(tab, data)
  return (
    <section className="p-6 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50">
              <Icon className="h-5 w-5 text-zinc-900" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{item.eyebrow}</p>
              <h3 className="text-xl font-bold tracking-tight text-zinc-950">{item.label}</h3>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600">
            外部OSSの詳細編集画面を開きます。営業データの同期と復旧は、この上のRevenue OS同期パネルから実行します。
          </p>
          <p className="mt-2 break-all font-mono text-xs text-zinc-500">{url}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-bold text-white shadow-sm hover:bg-zinc-800"
        >
          正規GUIを開く
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </section>
  )
}

export function SalesCommandCenter({ data, locale }: SalesCommandCenterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<SalesTab>(() => normalizeTab(searchParams.get("tab")))

  useEffect(() => {
    const nextTab = normalizeTab(searchParams.get("tab"))
    setActiveTab((current) => (current === nextTab ? current : nextTab))
  }, [searchParams])

  function changeTab(tab: SalesTab) {
    const tabConfig = tabItems.find((t) => t.id === tab)
    if (tabConfig?.externalGui) {
      const url = resolveExternalGuiUrl(tab, data)
      window.open(url, "_blank", "noopener,noreferrer")
      return
    }
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function handleLocaleChange(newLocale: string) {
    const segments = pathname.split("/")
    if (segments.length > 1 && segments[1] === locale) {
      segments[1] = newLocale
      const params = new URLSearchParams(searchParams.toString())
      const query = params.toString()
      router.push(query ? `${segments.join("/")}?${query}` : segments.join("/"))
      return
    }
    router.push(`/${newLocale}/admin/sales`)
  }

  const localeMeta = localeLabels[locale] ?? localeLabels.ja
  const activeTabItem = tabItems.find((item) => item.id === activeTab) ?? tabItems[0]
  const ActiveTabIcon = activeTabItem.icon

  const metrics = useMemo(
    () => [
      {
        label: "稼働ツール",
        value: `${data.toolConnections.filter((tool) => ["connected", "ready", "online", "active"].includes(tool.status)).length}/${data.toolConnections.length}`,
        helper: "OSS / API 接続",
      },
      { label: "30日売上", value: `¥${data.kpis.revenue30d.toLocaleString()}`, helper: "商談パイプライン" },
      { label: "生成待ち", value: data.kpis.reportReady.toLocaleString(), helper: "待機中アセット" },
    ],
    [data.kpis.reportReady, data.kpis.revenue30d, data.toolConnections],
  )

  const renderTab = () => {
    switch (activeTab) {
      case "automation":
        return <SalesAutomationPanel data={data} />
      case "operator":
        return <OperatorPanel data={data} />
      case "agentTeam":
        return <SalesAgentTeamPanel data={data} />
      case "reportVideoStudio":
        return <SalesReportVideoStudioPanel data={data} />
      case "proVideoStudio":
        return <SalesProVideoStudioPanel data={data} />
      case "directus":
        return (
          <div className="grid gap-5 p-6 sm:p-8">
            <ExternalStudioSyncPanel data={data} studio="directus" />
            <ExternalGuiPanel tab="directus" data={data} />
          </div>
        )
      case "keystatic":
        return (
          <div className="grid gap-5 p-6 sm:p-8">
            <ExternalStudioSyncPanel data={data} studio="keystatic" />
            <SalesTemplateWorkbenchPanel
              data={data}
              initialAssetType="astro_demo_site"
              heading="Astro / Keystatic"
              title="デモサイト制作ワークベンチ"
              description="Astroデモサイトの構成、Difyプロンプト、Keystatic編集用の本文をSupabase SSOT上で管理します。外部CMSは補助画面として扱い、営業ダッシュボード側でプレビューと保存まで行います。"
            />
          </div>
        )
      case "supabaseStudio":
        return (
          <SalesTemplateWorkbenchPanel
            data={data}
            initialAssetType="diagnostic_report"
            heading="Report SSOT"
            title="診断レポート制作ワークベンチ"
            description="診断レポートの構成、品質基準、Dify選定条件、顧客向け文面をSupabase SSOTで編集します。PostgRESTやSupabase Studioへ誤誘導せず、この画面で実運用のレポート素材を扱います。"
          />
        )
      case "crm":
        return <CrmPanel data={data} />
      case "analytics":
        return (
          <div className="grid gap-5 p-6 sm:p-8">
            <ExternalGuiPanel tab="analytics" data={data} />
          </div>
        )
      case "integrations":
        return <IntegrationsPanel data={data} />
      case "prompts":
        return <AiPromptsPanel data={data} />
      case "audit":
        return <SalesOperationsAuditPanel data={data} />
      case "docs":
        return <SalesDocsPanel data={data} />
      case "migration":
        return <MigrationPanel data={data} />
      default:
        return <SalesAutomationPanel data={data} />
    }
  }

  return (
    <main className="min-h-screen bg-[#fafafa] font-sans text-zinc-950 selection:bg-indigo-100">
      <Toaster richColors position="top-center" />
      <div className="mx-auto grid min-h-screen w-full max-w-[1720px] gap-0 border-x border-zinc-100 bg-white shadow-[0_0_40px_rgba(0,0,0,0.03)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="relative z-20 hidden min-h-screen border-r border-zinc-100 bg-white/80 backdrop-blur-xl lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="relative px-6 py-8">
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-500">Paradigm</p>
              <h1 className="bg-gradient-to-br from-zinc-900 to-zinc-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                Revenue OS
              </h1>
              <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500">
                Supabase SSOTを中心に、リストから商談までの全工程を一元管理。
              </p>
            </div>

            <nav className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3" aria-label="営業機能">
              <div className="space-y-0.5">
                {tabItems.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  const externalUrl = tab.externalGui ? resolveExternalGuiUrl(tab.id, data) : null
                  const itemClassName = `group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-200 ${
                    isActive ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                  }`
                  const itemContent = (
                    <>
                      {isActive && <motion.div layoutId="activeTab" className="absolute inset-0 rounded-lg bg-zinc-900" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                      <Icon className={`relative z-10 h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-700"}`} />
                      <span className="relative z-10 min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold tracking-wide">{tab.label}</span>
                        <span className={`mt-0.5 block truncate text-[9px] font-medium uppercase tracking-widest ${isActive ? "text-zinc-400" : "text-zinc-400"}`}>
                          {tab.eyebrow}
                        </span>
                      </span>
                      {externalUrl ? <ExternalLink className="relative z-10 h-3.5 w-3.5 text-zinc-400" aria-hidden /> : isActive && <ChevronRight className="relative z-10 h-3.5 w-3.5 text-zinc-400" />}
                    </>
                  )
                  if (externalUrl) {
                    return (
                      <a
                        key={tab.id}
                        href={externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={itemClassName}
                        aria-current={isActive ? "page" : undefined}
                      >
                        {itemContent}
                      </a>
                    )
                  }
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => changeTab(tab.id)}
                      className={itemClassName}
                      aria-pressed={isActive}
                    >
                      {itemContent}
                    </button>
                  )
                })}
              </div>
            </nav>

            <div className="p-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                  <div className="rounded border border-zinc-100 bg-white p-1 shadow-sm">
                    <Globe2 className="h-3.5 w-3.5 text-indigo-500" />
                  </div>
                  {localeMeta.country}
                </div>
                <select
                  value={locale}
                  onChange={(event) => handleLocaleChange(event.target.value)}
                  className="mt-2.5 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-zinc-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  aria-label="言語・地域を切り替え"
                >
                  {Object.entries(localeLabels).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.language} ({meta.country})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </aside>

        <section className="relative min-w-0 bg-[#fafafa]">
          <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 px-6 py-5 backdrop-blur-xl sm:px-10">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-zinc-500">
                  <span className="rounded-md bg-zinc-100 px-2 py-1 text-zinc-600">Revenue OS</span>
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    {statusLabel(data.status)}
                  </span>
                  <span className="font-mono text-[11px] tracking-tight text-zinc-400">Sync: {formatGeneratedAt(data.generatedAt)}</span>
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <ActiveTabIcon className="h-6 w-6 text-zinc-900" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{activeTabItem.label}</h2>
                    <p className="mt-1 truncate text-sm font-medium text-zinc-500">{activeTabItem.description}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 xl:w-[480px]">
                {metrics.map((metric, index) => (
                  <MetricTile key={metric.label} {...metric} delay={index * 0.1} />
                ))}
              </div>
            </div>

            <label className="mt-5 block lg:hidden">
              <span className="sr-only">営業機能を選択</span>
              <select
                value={activeTab}
                onChange={(event) => {
                  changeTab(event.target.value as SalesTab)
                }}
                className="h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-bold shadow-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                aria-label="営業機能を選択"
              >
                {tabItems.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label} - {tab.description}
                  </option>
                ))}
              </select>
            </label>
          </header>

          <div className="min-w-0 p-6 sm:p-10" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                {renderTab()}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>
    </main>
  )
}
