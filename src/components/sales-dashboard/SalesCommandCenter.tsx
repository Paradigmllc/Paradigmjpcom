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
import { SalesDocsPanel } from "./SalesDocsPanel";
import { SalesOperationsAuditPanel } from "./SalesOperationsAuditPanel";
import { SalesTemplateWorkbenchPanel } from "./SalesTemplateWorkbenchPanel";
import { SalesVideoPipelinePanel } from "./SalesVideoPipelinePanel";
import type { SalesDashboardData } from "@/lib/sales/dashboard";
import { REPORT_LOCALES } from "@/lib/sales/routing";

type SalesTab =
  | "overview"
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

const tabItems: Array<{
  id: SalesTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "overview",
    label: "司令塔",
    description: "数字と実行状況",
    icon: LayoutDashboard,
  },
  {
    id: "automation",
    label: "CSV・自動診断",
    description: "投入からカルテ生成",
    icon: UploadCloud,
  },
  {
    id: "workspace",
    label: "リスト作業場",
    description: "NocoDB相当の一括確認",
    icon: Table2,
  },
  {
    id: "operator",
    label: "オペレーター",
    description: "人間確認キュー",
    icon: ListChecks,
  },
  {
    id: "agentTeam",
    label: "AIチーム",
    description: "Hermes / Telegram / Slack",
    icon: Bot,
  },
  {
    id: "templates",
    label: "テンプレ",
    description: "GUI確認・編集・選定テスト",
    icon: Sparkles,
  },
  {
    id: "videoPipeline",
    label: "動画制作",
    description: "営業動画と納品サブスク",
    icon: Video,
  },
  {
    id: "crm",
    label: "CRM",
    description: "Twenty商談・企業カルテ",
    icon: BriefcaseBusiness,
  },
  {
    id: "analytics",
    label: "分析",
    description: "Metabase KPI",
    icon: BarChart3,
  },
  {
    id: "integrations",
    label: "統合",
    description: "OSS/API接続状態",
    icon: Database,
  },
  {
    id: "audit",
    label: "運用監査",
    description: "安全制御と漏れ検知",
    icon: ShieldCheck,
  },
  {
    id: "docs",
    label: "使い方",
    description: "実務フロー",
    icon: FileText,
  },
  {
    id: "migration",
    label: "移行計画",
    description: "Notion脱却・SSOT化",
    icon: Rocket,
  },
];

const tabIds = new Set<SalesTab>(tabItems.map((tab) => tab.id));

function normalizeTab(value: string | null): SalesTab {
  return value && tabIds.has(value as SalesTab) ? (value as SalesTab) : "overview";
}

const localeLabels: Record<string, { country: string; language: string }> = {
  ja: { country: "日本", language: "日本語" },
  en: { country: "Global / US", language: "English" },
  ko: { country: "韓国", language: "한국어" },
  zh: { country: "中国・台湾", language: "中文" },
  de: { country: "ドイツ", language: "Deutsch" },
  fr: { country: "フランス", language: "Français" },
  es: { country: "スペイン語圏", language: "Español" },
  it: { country: "イタリア", language: "Italiano" },
  pt: { country: "ポルトガル語圏", language: "Português" },
  th: { country: "タイ", language: "ไทย" },
  vi: { country: "ベトナム", language: "Tiếng Việt" },
  id: { country: "インドネシア", language: "Bahasa Indonesia" },
};

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
    if (tab === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const localeMeta = localeLabels[locale] ?? localeLabels.ja;
  const activeTabItem = tabItems.find((item) => item.id === activeTab) ?? tabItems[0];
  const ActiveTabIcon = activeTabItem.icon;

  const heroStats = useMemo(
    () => [
      {
        label: "統合ツール",
        value: `${data.toolConnections.filter((tool) => ["connected", "ready", "online"].includes(tool.status)).length}/${data.toolConnections.length}`,
        helper: "SSOT接続済み",
      },
      {
        label: "30日売上",
        value: `¥${data.kpis.revenue30d.toLocaleString()}`,
        helper: "成約・継続売上",
      },
      {
        label: "生成待ち",
        value: data.kpis.reportReady.toLocaleString(),
        helper: "診断・資料・動画",
      },
    ],
    [data.kpis.reportReady, data.kpis.revenue30d, data.toolConnections],
  );

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewPanel data={data} />;
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
    <main className="min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-950">
      <Toaster richColors position="top-center" />
      <section className="mx-auto flex w-full max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <header className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(340px,430px)] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span>Paradigm Sales Command</span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                  {data.status}
                </span>
                <span>{new Date(data.generatedAt).toLocaleString("ja-JP")}</span>
              </div>
              <h1 className="mt-3 text-balance text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                Salesforce x Apollo.io風 営業ダッシュボード
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 sm:text-base">
                Supabase OSSをSSOTに、CSV投入、企業カルテ生成、診断レポート、Twenty CRM、NocoDB、
                Metabase、n8n、フォーム営業、動画制作ラインを一画面で管理します。
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="col-span-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:col-span-3">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Globe2 className="h-4 w-4" />
                  管理スコープ
                </div>
                <p className="mt-2 text-lg font-semibold">{localeMeta.country}</p>
                <p className="text-xs text-zinc-500">
                  /{locale} | {localeMeta.language} | {REPORT_LOCALES.length}言語分離
                </p>
              </div>
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-3">
                  <p className="text-xs text-zinc-500">{stat.label}</p>
                  <p className="mt-1 text-xl font-bold sm:text-2xl">{stat.value}</p>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-500">{stat.helper}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <div className="sticky top-0 z-20 -mx-3 mt-4 border-y border-zinc-200 bg-zinc-50/95 px-3 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:mx-0 md:border-y-0 md:bg-transparent md:px-0 md:py-0">
          <label className="block md:hidden">
            <span className="mb-2 block text-xs font-semibold text-zinc-600">表示する機能</span>
            <select
              value={activeTab}
              onChange={(event) => changeTab(event.target.value as SalesTab)}
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold shadow-sm outline-none focus:border-zinc-900"
              aria-label="営業ダッシュボードの機能を選択"
            >
              {tabItems.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label} - {tab.description}
                </option>
              ))}
            </select>
          </label>

          <nav className="hidden gap-2 overflow-x-auto pb-2 md:mt-5 md:flex" aria-label="営業ダッシュボード機能">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => changeTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                  }`}
                  aria-pressed={isActive}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 md:hidden">
            <ActiveTabIcon className="h-4 w-4 shrink-0" />
            <span className="font-semibold text-zinc-900">{activeTabItem.label}</span>
            <span className="min-w-0 truncate">{activeTabItem.description}</span>
          </div>
        </div>

        <section className="mt-4 min-w-0 sm:mt-6" aria-live="polite">
          {renderTab()}
        </section>
      </section>
    </main>
  );
}
