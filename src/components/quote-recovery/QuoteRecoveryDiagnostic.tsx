"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, CheckCircle2, FileSpreadsheet, LoaderCircle, ShieldCheck, Sparkles, Upload } from "lucide-react"
import { Toaster, toast } from "sonner"
import { diagnoseQuotes, parseQuoteCsv } from "@/lib/quote-recovery/diagnosis"
import type { QuoteInput, QuoteRecoveryDiagnosis } from "@/lib/quote-recovery/types"

const SAMPLE_CSV = `見積番号,顧客名,見積日,見積金額,担当者,最終接触日,次回アクション日,ステータス
Q-2401,東都精機株式会社,2026/04/08,4800000,田中,2026/05/10,,商談中
Q-2402,関西搬送システム,2026/05/15,1250000,佐藤,2026/06/01,2026/08/10,商談中
Q-2403,北陸パーツ工業,2026/03/20,8200000,,, ,商談中
Q-2404,大和設備株式会社,2026/07/10,680000,高橋,2026/07/22,,商談中
Q-2405,中央オートメーション,2026/02/12,3100000,田中,2026/03/01,,失注`

type ApiResponse = { ok: true; diagnosis: QuoteRecoveryDiagnosis; measurement: "saved" | "unavailable" | "failed" }

function formatYen(value: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value)
}

function isApiResponse(value: unknown): value is ApiResponse {
  return Boolean(value && typeof value === "object" && "ok" in value && value.ok === true && "diagnosis" in value)
}

function responseError(value: unknown): string {
  if (value && typeof value === "object" && "error" in value && typeof value.error === "string") return value.error
  return "診断に失敗しました。CSVの内容を確認してください。"
}

async function decodeCsvFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer()
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch (error) {
    console.warn("[quote-recovery] UTF-8 decode failed; retrying as Shift_JIS:", error instanceof Error ? error.message : String(error))
    return new TextDecoder("shift_jis").decode(bytes)
  }
}

const PRIORITY_STYLE = {
  urgent: "bg-rose-50 text-rose-700 ring-rose-200",
  high: "bg-amber-50 text-amber-700 ring-amber-200",
  watch: "bg-slate-100 text-slate-600 ring-slate-200",
  closed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
} as const

const PRIORITY_LABEL = { urgent: "至急", high: "優先", watch: "確認", closed: "完了" } as const

