"use client"

import { DatabaseZap, Layers3, Radar, ShieldCheck } from "lucide-react"
import type { SourceAcquisitionSummary } from "@/lib/sales/source-acquisition"
import { number, Tile } from "./source-acquisition-utils"

export function SourceAcquisitionHeader({ summary }: { summary: SourceAcquisitionSummary }) {
  return (
    <>
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
    </>
  )
}
