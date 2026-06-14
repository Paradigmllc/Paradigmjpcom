"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  BarChart3,
  BriefcaseBusiness,
  CircleAlert,
  Database,
  ExternalLink,
  FileText,
  Globe2,
  Menu,
  Plug,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react"
import { Toaster } from "sonner"

import { CrmPanel, IntegrationsPanel } from "./SalesCommandPanels"
import { SalesOperationsAuditPanel } from "./SalesOperationsAuditPanel"
import { AiPromptsPanel } from "./AiPromptsPanel"
import { AssetManagementPanel } from "./AssetManagementPanel"
import { TemplateManagementPanel } from "./TemplateManagementPanel"
import { AnalyticsPanel } from "./SalesAnalyticsPanel"
import { SearxngSearchPanel } from "./SearxngSearchPanel"
import { SalesFailedJobsPanel } from "./SalesFailedJobsPanel"
import type { SalesDashboardData } from "@/lib/sales/dashboard"

type SalesTab = "crm" | "integrations" | "audit" | "templates" | "prompts" | "assets" | "analytics" | "searxng" | "failedJobs"

type SalesCommandCenterProps = {
  data: SalesDashboardData
  locale: string
}

type TabItem = {
  id: SalesTab
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const tabItems: TabItem[] = [
  { id: "crm", label: "CRM", description: "Twenty連携・商談管理", icon: BriefcaseBusiness },
  { id: "integrations", label: "統合監査", description: "API/OSS接続状況", icon: Plug },
  { id: "audit", label: "運用監査", description: "パイプライン監視", icon: ShieldCheck },
  { id: "templates", label: "テンプレート", description: "レポートテンプレート管理", icon: FileText },
  { id: "prompts", label: "AIプロンプト", description: "Dify/DeepSeek管理", icon: Sparkles },
  { id: "searxng", label: "リスト収集", description: "ブラウザ検索・リード生成", icon: Search },
  { id: "assets", label: "アセット", description: "動画・デモ管理", icon: Database },
  { id: "analytics", label: "分析", description: "パイプライン分析", icon: BarChart3 },
  { id: "failedJobs", label: "失敗ジョブ", description: "エンリッチメント失敗監視", icon: CircleAlert },
]

const externalTools = [
  { label: "Chatwoot", url: "https://chatwoot.paradigmjp.com" },
  { label: "Directus", url: "https://directus.paradigmjp.com/admin" },
  { label: "Keystatic", url: "https://keystatic.paradigmjp.com" },
  { label: "Supabase", url: "https://supabase.com/dashboard" },
  { label: "Metabase", url: "https://metabase.paradigmjp.com" },
  { label: "HyperFrames", url: "https://hyperframes.paradigmjp.com" },
]

const tabIds = new Set<SalesTab>(tabItems.map((tab) => tab.id))

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
  return value && tabIds.has(value as SalesTab) ? (value as SalesTab) : "crm"
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

function MetricTile({ label, value, helper, delay, urgent }: { label: string; value: string; helper: string; delay: number; urgent?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={`relative min-w-0 overflow-hidden rounded-xl border p-4 shadow-sm backdrop-blur-md transition-colors ${urgent ? "border-rose-200 bg-rose-50/60 hover:border-rose-300" : "border-zinc-200/60 bg-white/60 hover:border-zinc-300"}`}
    >
      <p className={`truncate text-xs font-semibold uppercase ${urgent ? "text-rose-600" : "text-zinc-500"}`}>{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tracking-tight ${urgent ? "text-rose-700" : "text-zinc-900"}`}>{value}</p>
      <p className={`mt-1 truncate text-xs font-medium ${urgent ? "text-rose-500" : "text-zinc-400"}`}>{helper}</p>
    </motion.div>
  )
}

export function SalesCommandCenter({ data, locale }: SalesCommandCenterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<SalesTab>(() => normalizeTab(searchParams.get("tab")))
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const nextTab = normalizeTab(searchParams.get("tab"))
    setActiveTab((current) => (current === nextTab ? current : nextTab))
  }, [searchParams])

  function changeTab(tab: SalesTab) {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    params.delete("sub")
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
    () => {
      const needsReview = data.companies.filter((c) => c.pipelineStatus === "manual_queue" || (c.leadScoreTier === "hot" && c.pipelineStatus !== "report_ready")).length
      const staleCount = data.companies.filter((c) => !c.lastEnrichedAt && c.pipelineStatus !== "pending").length
      return [
      {
        label: "稼働ツール",
        value: `${data.toolConnections.filter((tool) => ["connected", "ready", "online", "active"].includes(tool.status)).length}/${data.toolConnections.length}`,
        helper: "OSS / API 接続",
      },
      { label: "30日売上", value: `¥${data.kpis.revenue30d.toLocaleString()}`, helper: "商談パイプライン" },
      { label: "生成待ち", value: data.kpis.reportReady.toLocaleString(), helper: "待機中アセット" },
      { label: "要対応", value: needsReview.toString(), helper: `確認待ち・HOT未処理${staleCount > 0 ? ` / ${staleCount}件未エンリッチ` : ""}`, urgent: needsReview > 0 },
      ]
    },
    [data.kpis.reportReady, data.kpis.revenue30d, data.toolConnections, data.companies],
  )

  const renderTab = () => {
    switch (activeTab) {
      case "crm":          return <CrmPanel data={data} />
      case "integrations": return <IntegrationsPanel data={data} />
      case "audit":        return <SalesOperationsAuditPanel data={data} />
      case "templates":    return <TemplateManagementPanel data={data} />
      case "prompts":      return <AiPromptsPanel data={data} />
      case "searxng":      return <SearxngSearchPanel data={data} />
      case "assets":       return <AssetManagementPanel data={data} />
      case "analytics":    return <AnalyticsPanel data={data} />
      case "failedJobs":   return <SalesFailedJobsPanel />
      default:             return <CrmPanel data={data} />
    }
  }

  return (
    <main className="min-h-dvh bg-[#fafafa] font-sans text-zinc-950 selection:bg-violet-100">
      <Toaster richColors position="top-center" />

      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2.5 lg:hidden">
        <button onClick={() => setMobileMenuOpen(true)} className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100" aria-label="メニューを開く">
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-zinc-900">Revenue OS</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {statusLabel(data.status)}
        </span>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <p className="text-sm font-bold text-zinc-900">Revenue OS</p>
              <button onClick={() => setMobileMenuOpen(false)} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100"><X className="h-4 w-4" /></button>
            </div>
            <nav className="py-2">
              {tabItems.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button key={tab.id} type="button"
                    onClick={() => { changeTab(tab.id); setMobileMenuOpen(false) }}
                    className={`flex w-full items-center gap-2.5 px-5 py-2.5 text-left text-sm ${isActive ? "bg-zinc-100 font-bold text-zinc-900" : "font-medium text-zinc-600 hover:bg-zinc-50"}`}>
                    <Icon className="h-4 w-4 shrink-0 text-zinc-500" />
                    <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                    <span className="text-[10px] text-zinc-400">{tab.description}</span>
                  </button>
                )
              })}
              <div className="mt-2 border-t border-zinc-100 pt-2">
                <p className="px-5 text-[10px] font-semibold uppercase text-zinc-400">外部ツール</p>
                {externalTools.map((tool) => (
                  <a key={tool.label} href={tool.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-2 text-sm text-zinc-500 hover:bg-zinc-50">
                    {tool.label} <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </a>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}

      <div className="mx-auto grid min-h-dvh w-full max-w-[1720px] gap-0 border-x border-zinc-100 bg-white shadow-[0_0_40px_rgba(0,0,0,0.03)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="relative z-20 hidden min-h-dvh border-r border-zinc-100 bg-white/80 backdrop-blur-xl lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="relative px-6 py-8">
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.3em] text-violet-500">Paradigm</p>
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
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => changeTab(tab.id)}
                      className={`group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-200 ${
                        isActive ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                      }`}
                      aria-pressed={isActive}
                    >
                      {isActive && <motion.div layoutId="activeTab" className="absolute inset-0 rounded-lg bg-zinc-900" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />}
                      <Icon className={`relative z-10 h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-700"}`} />
                      <span className="relative z-10 min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold tracking-wide">{tab.label}</span>
                        <span className="mt-0.5 block truncate text-[9px] text-zinc-400">{tab.description}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 border-t border-zinc-100 pt-3">
                <p className="px-3 text-[9px] font-semibold uppercase tracking-widest text-zinc-400">外部ツール</p>
                <div className="mt-1.5 space-y-0.5">
                  {externalTools.map((tool) => (
                    <a key={tool.label} href={tool.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 transition-colors">
                      {tool.label} <ExternalLink className="h-3 w-3 text-zinc-400" />
                    </a>
                  ))}
                </div>
              </div>
            </nav>

            <div className="p-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                  <div className="rounded border border-zinc-100 bg-white p-1 shadow-sm">
                    <Globe2 className="h-3.5 w-3.5 text-violet-500" />
                  </div>
                  {localeMeta.country}
                </div>
                <select
                  value={locale}
                  onChange={(event) => handleLocaleChange(event.target.value)}
                  className="mt-2.5 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-zinc-700 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
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
          <header className="sticky top-0 z-30 hidden border-b border-zinc-200/80 bg-white/80 px-6 py-5 backdrop-blur-xl lg:block sm:px-10">
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <ActiveTabIcon className="h-5 w-5 text-zinc-900" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{activeTabItem.label}</h2>
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

          <div className="min-w-0 p-4 sm:p-6 lg:p-10" aria-live="polite">
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
