"use client"

import {
  Gauge,
  ListChecks,
  PhoneCall,
  Send,
  Target,
  Users,
} from "lucide-react"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { formatNumber, formatYen } from "./format-utils"
import { KpiCard, externalUrlForCompany } from "./sales-panels-shared"

export function OverviewPanel({ data }: { data: SalesDashboardData }) {
  const hotCompanies = data.companies.filter((company) => company.isHotLead).slice(0, 6)
  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="総リード" value={formatNumber(data.kpis.totalLeads)} helper="Supabase sales_companies" icon={Users} tone="bg-amber-100 text-amber-700" />
        <KpiCard label="HOT" value={formatNumber(data.kpis.hotLeads)} helper="閲覧や反応が強い営業先" icon={Target} tone="bg-rose-100 text-rose-700" />
        <KpiCard label="送信待ち" value={formatNumber(data.kpis.reportReady)} helper="フォーム営業キュー候補" icon={Send} tone="bg-amber-100 text-amber-800" />
        <KpiCard label="手動確認" value={formatNumber(data.kpis.manualQueue)} helper="Appsmith向け作業" icon={ListChecks} tone="bg-violet-100 text-violet-700" />
        <KpiCard label="7日商談" value={formatNumber(data.kpis.meetings7d)} helper="Cal.com登録数" icon={PhoneCall} tone="bg-emerald-100 text-emerald-700" />
        <KpiCard label="MRR" value={formatYen(data.kpis.mrr)} helper={`${data.kpis.activeCustomers} active customers`} icon={Gauge} tone="bg-zinc-100 text-zinc-800" />
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-950">HOTリード</h2>
          <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">{hotCompanies.length}件表示</span>
        </div>
        <div className="mt-4 divide-y divide-zinc-100">
          {hotCompanies.length === 0 ? (
            <p className="py-6 text-sm text-zinc-500">HOTリードはまだありません。</p>
          ) : hotCompanies.map((company) => (
            <a key={company.id} href={externalUrlForCompany(company)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 py-3">
              <span>
                <span className="block text-sm font-medium text-zinc-950">{company.companyName}</span>
                <span className="text-xs text-zinc-500">{company.domain}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-zinc-950">{company.reportViews}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