export function QuoteRecoveryDiagnostic() {
  const inputRef = useRef<HTMLInputElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [diagnosis, setDiagnosis] = useState<QuoteRecoveryDiagnosis | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseWarnings, setParseWarnings] = useState<string[]>([])

  async function runDiagnosis(rows: QuoteInput[], source: "sample" | "csv") {
    setStatus("loading")
    try {
      const response = await fetch("/api/quote-recovery/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, source }),
      })
      const body: unknown = await response.json()
      if (!response.ok || !isApiResponse(body)) throw new Error(responseError(body))
      setDiagnosis(body.diagnosis)
      setStatus("ready")
      if (body.measurement === "failed") toast.warning("診断は完了しましたが、計測ログを保存できませんでした")
      else toast.success("放置見積の診断が完了しました")
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100)
    } catch (error) {
      console.error("[quote-recovery] diagnosis failed:", error)
      setStatus("error")
      toast.error(error instanceof Error ? error.message : "診断に失敗しました")
    }
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("CSVファイルを選択してください")
      return
    }
    if (file.size > 1_000_000) {
      toast.error("ファイルは1MB以下、1,000件以内にしてください")
      return
    }
    try {
      const text = await decodeCsvFile(file)
      const parsed = parseQuoteCsv(text)
      setParseWarnings(parsed.failures.slice(0, 5).map((failure) => `${failure.row}行目: ${failure.message}`))
      if (parsed.rows.length === 0) throw new Error(parsed.failures[0]?.message ?? "有効な見積データがありません")
      setFileName(file.name)
      await runDiagnosis(parsed.rows, "csv")
    } catch (error) {
      console.error("[quote-recovery] CSV parse failed:", error)
      setStatus("error")
      toast.error(error instanceof Error ? error.message : "CSVを読み込めませんでした")
    } finally {
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function loadSample() {
    const parsed = parseQuoteCsv(SAMPLE_CSV)
    setFileName("サンプル見積データ.csv")
    setParseWarnings(parsed.failures.map((failure) => `${failure.row}行目: ${failure.message}`))
    await runDiagnosis(parsed.rows, "sample")
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <section id="diagnostic" className="border-y border-slate-200 bg-slate-50 px-5 py-16 sm:px-8 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">FREE DIAGNOSTIC</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">見積CSVを入れるだけ。<br />放置金額を60秒で可視化。</h2>
              <p className="mt-5 text-sm leading-7 text-slate-600">見積番号・顧客名・見積日・金額の4列があれば診断できます。担当者や最終接触日がなくても、まず優先順位を算出します。</p>
              <ul className="mt-7 space-y-3 text-sm text-slate-700">
                {["元のCSVと見積明細はDBに保存しません", "診断ログは件数・合計金額など集計値のみ", "メール送信や既存システムの変更は行いません"].map((item) => (
                  <li key={item} className="flex gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />{item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-8">
              <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" aria-label="見積CSVを選択" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file) }} />
              <button type="button" onClick={() => inputRef.current?.click()} disabled={status === "loading"} className="group flex min-h-60 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-violet-400 hover:bg-violet-50/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20 disabled:cursor-wait disabled:opacity-60">
                {status === "loading" ? <LoaderCircle className="size-10 animate-spin text-violet-600" aria-hidden="true" /> : <Upload className="size-10 text-violet-600 transition group-hover:-translate-y-1" aria-hidden="true" />}
                <span className="mt-5 text-base font-bold text-slate-950">{status === "loading" ? "診断しています…" : "見積CSVを選択"}</span>
                <span className="mt-2 text-xs leading-5 text-slate-500">CSV / 最大1MB / 1,000件まで</span>
              </button>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => void loadSample()} disabled={status === "loading"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20 disabled:opacity-50">
                  <Sparkles aria-hidden="true" />サンプルで試す
                </button>
                <span className="text-xs text-slate-500">必須列: 見積番号 / 顧客名 / 見積日 / 見積金額</span>
              </div>
              {fileName && <p className="mt-4 flex items-center gap-2 text-xs text-slate-600"><FileSpreadsheet className="size-4" aria-hidden="true" />{fileName}</p>}
              {parseWarnings.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-800" role="status">
                  <p className="flex items-center gap-2 font-bold"><AlertTriangle className="size-4" aria-hidden="true" />除外・確認が必要な行</p>
                  {parseWarnings.map((warning) => <p key={warning}>{warning}</p>)}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {diagnosis && (
        <section ref={resultRef} className="scroll-mt-24 bg-white px-5 py-16 sm:px-8 lg:py-24" aria-labelledby="diagnosis-result-title">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">DIAGNOSIS RESULT</p><h2 id="diagnosis-result-title" className="mt-3 text-3xl font-bold tracking-tight text-slate-950">回収候補が見つかりました</h2></div>
              <p className="text-xs text-slate-500">{diagnosis.sourceRows}件を診断 / スコアは経過日数・金額・次回予定・担当者のルールベース</p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["進行中の見積", `${diagnosis.openQuotes}件`, formatYen(diagnosis.openAmount)],
                ["14日以上放置", `${diagnosis.staleQuotes}件`, formatYen(diagnosis.staleAmount)],
                ["次回予定なし", `${diagnosis.missingNextAction}件`, "フォロー漏れ候補"],
                ["担当者なし", `${diagnosis.unassignedQuotes}件`, "引き継ぎ漏れ候補"],
              ].map(([label, value, note]) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-2 text-xs text-slate-600">{note}</p></div>)}
            </div>
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <caption className="sr-only">回収優先度の高い見積一覧</caption>
                  <thead className="bg-slate-950 text-xs text-white"><tr><th className="px-5 py-4">優先度</th><th className="px-5 py-4">顧客 / 見積番号</th><th className="px-5 py-4">見積金額</th><th className="px-5 py-4">経過</th><th className="px-5 py-4">判定理由</th><th className="px-5 py-4">担当</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {diagnosis.candidates.slice(0, 10).map((quote) => <tr key={quote.quoteId} className="bg-white hover:bg-slate-50"><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${PRIORITY_STYLE[quote.priority]}`}>{PRIORITY_LABEL[quote.priority]}</span></td><td className="px-5 py-4"><p className="font-bold text-slate-950">{quote.companyName}</p><p className="mt-1 text-xs text-slate-500">{quote.quoteId}</p></td><td className="px-5 py-4 font-semibold text-slate-950">{formatYen(quote.amount)}</td><td className="px-5 py-4 text-slate-700">{quote.ageDays}日</td><td className="max-w-xs px-5 py-4 text-xs leading-5 text-slate-600">{quote.reasons.join(" / ") || "定期確認"}</td><td className="px-5 py-4 text-slate-700">{quote.owner ?? "未設定"}</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-5">
              {diagnosis.buckets.map((bucket) => <div key={bucket.label} className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold text-slate-500">{bucket.label}</p><p className="mt-2 font-bold text-slate-950">{bucket.count}件</p><p className="mt-1 text-xs text-slate-600">{formatYen(bucket.amount)}</p></div>)}
            </div>
            <div className="mt-14 grid gap-8 rounded-3xl bg-slate-950 p-6 text-white sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div><CheckCircle2 className="text-emerald-400" aria-hidden="true" /><h2 className="mt-5 text-2xl font-bold">診断結果を、そのまま継続運用へ。</h2><p className="mt-4 text-sm leading-7 text-slate-300">契約後は見積明細・担当・次回アクション・接触履歴を組織専用ワークスペースへ保存。CSVを更新するたびに回収優先順位を再計算します。</p><p className="mt-5 text-xs font-semibold text-violet-300">無料パイロットなし・Stripe月額決済・いつでも請求ポータルから管理</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[{ name: "Starter", price: "¥29,800", detail: "3名・月2,000件" }, { name: "Team", price: "¥49,800", detail: "10名・月10,000件" }].map((plan) => (
                  <div key={plan.name} className="rounded-2xl bg-white p-5 text-slate-950 sm:p-6"><p className="text-sm font-bold text-violet-600">{plan.name}</p><p className="mt-3 text-2xl font-bold">{plan.price}<span className="text-xs font-medium text-slate-500"> / 月</span></p><p className="mt-2 text-xs text-slate-500">{plan.detail}</p><Link href="/ja/quote-recovery/login?mode=signup" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700">契約アカウントを作成<ArrowRight className="size-4" /></Link></div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
