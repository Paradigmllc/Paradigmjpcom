"use client"

import { useMemo, useState } from "react"
import { Filter } from "lucide-react"
import type { SourceAcquisitionTechMetric } from "@/lib/sales/source-acquisition"
import { TechRow, type SortKey } from "./source-acquisition-utils"

export function SourceAcquisitionTechTable({
  topTechnologies,
  techCategories,
}: {
  topTechnologies: SourceAcquisitionTechMetric[]
  techCategories: string[]
}) {
  const [techCategory, setTechCategory] = useState("all")
  const [technology, setTechnology] = useState("all")
  const [techSortKey, setTechSortKey] = useState<SortKey>("companyCount")

  const technologies = useMemo(
    () => topTechnologies.map((item) => item.technologyName).sort((a, b) => a.localeCompare(b)),
    [topTechnologies],
  )

  const filteredTech = useMemo(() => {
    const rows = topTechnologies.filter((item) => {
      const matchCategory = techCategory === "all" || item.category === techCategory
      const matchTechnology = technology === "all" || item.technologyName === technology
      return matchCategory && matchTechnology
    })
    return [...rows].sort((a, b) => {
      if (techSortKey === "technologyName") return a.technologyName.localeCompare(b.technologyName)
      return b[techSortKey] - a[techSortKey] || a.technologyName.localeCompare(b.technologyName)
    })
  }, [techCategory, techSortKey, topTechnologies, technology])

  return (
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
              value={techCategory}
              onChange={(event) => setTechCategory(event.target.value)}
              className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-7 text-xs outline-none focus:border-zinc-500"
              aria-label="技術カテゴリで絞り込み"
            >
              <option value="all">全カテゴリ</option>
              {techCategories.map((item) => (
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
            value={techSortKey}
            onChange={(event) => setTechSortKey(event.target.value as SortKey)}
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
  )
}
