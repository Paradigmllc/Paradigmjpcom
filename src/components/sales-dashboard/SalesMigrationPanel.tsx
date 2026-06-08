"use client"

import { ArrowRight, HardDrive, ServerCog, WalletCards } from "lucide-react"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { formatYen } from "./format-utils"
import { statusTone } from "./sales-panels-shared"
import { ExternalLink } from "lucide-react"

export function MigrationPanel({ data }: { data: SalesDashboardData }) {
  const current = data.infrastructure.items.find((item) => item.role === "current")
  const target = data.infrastructure.items.find((item) => item.role === "target")
  const otherItems = data.infrastructure.items.filter((item) => item.role !== "current" && item.role !== "target")

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-950">サーバー全面移行</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              現在はDigitalOceanクレジットを使い、最終的にHetzner VPSへ集約する前提の移行計画です。
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <WalletCards size={13} aria-hidden />
            予算 {formatYen(data.infrastructure.budgetLimitYen)}/月
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          {[current, target].map((item) => item && (
            <div key={item.slug} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-zinc-500">{item.provider}</div>
                  <div className="mt-1 text-base font-semibold text-zinc-950">{item.title}</div>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] ${statusTone(item.status)}`}>{item.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-white p-2"><div className="text-zinc-500">CPU</div><div className="mt-1 font-semibold text-zinc-950">{item.cpuLabel ?? "-"}</div></div>
                <div className="rounded-md bg-white p-2"><div className="text-zinc-500">RAM</div><div className="mt-1 font-semibold text-zinc-950">{item.memoryLabel ?? "-"}</div></div>
                <div className="rounded-md bg-white p-2"><div className="text-zinc-500">Disk</div><div className="mt-1 font-semibold text-zinc-950">{item.diskLabel ?? "-"}</div></div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-600">{item.notes}</p>
              {item.publicUrl && (
                <a href={item.publicUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-zinc-950 underline-offset-2 hover:underline">
                  管理画面 <ExternalLink size={12} aria-hidden />
                </a>
              )}
            </div>
          ))}
          <div className="hidden items-center justify-center text-zinc-400 lg:flex">
            <ArrowRight size={22} aria-hidden />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {otherItems.map((item) => (
            <div key={item.slug} className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
                <HardDrive size={15} aria-hidden />
                {item.title}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-zinc-500">{item.notes}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <ServerCog size={16} aria-hidden />
          <h2 className="text-sm font-semibold text-zinc-950">次にやること</h2>
        </div>
        <div className="mt-4 space-y-3">
          {data.infrastructure.nextSteps.map((step, index) => (
            <div key={step} className="flex gap-3 rounded-md border border-zinc-100 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white">{index + 1}</span>
              <p className="text-sm leading-relaxed text-zinc-700">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
