"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  ClipboardCheck,
  Database,
  FileText,
  Gauge,
  Globe2,
  LayoutDashboard,
  ListChecks,
  Rocket,
  ShieldCheck,
  Sparkles,
  Table2,
  UploadCloud,
  Video,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Toaster } from "sonner";

import {
  AnalyticsPanel,
  CrmPanel,
  IntegrationsPanel,
  MigrationPanel,
  OperatorPanel,
  OverviewPanel,
  WorkspacePanel,
} from "./SalesCommandPanels";
import { SalesAgentTeamPanel } from "./SalesAgentTeamPanel";
import { SalesAutomationPanel } from "./SalesAutomationPanel";
import { SalesBatchOpsPanel } from "./SalesBatchOpsPanel";
import { SalesDocsPanel } from "./SalesDocsPanel";
import { SalesOperationsAuditPanel } from "./SalesOperationsAuditPanel";
import { SalesTemplateWorkbenchPanel } from "./SalesTemplateWorkbenchPanel";
import { SalesVideoPipelinePanel } from "./SalesVideoPipelinePanel";
import type { SalesDashboardData } from "@/lib/sales/dashboard";
import { REPORT_LOCALES } from "@/lib/sales/routing";

type SalesTab =
  | "overview"
  | "batches"
  | "automation"
  | "workspace"
  | "operator"
  | "agentTeam"
  | "videoPipeline"
  | "keystatic"
  | "directus"
  | "supabaseStudio"
  | "crm"
  | "analytics"
  | "integrations"
  | "audit"
  | "docs"
  | "migration";

type SalesCommandCenterProps = {
  data: SalesDashboardData;
  locale: string;
};

type TabItem = {
  id: SalesTab;
  label: string;
  eyebrow: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

const tabItems: TabItem[] = [
  { id: "overview", label: "司令塔", eyebrow: "Command", description: "全体KPIと優先リード", icon: LayoutDashboard },
  { id: "batches", label: "月次処理", eyebrow: "Batch Ops", description: "数万件リストを送信候補へ圧縮", icon: Gauge },
  { id: "automation", label: "CSV・自動診断", eyebrow: "Intake", description: "投入からカルテ生成", icon: UploadCloud },
  { id: "workspace", label: "リスト作業場", eyebrow: "List Ops", description: "抽出・確認・一括整理", icon: Table2 },
  { id: "operator", label: "オペレーター", eyebrow: "Queue", description: "人間確認が必要な作業", icon: ListChecks },
  { id: "agentTeam", label: "AIチーム", eyebrow: "Agents", description: "Hermes / Telegram / Slack", icon: Bot },
  { id: "directus", label: "資料・スライド", eyebrow: "Directus", description: "Slidev / Gotenberg 管理", icon: Sparkles },
  { id: "keystatic", label: "デモサイト管理", eyebrow: "Keystatic", description: "AstroデモとLP", icon: Globe2 },
  { id: "supabaseStudio", label: "診断レポート", eyebrow: "Supabase Studio", description: "SSOTデータ直結の管理", icon: Database },
  { id: "videoPipeline", label: "動画制作", eyebrow: "Video Studio", description: "営業動画と納品動画", icon: Video },
  { id: "crm", label: "CRM設定", eyebrow: "Twenty", description: "表示列・選択肢マスター", icon: BriefcaseBusiness },
  { id: "analytics", label: "分析", eyebrow: "Metabase", description: "営業KPIとボトルネック", icon: BarChart3 },
  { id: "integrations", label: "統合", eyebrow: "OSS / API", description: "接続・残量・未設定", icon: Database },
  { id: "audit", label: "運用監査", eyebrow: "Guardrails", description: "安全制御と漏れ検知", icon: ShieldCheck },
  { id: "docs", label: "使い方", eyebrow: "Runbook", description: "実務フローと判断基準", icon: FileText },
  { id: "migration", label: "移行計画", eyebrow: "Infrastructure", description: "サーバー・SSOT移行", icon: Rocket },
];

const tabIds = new Set<SalesTab>(tabItems.map((tab) => tab.id));

const localeLabels: Record<string, { country: string; language: string }> = {
  ja: { country: "日本", language: "日本語" },
  en: { country: "米国・グローバル", language: "English" },
  // ... other locales mapped as before
};

function normalizeTab(value: string | null): SalesTab {
  return value && tabIds.has(value as SalesTab) ? (value as SalesTab) : "overview";
}

function formatGeneratedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: string): string {
  if (status === "ready") return "正常稼働";
  if (status === "degraded") return "一部遅延・要確認";
  return status;
}

