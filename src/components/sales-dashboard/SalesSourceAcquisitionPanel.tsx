"use client"

import { useMemo, useState } from "react"
import { DatabaseZap, Filter, Layers3, Radar, ShieldCheck } from "lucide-react"
import type {
  SourceAcquisitionSourceMetric,
  SourceAcquisitionSummary,
  SourceAcquisitionTechMetric,
} from "@/lib/sales/source-acquisition"

type SortKey = "companyCount" | "detections" | "averageConfidence" | "technologyName"

function number(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value)
}

function date(value: string | null): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function Tile({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string
  helper: string
  icon: typeof DatabaseZap
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">{value}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{helper}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white">
          <Icon size={17} aria-hidden />
        </span>
      </div>
    </div>
  )
}

function SourceRow({ source }: { source: SourceAcquisitionSourceMetric }) {
  return (
    <tr className="border-t border-zinc-100">
      <td className="px-3 py-3">
        <div className="font-medium text-zinc-950">{source.label}</div>
        <div className="mt-1 text-[11px] text-zinc-500">{source.sourceSlug}</div>
      </td>
      <td className="px-3 py-3 text-xs text-zinc-600">{source.category}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-700">{number(source.total)}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-emerald-700">{number(source.collected)}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-rose-700">{number(source.missing + source.error)}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-950">{source.successRate}%</td>
      <td className="px-3 py-3 text-xs text-zinc-500">{date(source.lastMeasuredAt)}</td>
    </tr>
  )
}

function TechRow({ tech }: { tech: SourceAcquisitionTechMetric }) {
  return (
    <tr className="border-t border-zinc-100">
      <td className="px-3 py-3">
        <div className="font-medium text-zinc-950">{tech.technologyName}</div>
        <div className="mt-1 text-[11px] text-zinc-500">{tech.technologySlug}</div>
      </td>
      <td className="px-3 py-3 text-xs text-zinc-600">{tech.category}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-950">{number(tech.companyCount)}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-700">{number(tech.detections)}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-700">{tech.averageConfidence}%</td>
      <td className="px-3 py-3 text-xs text-zinc-500">{date(tech.lastDetectedAt)}</td>
    </tr>
  )
}

export function SalesSourceAcquisitionPanel({ summary }: { summary: SourceAcquisitionSummary }) {
  const [category, setCategory] = useState("all")
  const [technology, setTechnology] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("companyCount")

  const technologies = useMemo(
    () => summary.topTechnologies.map((item) => item.technologyName).sort((a, b) => a.localeCompare(b)),
    [summary.topTechnologies],
  )

  const filteredTech = useMemo(() => {
    const rows = summary.topTechnologies.filter((item) => {
      const matchCategory = category === "all" || item.category === category
      const matchTechnology = technology === "all" || item.technologyName === technology
      return matchCategory && matchTechnology
    })
    return [...rows].sort((a, b) => {
      if (sortKey === "technologyName") return a.technologyName.localeCompare(b.technologyName)
      return b[sortKey] - a[sortKey] || a.technologyName.localeCompare(b.technologyName)
    })
  }, [category, sortKey, summary.topTechnologies, technology])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="取得ログ"
          value={number(summary.totalRuns)}
          helper={`${number(summary.sourceTypes)}種類 / ${number(summary.companiesMeasured)}社を計測`}
          icon={DatabaseZap}
        />
        <Tile
          label="取得成功率"
          value={`${summary.successRate}%`}
          helper={`成功 ${number(summary.collected)} / 未取得・エラー ${number(summary.missing + summary.error)}`}
          icon={ShieldCheck}
        />
        <Tile
          label="Wappalyzer検出"
          value={number(summary.techDetectionsTotal)}
          helper={`${number(summary.technologiesTotal)}技術 / ${number(summary.techCompaniesTotal)}社`}
          icon={Radar}
        />
        <Tile
          label="技術カテゴリ"
          value={number(summary.techCategories.length)}
          helper={summary.techCategories.slice(0, 4).join(" / ") || "まだ検出がありません"}
          icon={Layers3}
        />
      </div>

      {summary.errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
          {summary.errors.join(" / ")}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">無料API / OSS 取得元別の成績</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                PageSpeed、Wappalyzer、gBizInfo、フォーム探索などの取得成否を、企業カルテ単位で集計しています。
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
              最新 {date(summary.latestMeasuredAt)}
            </span>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="min-w-[720px] w-full text-left">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">取得元</th>
                  <th className="px-3 py-2 font-medium">分類</th>
                  <th className="px-3 py-2 text-right font-medium">ログ</th>
                  <th className="px-3 py-2 text-right font-medium">成功</th>
                  <th className="px-3 py-2 text-right font-medium">未取得</th>
                  <th className="px-3 py-2 text-right font-medium">成功率</th>
                  <th className="px-3 py-2 font-medium">最終取得</th>
                </tr>
              </thead>
              <tbody>
                {summary.sourceMetrics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-zinc-500">
                      取得ログがまだありません。
                    </td>
                  </tr>
                ) : (
                  summary.sourceMetrics.map((source) => <SourceRow key={source.sourceSlug} source={source} />)
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Wappalyzer 技術スタック検出</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                JSON埋め込みではなくDB化済み。技術名・カテゴリ・信頼度で選択式ソートできます。
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="relative block">
                <Filter className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} aria-hidden />
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-7 text-xs outline-none focus:border-zinc-500"
                  aria-label="技術カテゴリで絞り込み"
                >
                  <option value="all">全カテゴリ</option>
                  {summary.techCategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <select
                value={technology}
                onChange={(event) => setTechnology(event.target.value)}
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs outline-none focus:border-zinc-500"
                aria-label="技術名で絞り込み"
              >
                <option value="all">全技術</option>
                {technologies.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs outline-none focus:border-zinc-500"
                aria-label="技術スタックの並び替え"
              >
                <option value="companyCount">企業数順</option>
                <option value="detections">検出数順</option>
                <option value="averageConfidence">信頼度順</option>
                <option value="technologyName">技術名順</option>
              </select>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="min-w-[680px] w-full text-left">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">技術</th>
                  <th className="px-3 py-2 font-medium">カテゴリ</th>
                  <th className="px-3 py-2 text-right font-medium">企業数</th>
                  <th className="px-3 py-2 text-right font-medium">検出数</th>
                  <th className="px-3 py-2 text-right font-medium">信頼度</th>
                  <th className="px-3 py-2 font-medium">最終検出</th>
                </tr>
              </thead>
              <tbody>
                {filteredTech.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-zinc-500">
                      条件に一致する技術スタックがありません。
                    </td>
                  </tr>
                ) : (
                  filteredTech.map((tech) => <TechRow key={`${tech.technologySlug}:${tech.category}`} tech={tech} />)
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
