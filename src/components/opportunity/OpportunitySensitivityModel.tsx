"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateJapanEntryScenario,
  type JapanEntryProjection,
} from "@/lib/sales/japan-entry-projection";

function usd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function OpportunitySensitivityModel({
  projection,
  locale,
}: {
  projection: JapanEntryProjection;
  locale: string;
}) {
  const isJa = locale === "ja";
  const baseAssumptions = projection.assumptions;
  const [averageOrderValue, setAverageOrderValue] = useState(
    baseAssumptions.averageOrderValueUsd,
  );
  const [conversionRate, setConversionRate] = useState(
    baseAssumptions.conversionRate,
  );
  const [grossMargin, setGrossMargin] = useState(baseAssumptions.grossMargin);
  const scenario = useMemo(
    () =>
      calculateJapanEntryScenario(
        projection.estimatedMonthlyVisits,
        {
          ...baseAssumptions,
          averageOrderValueUsd: averageOrderValue,
          conversionRate,
          grossMargin,
        },
        "base",
      ),
    [
      averageOrderValue,
      baseAssumptions,
      conversionRate,
      grossMargin,
      projection.estimatedMonthlyVisits,
    ],
  );
  const rows = scenario.horizons.map((row) => ({
    month: `${row.horizon}m`,
    net: row.cumulativeNetBenefitUsd,
    grossProfit: row.cumulativeGrossProfitUsd,
  }));
  const month12 = scenario.horizons.find((row) => row.horizon === 12);
  const payback =
    scenario.months.find((row) => row.cumulativeNetBenefitUsd >= 0)?.month ??
    null;

  return (
    <section
      className="border-y border-zinc-200 bg-zinc-50 px-5 py-16 print:break-before-page"
      aria-labelledby="sensitivity-title"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-700">
              Decision sensitivity
            </p>
            <h2
              id="sensitivity-title"
              className="mt-3 text-3xl font-semibold tracking-tight"
            >
              {isJa
                ? "自社数値で前提を検証"
                : "Stress-test the case with your economics"}
            </h2>
          </div>
          <p className="text-sm leading-7 text-zinc-600">
            {isJa
              ? "下記は確定値ではありません。平均単価、CVR、粗利率を自社実績へ置き換えると、6・12・24か月の事業性が即時に再計算されます。"
              : "These are not confirmed results. Replace average order value, conversion and margin with first-party figures to recalculate the 6, 12 and 24-month case."}
          </p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <RangeField
              label={
                isJa ? "平均単価 / 契約価値" : "Average order / contract value"
              }
              value={averageOrderValue}
              min={Math.max(
                1,
                Math.round(baseAssumptions.averageOrderValueUsd * 0.4),
              )}
              max={Math.max(
                10,
                Math.round(baseAssumptions.averageOrderValueUsd * 2.5),
              )}
              step={1}
              display={usd(averageOrderValue)}
              onChange={setAverageOrderValue}
            />
            <RangeField
              label={isJa ? "コンバージョン率" : "Conversion rate"}
              value={conversionRate * 100}
              min={Math.max(0.01, baseAssumptions.conversionRate * 100 * 0.35)}
              max={baseAssumptions.conversionRate * 100 * 2.5}
              step={0.01}
              display={`${(conversionRate * 100).toFixed(2)}%`}
              onChange={(value) => setConversionRate(value / 100)}
            />
            <RangeField
              label={isJa ? "粗利率" : "Gross margin"}
              value={grossMargin * 100}
              min={15}
              max={95}
              step={1}
              display={`${(grossMargin * 100).toFixed(0)}%`}
              onChange={(value) => setGrossMargin(value / 100)}
            />
            <button
              type="button"
              onClick={() => {
                setAverageOrderValue(baseAssumptions.averageOrderValueUsd);
                setConversionRate(baseAssumptions.conversionRate);
                setGrossMargin(baseAssumptions.grossMargin);
              }}
              className="mt-2 text-xs font-semibold text-red-700 underline underline-offset-4"
            >
              {isJa ? "モデル初期値へ戻す" : "Reset model assumptions"}
            </button>
          </div>
          <div className="rounded-2xl bg-zinc-950 p-6 text-white shadow-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <Result
                label={isJa ? "12か月純便益" : "12-month net benefit"}
                value={month12 ? usd(month12.cumulativeNetBenefitUsd) : "—"}
              />
              <Result
                label="12-month ROI"
                value={month12 ? `${month12.roiPercent}%` : "—"}
              />
              <Result
                label={isJa ? "回収月" : "Payback"}
                value={
                  payback
                    ? `${payback} ${isJa ? "か月" : "months"}`
                    : `>24 ${isJa ? "か月" : "months"}`
                }
              />
            </div>
            <div
              className="mt-6 h-64"
              role="img"
              aria-label={
                isJa
                  ? "感度分析の累積粗利と純便益"
                  : "Sensitivity chart for cumulative gross profit and net benefit"
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows}>
                  <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#a1a1aa" />
                  <YAxis
                    tickFormatter={(value) => compact(Number(value))}
                    stroke="#a1a1aa"
                  />
                  <Tooltip
                    formatter={(value) => usd(Number(value))}
                    contentStyle={{
                      background: "#18181b",
                      border: "1px solid #52525b",
                    }}
                  />
                  <Bar
                    dataKey="grossProfit"
                    name={isJa ? "累積粗利" : "Gross profit"}
                    fill="#a1a1aa"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="net"
                    name={isJa ? "純便益" : "Net benefit"}
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          {isJa
            ? "算式: 公開ランク帯からの推定アクセス × 日本比率の段階的増加 × CVR × 単価 × 粗利率 − 初期費用・継続費用。ブラウザ内の試算であり保存されません。"
            : "Formula: modeled visits × phased Japan share × conversion × order value × margin, less setup and continuation fees. This browser-only scenario is not saved."}
        </p>
      </div>
    </section>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mb-6 block">
      <span className="flex items-center justify-between gap-3 text-sm font-medium">
        <span>{label}</span>
        <strong>{display}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-red-700"
      />
    </label>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