function MetricTile({ label, value, helper, delay }: { label: string; value: string; helper: string; delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="min-w-0 rounded-xl border border-zinc-200/60 bg-white/60 p-4 shadow-sm backdrop-blur-md relative overflow-hidden group hover:border-zinc-300 transition-colors"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <p className="truncate text-xs font-semibold uppercase tracking-wider text-zinc-500 relative z-10">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-900 relative z-10">{value}</p>
      <p className="mt-1 truncate text-xs font-medium text-zinc-400 relative z-10">{helper}</p>
    </motion.div>
  );
}

export function SalesCommandCenter({ data, locale }: SalesCommandCenterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SalesTab>(() => normalizeTab(searchParams.get("tab")));
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  useEffect(() => {
    const nextTab = normalizeTab(searchParams.get("tab"));
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [searchParams]);

  function changeTab(tab: SalesTab) {
    if (tab === "videoPipeline") {
      window.open(`/${locale}/studio`, "_blank", "noopener,noreferrer");
      return;
    }
    if (tab === "directus") {
      window.open(`https://directus.paradigmjp.com`, "_blank", "noopener,noreferrer");
      return;
    }
    if (tab === "keystatic") {
      window.open(`https://demo.paradigmjp.com/keystatic`, "_blank", "noopener,noreferrer");
      return;
    }
    if (tab === "supabaseStudio") {
      window.open(`https://supabase.appexx.me/project/default/editor`, "_blank", "noopener,noreferrer");
      return;
    }
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const localeMeta = localeLabels[locale] ?? { country: "日本", language: "日本語" };
  const activeTabItem = tabItems.find((item) => item.id === activeTab) ?? tabItems[0];
  const ActiveTabIcon = activeTabItem.icon;

  const metrics = useMemo(
    () => [
      {
        label: "稼働ツール",
        value: `${data.toolConnections.filter((tool) => ["connected", "ready", "online", "active"].includes(tool.status)).length}/${data.toolConnections.length}`,
        helper: "OSS / API Connections",
      },
      { label: "30日売上", value: `¥${data.kpis.revenue30d.toLocaleString()}`, helper: "Pipeline Revenue" },
      { label: "生成待ち", value: data.kpis.reportReady.toLocaleString(), helper: "Queued Assets" },
    ],
    [data.kpis.reportReady, data.kpis.revenue30d, data.toolConnections],
  );

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <OverviewPanel data={data} />;
      case "batches": return <SalesBatchOpsPanel data={data} />;
      case "automation": return <SalesAutomationPanel data={data} />;
      case "workspace": return <WorkspacePanel data={data} />;
      case "operator": return <OperatorPanel data={data} />;
      case "agentTeam": return <SalesAgentTeamPanel data={data} />;
      case "videoPipeline": return <SalesVideoPipelinePanel data={data} />;
      case "crm": return <CrmPanel data={data} />;
      case "analytics": return <AnalyticsPanel data={data} />;
      case "integrations": return <IntegrationsPanel data={data} />;
      case "audit": return <SalesOperationsAuditPanel data={data} />;
      case "docs": return <SalesDocsPanel data={data} />;
      case "migration": return <MigrationPanel data={data} />;
      default: return <OverviewPanel data={data} />;
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-950 font-sans selection:bg-indigo-100">
      <Toaster richColors position="top-center" />
      <div className="mx-auto grid w-full max-w-[1720px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)] bg-white min-h-screen shadow-[0_0_40px_rgba(0,0,0,0.03)] border-x border-zinc-100">
        
        {/* PREMIUM SIDEBAR */}
        <aside 
          className="hidden min-h-screen border-r border-zinc-100 bg-white/80 backdrop-blur-xl lg:block relative z-20"
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="px-6 py-8 relative">
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-500 mb-2">Paradigm</p>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 bg-clip-text text-transparent bg-gradient-to-br from-zinc-900 to-zinc-600">
                  Revenue OS
                </h1>
                <p className="mt-3 text-xs font-medium leading-relaxed text-zinc-500">
                  Supabase SSOTを中心に、リストから商談までの全工程を一元管理。
                </p>
              </motion.div>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-6 custom-scrollbar" aria-label="営業機能">
              <div className="space-y-1">
                {tabItems.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  if (tab.id === "videoPipeline" || tab.id === "keystatic" || tab.id === "supabaseStudio" || tab.id === "directus") {
                    const href = tab.id === "videoPipeline" 
                      ? `/${locale}/studio` 
                      : tab.id === "directus"
                        ? "https://directus.paradigmjp.com"
                      : tab.id === "keystatic"
                        ? "https://demo.paradigmjp.com/keystatic"
                        : "https://supabase.appexx.me/project/default/editor";
                    return (
                      <a
                        key={tab.id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group relative flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left transition-all duration-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900`}
                      >
                        <div className="relative z-10 flex items-center justify-center">
                          <Icon className={`h-[18px] w-[18px] shrink-0 transition-transform duration-300 text-zinc-400 group-hover:text-zinc-700`} />
                        </div>
                        <span className="relative z-10 min-w-0 flex-1">
                          <span className={`block truncate text-sm font-semibold tracking-wide`}>{tab.label}</span>
                          <span className={`block truncate text-[10px] mt-0.5 font-medium uppercase tracking-widest text-zinc-400`}>
                            {tab.eyebrow}
                          </span>
                        </span>
                        <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="relative z-10">
                           <ExternalLink className="h-4 w-4 text-zinc-400" />
                        </motion.div>
                      </a>
                    );
                  }

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => changeTab(tab.id)}
                      className={`group relative flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                        isActive 
                          ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10" 
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                      }`}
                      aria-pressed={isActive}
                    >
                      {isActive && (
                        <motion.div 
                          layoutId="activeTab"
                          className="absolute inset-0 rounded-xl bg-zinc-900"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <div className="relative z-10 flex items-center justify-center">
                        <Icon className={`h-[18px] w-[18px] shrink-0 transition-transform duration-300 ${isActive ? "scale-110 text-white" : "text-zinc-400 group-hover:text-zinc-700"}`} />
                      </div>
                      <span className="relative z-10 min-w-0 flex-1">
                        <span className={`block truncate text-sm font-semibold tracking-wide ${isActive ? "text-white" : ""}`}>{tab.label}</span>
                        <span className={`block truncate text-[10px] mt-0.5 font-medium uppercase tracking-widest ${isActive ? "text-zinc-400" : "text-zinc-400"}`}>
                          {tab.eyebrow}
                        </span>
                      </span>
                      {isActive && (
                        <motion.div 
                          initial={{ opacity: 0, x: -5 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          className="relative z-10"
                        >
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </motion.div>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="p-6">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 transition-colors hover:bg-zinc-50">
                <div className="flex items-center gap-2.5 text-xs font-bold text-zinc-700">
                  <div className="bg-white p-1 rounded shadow-sm border border-zinc-100">
                    <Globe2 className="h-3.5 w-3.5 text-indigo-500" />
                  </div>
                  {localeMeta.country}
                </div>
                <p className="mt-2 text-[11px] font-medium text-zinc-500">
                  Locale: {locale} / {localeMeta.language}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* PREMIUM MAIN AREA */}
        <section className="min-w-0 bg-[#fafafa] relative">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.015] pointer-events-none" />
          
          <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/80 px-6 py-5 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 sm:px-10">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center gap-3 text-xs font-medium text-zinc-500"
                >
                  <span className="bg-zinc-100 px-2 py-1 rounded-md text-zinc-600">Revenue OS</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 font-bold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {statusLabel(data.status)}
                  </span>
                  <span className="text-zinc-400 font-mono tracking-tight text-[11px]">Sync: {formatGeneratedAt(data.generatedAt)}</span>
                </motion.div>
                
                <div className="mt-5 flex items-center gap-4">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-zinc-200 shadow-sm"
                  >
                    <ActiveTabIcon className="h-6 w-6 text-zinc-900" />
                  </motion.div>
                  <div className="min-w-0">
                    <motion.h2 
                      key={activeTabItem.label}
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }}
                      className="truncate text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl"
                    >
                      {activeTabItem.label}
                    </motion.h2>
                    <motion.p 
                      key={activeTabItem.description}
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="mt-1 truncate text-sm font-medium text-zinc-500"
                    >
                      {activeTabItem.description}
                    </motion.p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 xl:w-[480px]">
                {metrics.map((metric, i) => (
                  <MetricTile key={metric.label} {...metric} delay={i * 0.1} />
                ))}
              </div>
            </div>

            <label className="mt-5 block lg:hidden">
              <span className="sr-only">営業機能を選択</span>
              <select
                value={activeTab}
                onChange={(event) => changeTab(event.target.value as SalesTab)}
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
                className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden"
              >
                {renderTab()}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>
    </main>
  );
}
