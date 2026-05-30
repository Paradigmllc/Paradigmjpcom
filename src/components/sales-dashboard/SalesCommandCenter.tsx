"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  LayoutDashboard,
  ListChecks,
  MonitorCog,
  Palette,
  ServerCog,
  Sheet,
  ShieldCheck,
  UploadCloud,
} from "lucide-react"
import { Toaster } from "sonner"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { SalesAutomationPanel } from "./SalesAutomationPanel"
import { SalesAgentTeamPanel } from "./SalesAgentTeamPanel"
import { SalesDocsPanel } from "./SalesDocsPanel"
import { SalesOperationsAuditPanel } from "./SalesOperationsAuditPanel"
import { SalesTemplateWorkbenchPanel } from "./SalesTemplateWorkbenchPanel"
import {
  AnalyticsPanel,
  CrmPanel,
  IntegrationsPanel,
  MigrationPanel,
  OperatorPanel,
  OverviewPanel,
  WorkspacePanel,
  formatDate,
  formatYen,
  statusTone,
} from "./SalesCommandPanels"

type TabId =
  | "overview"
  | "automation"
  | "workspace"
  | "operator"
  | "agentTeam"
  | "templates"
  | "crm"
  | "analytics"
  | "integrations"
  | "audit"
  | "docs"
  | "migration"

interface Props {
  data: SalesDashboardData
}

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "司令塔", icon: LayoutDashboard },
  { id: "automation", label: "CSV・自動診断", icon: UploadCloud },
  { id: "workspace", label: "リスト作業場", icon: Sheet },
  { id: "operator", label: "オペレーター", icon: ListChecks },
  { id: "agentTeam", label: "AIチーム", icon: Bot },
  { id: "templates", label: "テンプレ", icon: Palette },
  { id: "crm", label: "CRM", icon: BriefcaseBusiness },
  { id: "analytics", label: "分析", icon: BarChart3 },
  { id: "integrations", label: "統合", icon: MonitorCog },
  { id: "audit", label: "運用監査", icon: ShieldCheck },
  { id: "docs", label: "使い方", icon: BookOpen },
  { id: "migration", label: "移行計画", icon: ServerCog },
]

export function SalesCommandCenter({ data }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const activeToolCount = data.toolConnections.filter((tool) => tool.status === "active").length
  const runningJobs = data.enrichmentJobs.filter((job) => job.status === "queued" || job.status === "running").length

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <Toaster richColors position="top-right" />
      <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500">
              <span>Paradigm Sales Command</span>
              <span className={`rounded-full px-2 py-1 ${statusTone(data.status)}`}>{data.status}</span>
              <span>{formatDate(data.generatedAt)}</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Salesforce x Apollo.io風 営業ダッシュボード
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">
              Supabase OSSをSSOTに、CSV投入、企業カルテ生成、診断レポート、Twenty CRM、NocoDB、Metabase、n8n、フォーム営業パイプラインを一画面で管理します。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-xs text-zinc-500">統合ツール</div>
              <div className="mt-1 text-xl font-semibold">{activeToolCount}/{data.toolConnections.length}</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-xs text-zinc-500">30日売上</div>
              <div className="mt-1 text-xl font-semibold">{formatYen(data.kpis.revenue30d)}</div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="text-xs text-zinc-500">生成待ち</div>
              <div className="mt-1 text-xl font-semibold">{runningJobs}</div>
            </div>
          </div>
        </header>

        {data.warnings.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {data.warnings.slice(0, 3).map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        )}

        <nav className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="営業ダッシュボード">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
                  isActive
                    ? "border-zinc-950 bg-zinc-950 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                }`}
                aria-label={`${tab.label}を表示`}
                aria-pressed={isActive}
              >
                <Icon size={16} aria-hidden />
                {tab.label}
              </button>
            )
          })}
        </nav>

        <motion.section
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-5"
        >
          {activeTab === "overview" && <OverviewPanel data={data} />}
          {activeTab === "automation" && <SalesAutomationPanel data={data} />}
          {activeTab === "workspace" && <WorkspacePanel data={data} />}
          {activeTab === "operator" && <OperatorPanel data={data} />}
          {activeTab === "agentTeam" && <SalesAgentTeamPanel data={data} />}
          {activeTab === "templates" && <SalesTemplateWorkbenchPanel data={data} />}
          {activeTab === "crm" && <CrmPanel data={data} />}
          {activeTab === "analytics" && <AnalyticsPanel data={data} />}
          {activeTab === "integrations" && <IntegrationsPanel data={data} />}
          {activeTab === "audit" && <SalesOperationsAuditPanel data={data} />}
          {activeTab === "docs" && <SalesDocsPanel data={data} />}
          {activeTab === "migration" && <MigrationPanel data={data} />}
        </motion.section>
      </div>
    </main>
  )
}
