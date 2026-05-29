"use client"

import { AlertTriangle, CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react"
import type { DashboardAuditCheck, DashboardAuditStatus, SalesDashboardData } from "@/lib/sales/dashboard"

function tone(status: DashboardAuditStatus): string {
  if (status === "ready") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (status === "warning") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-rose-200 bg-rose-50 text-rose-800"
}

function label(status: DashboardAuditStatus): string {
  if (status === "ready") return "OK"
  if (status === "warning") return "要確認"
  return "停止要因"
}

function icon(status: DashboardAuditStatus) {
  if (status === "ready") return CheckCircle2
  if (status === "warning") return AlertTriangle
  return CircleAlert
}

function AuditCheckRow({ check }: { check: DashboardAuditCheck }) {
  const Icon = icon(check.status)
  return (
    <div className="grid gap-3 border-t border-zinc-100 py-3 lg:grid-cols-[180px_1fr_1fr]">
      <div className="flex items-start gap-2">
        <Icon className={check.status === "ready" ? "text-emerald-600" : check.status === "warning" ? "text-amber-600" : "text-rose-600"} size={16} aria-hidden />
        <div>
          <div className="text-sm font-semibold text-zinc-950">{check.label}</div>
          <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone(check.status)}`}>
            {label(check.status)}
          </span>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-zinc-600">{check.detail}</p>
      <p className="text-sm leading-relaxed text-zinc-500">{check.action}</p>
    </div>
  )
}

export function SalesOperationsAuditPanel({ data }: { data: SalesDashboardData }) {
  const audit = data.operationalAudit
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <ShieldCheck size={17} aria-hidden />
              実務運用監査
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">
              CSV投入から企業カルテ生成、Twenty HOME同期、診断レポート、フォーム営業dry-runまでを本番運用目線で判定します。
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:min-w-[420px]">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-xs text-zinc-500">運用スコア</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{audit.score}%</div>
            </div>
            <div className="rounded-md border border-rose-100 bg-rose-50 p-3">
              <div className="text-xs text-rose-700">停止要因</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-rose-800">{audit.blockers}</div>
            </div>
            <div className="rounded-md border border-amber-100 bg-amber-50 p-3">
              <div className="text-xs text-amber-800">要確認</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-amber-900">{audit.warnings}</div>
            </div>
            <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
              <div className="text-xs text-emerald-700">OK</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-emerald-800">{audit.ready}</div>
            </div>
          </div>
        </div>
      </section>

      {audit.sections.map((section) => (
        <section key={section.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="pb-3">
            <h2 className="text-base font-semibold text-zinc-950">{section.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">{section.summary}</p>
          </div>
          {section.checks.map((check) => (
            <AuditCheckRow key={check.id} check={check} />
          ))}
        </section>
      ))}
    </div>
  )
}
