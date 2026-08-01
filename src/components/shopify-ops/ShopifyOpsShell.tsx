"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { BarChart3, Boxes, LayoutDashboard, LoaderCircle, Store, Video } from "lucide-react"
import { Toaster, toast } from "sonner"
import {
  createContentAction,
  updateContentStatusAction,
  updateProductAction,
  upsertDailyMetricAction,
} from "@/app/[locale]/admin/shopify/actions"
import type { ShopifyOpsActionResult } from "@/app/[locale]/admin/shopify/actions"
import type { ShopifyOpsDashboard } from "@/lib/shopify-ops/types"
import { ShopifyOverview } from "./ShopifyOverview"
import { ShopifyProductsPanel } from "./ShopifyProductsPanel"
import { ShopifyContentPanel } from "./ShopifyContentPanel"
import { ShopifyMetricsPanel } from "./ShopifyMetricsPanel"

type TabId = "overview" | "products" | "content" | "metrics"
type Action = (formData: FormData) => Promise<ShopifyOpsActionResult>
type SubmitAction = (formData: FormData) => Promise<void>

const tabs = [
  { id: "overview" as const, label: "全体", icon: LayoutDashboard },
  { id: "products" as const, label: "商品", icon: Boxes },
  { id: "content" as const, label: "コンテンツ", icon: Video },
  { id: "metrics" as const, label: "KPI", icon: BarChart3 },
]

function formattedDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
}

export function ShopifyOpsShell({ dashboard, locale }: { dashboard: ShopifyOpsDashboard; locale: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function submit(action: Action): SubmitAction {
    return async (formData) => {
      await new Promise<void>((resolve) => {
        startTransition(async () => {
          const result = await action(formData)
          if (result.ok) {
            toast.success(result.message)
            router.refresh()
          } else {
            console.error("[ShopifyOpsShell] action failed:", result.error)
            toast.error(result.error)
          }
          resolve()
        })
      })
    }
  }

  const content = activeTab === "overview"
    ? <ShopifyOverview dashboard={dashboard} />
    : activeTab === "products"
      ? <ShopifyProductsPanel products={dashboard.products} locale={locale} submit={submit(updateProductAction)} />
      : activeTab === "content"
        ? <ShopifyContentPanel items={dashboard.contentItems} products={dashboard.products} locale={locale} create={submit(createContentAction)} updateStatus={submit(updateContentStatusAction)} />
        : <ShopifyMetricsPanel dashboard={dashboard} locale={locale} submit={submit(upsertDailyMetricAction)} />

  return (
    <main className="min-h-dvh bg-[#f7f7f5] text-zinc-950">
      <Toaster richColors position="top-center" />
      {isPending && (
        <div className="fixed inset-x-0 top-0 z-[70] flex h-1 items-center overflow-hidden bg-violet-100" aria-live="polite">
          <motion.div className="h-full w-1/3 bg-violet-600" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
          <span className="sr-only">更新中</span>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white"><Store className="h-5 w-5" /></div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight sm:text-base">Tiny Shops of Japan</p>
              <p className="truncate text-[11px] font-medium text-zinc-500">Shopify Operations OS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:inline-flex ${dashboard.storeConnection.configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {dashboard.storeConnection.configured ? "Shopify接続済み" : "Shopify未接続"}
            </span>
            <Link href="/admin" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50">CMS管理</Link>
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8" aria-label="Shopify運営機能">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} aria-pressed={active} className={`relative flex min-w-fit items-center gap-2 px-3 py-3 text-sm font-bold ${active ? "text-zinc-950" : "text-zinc-500 hover:text-zinc-800"}`}>
                <Icon className="h-4 w-4" />{tab.label}
                {active && <motion.span layoutId="shopify-tab" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-violet-600" />}
              </button>
            )
          })}
        </nav>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Foreign customer commerce</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">海外向けストア運営</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">軽量・高知覚価値の商品を、実写中心の短尺動画と計測可能な購入導線で販売します。</p>
          </div>
          <p className="text-xs text-zinc-400">最終同期 {formattedDate(dashboard.generatedAt)}</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            {isPending && <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-violet-700"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> 保存して再集計しています</div>}
            {content}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  )
}
