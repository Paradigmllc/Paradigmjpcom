import { CheckCircle2, ChevronRight, CircleDot, Globe2, Layers3, LoaderCircle, Play, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  type ManualWorkBatchQueueSummary,
  type ManualWorkBatchStatus,
} from "@/lib/sales/manual-japan-entry-batch-types"
import {
  MANUAL_SOURCE_ROLE_LABELS,
  type ManualLeadSourceCatalogRow,
} from "@/lib/sales/manual-japan-entry-source-ledger"

export type ManualWorkQueueState = Record<string, "waiting" | "processing" | "done" | "error">

const workflowSteps = [
  ["01", "企業確認", "海外SMB・市場優先度・企業別の商業根拠を判定"],
  ["02", "営業準備", "フォーム・初回文面・診断を生成"],
  ["03", "手動実行", "Twentyで確認し人が送信結果を記録"],
] as const

export function ManualWorkIntake({
  input,
  sourceSlug,
  sourcePageUrl,
  sources,
  selectedSource,
  queue,
  submitting,
  queueActive,
  batchStatus,
  queuePosition,
  queueSummary,
  urlCount,
  maxUrls,
  finished,
  batchError,
  canResume,
  onInputChange,
  onSourceChange,
  onSourcePageUrlChange,
  onStart,
  onResume,
}: {
  input: string
  sourceSlug: string
  sourcePageUrl: string
  sources: ManualLeadSourceCatalogRow[]
  selectedSource?: ManualLeadSourceCatalogRow
  queue: ManualWorkQueueState
  submitting: boolean
  queueActive: boolean
  batchStatus: ManualWorkBatchStatus | null
  queuePosition: number
  queueSummary: ManualWorkBatchQueueSummary
  urlCount: number
  maxUrls: number
  finished: number
  batchError: string | null
  canResume: boolean
  onInputChange: (value: string) => void
  onSourceChange: (value: string) => void
  onSourcePageUrlChange: (value: string) => void
  onStart: () => void
  onResume: () => void
}) {
  const queueEntries = Object.entries(queue)
  const progress = queueEntries.length ? Math.round((finished / queueEntries.length) * 100) : 0
  const invalidCount = urlCount > maxUrls

  return (
    <section id="intake" aria-labelledby="intake-heading" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)]">
      <div className="grid border-b border-slate-200 lg:grid-cols-[1fr_260px]">
        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Globe2 className="size-5" aria-hidden="true" /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">New analysis</p>
              <h2 id="intake-heading" className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-950">企業URLを入力</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">完全新規URLを最大500件、DBに保存したキューから3件ずつ安全に解析します。</p>
            </div>
          </div>
        </div>
        <div className="hidden border-l border-slate-200 bg-slate-50/80 px-5 py-4 lg:block">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">Execution policy</p>
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Layers3 className="size-4 text-emerald-600" />500件 × 最大20バッチ</div>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><CircleDot className="size-4 text-amber-500" />Auto-send disabled</div>
          {queueSummary.batchCount > 0 && <p className="mt-3 text-xs leading-5 text-slate-600">待機・実行中 {queueSummary.batchCount}バッチ / {queueSummary.companyCount.toLocaleString("ja-JP")}社</p>}
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[1fr_280px]">
        <div className="space-y-5 p-5 sm:p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>企業を見つけたソース</span>
              <select
                value={sourceSlug}
                onChange={(event) => onSourceChange(event.target.value)}
                disabled={submitting}
                aria-label="企業を見つけた営業ソース"
                className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus-visible:border-slate-400 focus-visible:ring-4 focus-visible:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sources.map((source) => <option key={source.slug} value={source.slug}>{source.name} / {source.tier.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>掲載・発見ページURL <span className="font-normal text-slate-600">任意</span></span>
              <Input value={sourcePageUrl} onChange={(event) => onSourcePageUrlChange(event.target.value)} placeholder="https://source.example/company" disabled={submitting} aria-label="営業ソースの掲載ページURL" className="h-11 rounded-xl border-slate-200 bg-white focus-visible:ring-slate-200" />
            </label>
          </div>

          {selectedSource && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              <div className="flex flex-wrap items-center gap-1.5">
                {selectedSource.roles.map((role) => <span key={role} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600">{MANUAL_SOURCE_ROLE_LABELS[role]}</span>)}
              </div>
              <p className="mt-2">{selectedSource.notes}</p>
            </div>
          )}

          {batchError && <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950 sm:flex-row sm:items-center sm:justify-between"><p>{batchError}<br />未処理URLはDBに残っており、この画面から再開できます。</p>{canResume && <Button type="button" variant="outline" size="sm" disabled={submitting} onClick={onResume} className="shrink-0 border-amber-300 bg-white">処理を再開</Button>}</div>}

          {queueActive && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-950" aria-live="polite">
              <p className="font-semibold">{batchStatus === "queued" ? `永続キューで待機中（前方${queuePosition}バッチ）` : "サーバーで解析を継続中"}</p>
              <p className="mt-1">画面を閉じても処理は継続します。次の500件も入力でき、完了イベントで順番に自動開始します。</p>
            </div>
          )}

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            <span className="flex items-center justify-between gap-3"><span>解析する海外企業URL</span><span className={invalidCount ? "text-red-600" : "font-normal text-slate-600"}>{urlCount} / {maxUrls}件</span></span>
            <Textarea
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder={"https://example.com\nhttps://another-company.com"}
              className="min-h-40 resize-y rounded-2xl border-slate-200 bg-slate-50/70 p-4 font-mono text-sm leading-6 focus-visible:bg-white focus-visible:ring-slate-200"
              aria-label="解析する海外企業URL"
              disabled={submitting}
            />
          </label>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-600">改行・スペース・カンマ区切りに対応。重複URLは自動で1件に統合します。</p>
            <Button onClick={onStart} disabled={submitting || urlCount === 0 || invalidCount} size="lg" className="h-12 w-full rounded-xl bg-slate-950 px-6 text-white shadow-lg shadow-slate-950/10 hover:bg-emerald-700 sm:w-auto">
              {submitting ? <LoaderCircle className="animate-spin" /> : <Play />}
              {submitting ? "キュー登録中" : queueActive ? "次のバッチを追加" : "解析を開始"}
              {!submitting && <ChevronRight />}
            </Button>
          </div>
        </div>

        <aside aria-label="処理フロー" className="border-t border-slate-200 bg-slate-950 p-5 text-white sm:p-7 xl:border-l xl:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Operator flow</p>
          <ol className="mt-5 space-y-5">
            {workflowSteps.map(([number, title, description]) => (
              <li key={number} className="flex gap-3">
                <span className="font-mono text-xs text-slate-400">{number}</span>
                <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-slate-300">{description}</p></div>
              </li>
            ))}
          </ol>
          <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><CheckCircle2 className="size-4" />安全境界</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">日本企業を除外し、根拠不足は要確認へ。フォーム・メールを自動送信しません。</p>
          </div>
        </aside>
      </div>

      {queueEntries.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-7" aria-live="polite">
          <div className="flex items-center justify-between gap-4 text-sm"><span className="font-semibold text-slate-700">今回の進捗</span><span className="font-mono text-xs text-slate-500">{finished} / {queueEntries.length} · {progress}%</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {queueEntries.slice(0, 60).map(([url, state]) => (
              <div key={url} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600">
                {state === "processing" ? <LoaderCircle className="size-4 shrink-0 animate-spin text-blue-600" /> : state === "done" ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : state === "error" ? <XCircle className="size-4 shrink-0 text-red-600" /> : <span className="size-2 shrink-0 rounded-full bg-slate-300" />}
                <span className="truncate">{url}</span>
              </div>
            ))}
          </div>
          {queueEntries.length > 60 && <p className="mt-3 text-xs text-slate-600">先頭60件を表示中。残り{queueEntries.length - 60}件もDBキューで処理されます。</p>}
        </div>
      )}
    </section>
  )
}
