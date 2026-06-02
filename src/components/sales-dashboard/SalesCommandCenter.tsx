"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  | "templates"
  | "videoPipeline"
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
  {
    id: "overview",
    label: "司令塔",
    eyebrow: "Command",
    description: "全体KPIと優先リード",
    icon: LayoutDashboard,
  },
  {
    id: "batches",
    label: "月次処理",
    eyebrow: "Batch Ops",
    description: "数万件リストを送信候補へ圧縮",
    icon: Gauge,
  },
  {
    id: "automation",
    label: "CSV・自動診断",
    eyebrow: "Intake",
    description: "投入からカルテ生成",
    icon: UploadCloud,
  },
  {
    id: "workspace",
    label: "リスト作業場",
    eyebrow: "List Ops",
    description: "抽出・確認・一括整理",
    icon: Table2,
  },
  {
    id: "operator",
    label: "オペレーター",
    eyebrow: "Queue",
    description: "人間確認が必要な作業",
    icon: ListChecks,
  },
  {
    id: "agentTeam",
    label: "AIチーム",
    eyebrow: "Agents",
    description: "Hermes / Telegram / Slack",
    icon: Bot,
  },
  {
    id: "templates",
    label: "テンプレート",
    eyebrow: "Creative Logic",
    description: "文面・資料・動画の選定",
    icon: Sparkles,
  },
  {
    id: "videoPipeline",
    label: "動画制作",
    eyebrow: "Video Studio",
    description: "営業動画と納品動画",
    icon: Video,
  },
  {
    id: "crm",
    label: "CRM設定",
    eyebrow: "Twenty",
    description: "表示列・選択肢マスター",
    icon: BriefcaseBusiness,
  },
  {
    id: "analytics",
    label: "分析",
    eyebrow: "Metabase",
    description: "営業KPIとボトルネック",
    icon: BarChart3,
  },
  {
    id: "integrations",
    label: "統合",
    eyebrow: "OSS / API",
    description: "接続・残量・未設定",
    icon: Database,
  },
  {
    id: "audit",
    label: "運用監査",
    eyebrow: "Guardrails",
    description: "安全制御と漏れ検知",
    icon: ShieldCheck,
  },
  {
    id: "docs",
    label: "使い方",
    eyebrow: "Runbook",
    description: "実務フローと判断基準",
    icon: FileText,
  },
  {
    id: "migration",
    label: "移行計画",
    eyebrow: "Infrastructure",
    description: "サーバー・SSOT移行",
    icon: Rocket,
  },
];

const tabIds = new Set<SalesTab>(tabItems.map((tab) => tab.id));

const localeLabels: Record<string, { country: string; language: string }> = {
  ja: { country: "日本", language: "日本語" },
  en: { country: "米国・グローバル", language: "English" },
  ko: { country: "韓国", language: "한국어" },
  zh: { country: "中国・台湾", language: "中文" },
  de: { country: "ドイツ", language: "Deutsch" },
  fr: { country: "フランス", language: "Français" },
  es: { country: "スペイン語圏", language: "Español" },
  pt: { country: "ポルトガル語圏", language: "Português" },
  ru: { country: "ロシア語圏", language: "Русский" },
  ar: { country: "アラビア語圏", language: "العربية" },
  vi: { country: "ベトナム", language: "Tiếng Việt" },
  id: { country: "インドネシア", language: "Bahasa Indonesia" },
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
  if (status === "ready") return "正常";
  if (status === "degraded") return "要確認";
  return status;
}

function MetricTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <p className="truncate text-[11px] font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-950">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-zinc-500">{helper}</p>
    </div>
  );
}

export function SalesCommandCenter({ data, locale }: SalesCommandCenterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SalesTab>(() => normalizeTab(searchParams.get("tab")));

  useEffect(() => {
    const nextTab = normalizeTab(searchParams.get("tab"));
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [searchParams]);

  function changeTab(tab: SalesTab) {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "overview") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const localeMeta = localeLabels[locale] ?? localeLabels.ja;
  const activeTabItem = tabItems.find((item) => item.id === activeTab) ?? tabItems[0];
  const ActiveTabIcon = activeTabItem.icon;

  const metrics = useMemo(
    () => [
      {
        label: "稼働ツール",
        value: `${data.toolConnections.filter((tool) => ["connected", "ready", "online", "active"].includes(tool.status)).length}/${data.toolConnections.length}`,
        helper: "OSS / API",
      },
      { label: "30日売上", value: `¥${data.kpis.revenue30d.toLocaleString()}`, helper: "成約・継続" },
      { label: "生成待ち", value: data.kpis.reportReady.toLocaleString(), helper: "診断・資料・動画" },
    ],
    [data.kpis.reportReady, data.kpis.revenue30d, data.toolConnections],
  );

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewPanel data={data} />;
      case "batches":
        return <SalesBatchOpsPanel data={data} />;
      case "automation":
        return <SalesAutomationPanel data={data} />;
      case "workspace":
        return <WorkspacePanel data={data} />;
      case "operator":
        return <OperatorPanel data={data} />;
      case "agentTeam":
        return <SalesAgentTeamPanel data={data} />;
      case "templates":
        return <SalesTemplateWorkbenchPanel data={data} />;
      case "videoPipeline":
        return <SalesVideoPipelinePanel data={data} />;
      case "crm":
        return <CrmPanel data={data} />;
      case "analytics":
        return <AnalyticsPanel data={data} />;
      case "integrations":
        return <IntegrationsPanel data={data} />;
      case "audit":
        return <SalesOperationsAuditPanel data={data} />;
      case "docs":
        return <SalesDocsPanel data={data} />;
      case "migration":
        return <MigrationPanel data={data} />;
      default:
        return <OverviewPanel data={data} />;
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f7f8] text-zinc-950">
      <Toaster richColors position="top-center" />
      <div className="mx-auto grid w-full max-w-[1680px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden min-h-screen border-r border-zinc-200 bg-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-zinc-200 px-5 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Paradigm</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">Revenue OS</h1>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Supabase SSOTを中心に、リスト、診断、CRM、制作、分析を一つの運用面に集約します。
              </p>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="営業機能">
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => changeTab(tab.id)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      isActive ? "bg-zinc-950 text-white" : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                    }`}
                    aria-pressed={isActive}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{tab.label}</span>
                      <span className={`block truncate text-[11px] ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                        {tab.eyebrow}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-zinc-200 p-4">
              <div className="rounded-lg bg-zinc-50 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
                  <Globe2 className="h-4 w-4" />
                  {localeMeta.country}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  /{locale} ・ {localeMeta.language} ・ {REPORT_LOCALES.length}言語
                </p>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-[#f6f7f8]/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className="font-medium">Revenue OS</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                    {statusLabel(data.status)}
                  </span>
                  <span>{formatGeneratedAt(data.generatedAt)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <ActiveTabIcon className="h-5 w-5 shrink-0 text-zinc-500" />
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
                      {activeTabItem.label}
                    </h2>
                    <p className="truncate text-sm text-zinc-500">{activeTabItem.description}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 xl:w-[430px]">
                {metrics.map((metric) => (
                  <MetricTile key={metric.label} {...metric} />
                ))}
              </div>
            </div>

            <label className="mt-3 block lg:hidden">
              <span className="sr-only">営業機能を選択</span>
              <select
                value={activeTab}
                onChange={(event) => changeTab(event.target.value as SalesTab)}
                className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-zinc-900"
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

          <div className="min-w-0 px-4 py-5 sm:px-6 lg:py-6" aria-live="polite">
            {renderTab()}
          </div>
        </section>
      </div>
    </main>
  );
}
