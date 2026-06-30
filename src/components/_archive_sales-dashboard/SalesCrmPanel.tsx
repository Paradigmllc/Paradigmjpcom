"use client"

import { Activity, AlertTriangle, CheckCircle2, CircleAlert, ExternalLink } from "lucide-react"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { formatDate } from "./format-utils"
import { sortedEntries, BarList } from "./sales-panels-shared"
import { SalesCrmFieldSettingsPanel } from "./SalesCrmFieldSettingsPanel"

function readinessTone(status: string): string {
  if (status === "send_ready") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "review_required") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-rose-200 bg-rose-50 text-rose-800"
}

function readinessLabel(status: string): string {
  if (status === "send_ready") return "送信可能"
  if (status === "review_required") return "レビュー必須"
  return "ブロック"
}

function OperationsQueuePanel({ data }: { data: SalesDashboardData }) {
  const companies = data.companies
  const sendReady = companies.filter((company) => company.outreachReadiness.status === "send_ready").length
  const reviewRequired = companies.filter((company) => company.outreachReadiness.status === "review_required").length
  const blocked = companies.filter((company) => company.outreachReadiness.status === "blocked").length
  const topQueue = companies
    .filter((company) => company.outreachReadiness.status !== "send_ready")
    .sort((a, b) => {
      const priority = { blocked: 0, review_required: 1, send_ready: 2 } as const
      return priority[a.outreachReadiness.status] - priority[b.outreachReadiness.status]
    })
    .slice(0, 8)

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
            <CheckCircle2 size={16} aria-hidden />
            実務運用キュー
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            診断URL、フォームURL、根拠、正規化状態を見て、送信前に止めるべき会社を分けます。
          </p>
        </div>
        <div className="grid min-w-[260px] grid-cols-3 gap-2">
          <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2">
            <div className="text-[11px] font-medium text-emerald-700">送信可能</div>
            <div className="mt-1 text-lg font-semibold text-emerald-900">{sendReady}</div>
          </div>
          <div className="rounded-md border border-amber-100 bg-amber-50 p-2">
            <div className="text-[11px] font-medium text-amber-800">レビュー</div>
            <div className="mt-1 text-lg font-semibold text-amber-950">{reviewRequired}</div>
          </div>
          <div className="rounded-md border border-rose-100 bg-rose-50 p-2">
            <div className="text-[11px] font-medium text-rose-700">ブロック</div>
            <div className="mt-1 text-lg font-semibold text-rose-900">{blocked}</div>
          </div>
        </div>
      </div>

      <div className="mt-4 divide-y divide-zinc-100">
        {topQueue.length === 0 ? (
          <p className="py-8 text-sm text-zinc-500">確認が必要な会社はありません。</p>
        ) : topQueue.map((company) => {
          const readiness = company.outreachReadiness
          const Icon = readiness.status === "blocked" ? CircleAlert : AlertTriangle
          const reason = readiness.blockers[0] ?? readiness.warnings[0] ?? readiness.nextAction
          return (
            <div key={company.id} className="grid gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_130px_minmax(0,1fr)]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className={readiness.status === "blocked" ? "text-rose-600" : "text-amber-600"} size={15} aria-hidden />
                  <span className="truncate text-sm font-semibold text-zinc-950">{company.companyName}</span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                  <span className="truncate">{company.domain}</span>
                  {readiness.reportUrl ? (
                    <a href={readiness.reportUrl} target="_blank" rel="noopener noreferrer" aria-label="診断レポートを開く">
                      <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>
              </div>
              <div>
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${readinessTone(readiness.status)}`}>
                  {readinessLabel(readiness.status)}
                </span>
                <div className="mt-1 text-[11px] text-zinc-500">source {readiness.sourceScore}% / {readiness.collectedSources}件</div>
              </div>
              <div className="text-xs leading-relaxed text-zinc-600">
                <div>{reason}</div>
                <div className="mt-1 text-zinc-400">{readiness.nextAction}</div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function CrmPanel({ data }: { data: SalesDashboardData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <OperationsQueuePanel data={data} />
      </div>
      <SalesCrmFieldSettingsPanel
        fields={data.crmFieldConfig.fields}
        options={data.crmFieldConfig.options}
        fallbackUsed={data.crmFieldConfig.fallbackUsed}
        error={data.crmFieldConfig.error}
      />
      <BarList title="商談ステージ" rows={sortedEntries(data.stageCounts)} empty="商談データがありません。" />
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-950">最新アクティビティ</h2>
        <div className="mt-4 divide-y divide-zinc-100">
          {data.activities.length === 0 ? <p className="py-8 text-sm text-zinc-500">活動履歴はまだありません。</p> : data.activities.slice(0, 12).map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 py-3">
              <Activity className="mt-0.5 text-zinc-400" size={15} aria-hidden />
              <div>
                <div className="text-sm font-medium text-zinc-950">{activity.subject ?? activity.activityType}</div>
                <div className="mt-1 text-xs text-zinc-500">{activity.result ?? "記録"} / {formatDate(activity.occurredAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
