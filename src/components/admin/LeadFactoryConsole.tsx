"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Factory, FileCheck2, Loader2, RefreshCw, RotateCcw, SearchCheck, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LeadSourceManager } from "@/components/admin/LeadSourceManager"
import { getSalesRunLastActivityAt, isSalesRunStale } from "@/lib/sales/run-staleness"

interface FactoryRun {
  id: string
  source_slug: string
  country_code: string
  technology: string | null
  status: string
  requested_limit: number
  verify_limit: number
  min_opportunity_score: number
  min_smb_score: number
  min_form_confidence: number
  fetched_count: number
  verified_count: number
  scored_count: number
  source_qualified_count: number
  quality_rejected_count: number
  review_required_count: number
  forms_checked_count: number
  forms_qualified_count: number
  promoted_count: number
  twenty_synced_count: number
  failure_count: number
  error_message: string | null
  heartbeat_at: string | null
  started_at: string | null
  created_at: string
  updated_at: string
}

interface RunItem {
  company_name: string | null
  domain: string
  source_page_url: string | null
  status: string
  quality_status: string
  quality_reasons: string[]
  opportunity_score: number | null
  form_url: string | null
  form_method: string | null
  form_confidence: number | null
  form_verified: boolean
  form_qualification_reason: string | null
  twenty_synced: boolean
  updated_at: string
}

interface InitialDraft {
  id: string
  company_id: string
  status: string
  message: string | null
  review: { score?: number; safetyScore?: number }
  twenty_sync_status: string
  error_message: string | null
  sent: false
  generated_at: string | null
  sales_companies: { company_name?: string; domain?: string } | null
}

const DEFAULT_COUNTRIES = "US, GB, CA, AU, DE, FR, NL, SG, AE"

function mergeRuns(current: FactoryRun[], incoming: FactoryRun[]): FactoryRun[] {
  const byId = new Map(current.map((run) => [run.id, run]))
  incoming.forEach((run) => byId.set(run.id, run))
  return [...byId.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 50)
}

function statusTone(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "failed" || status === "partial") return "destructive"
  if (status === "completed") return "default"
  if (status === "running") return "secondary"
  return "outline"
}

export function LeadFactoryConsole() {
  const [countries, setCountries] = useState(DEFAULT_COUNTRIES)
  const [technology, setTechnology] = useState("")
  const [limitPerCountry, setLimitPerCountry] = useState(1000)
  const [verifyPerCountry, setVerifyPerCountry] = useState(120)
  const [minScore, setMinScore] = useState(68)
  const [minSmbScore, setMinSmbScore] = useState(50)
  const [minFormConfidence, setMinFormConfidence] = useState(80)
  const [runs, setRuns] = useState<FactoryRun[]>([])
  const [items, setItems] = useState<RunItem[]>([])
  const [drafts, setDrafts] = useState<InitialDraft[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [draftBusy, setDraftBusy] = useState(false)
  const [resumingRunId, setResumingRunId] = useState<string | null>(null)
  const [continuableRunIds, setContinuableRunIds] = useState<string[]>([])
  const [clockMs, setClockMs] = useState(() => Date.now())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [connection, setConnection] = useState<"connecting" | "live" | "degraded">("connecting")

  const refresh = useCallback(async () => {
    setLoadError(null)
    try {
      const response = await fetch("/api/sales/lead-candidates/factory?limit=50", { cache: "no-store" })
      const payload = await response.json() as { ok?: boolean; runs?: FactoryRun[]; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "量産ランを取得できませんでした")
      setRuns(payload.runs ?? [])
    } catch (error) {
      console.error("[lead-factory-console] refresh failed:", error)
      const message = error instanceof Error ? error.message : "量産ランを取得できませんでした"
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRun = useCallback(async (runId: string) => {
    setSelectedRunId(runId)
    try {
      const [runResponse, draftResponse] = await Promise.all([
        fetch(`/api/sales/lead-candidates/runs/${runId}`, { cache: "no-store" }),
        fetch(`/api/sales/initial-form-drafts?runId=${runId}`, { cache: "no-store" }),
      ])
      const payload = await runResponse.json() as { ok?: boolean; recentItems?: RunItem[]; error?: string }
      const draftPayload = await draftResponse.json() as { ok?: boolean; drafts?: InitialDraft[]; error?: string }
      if (!runResponse.ok || !payload.ok) throw new Error(payload.error ?? "ラン詳細を取得できませんでした")
      if (!draftResponse.ok || !draftPayload.ok) throw new Error(draftPayload.error ?? "未送信文面を取得できませんでした")
      setItems(payload.recentItems ?? [])
      setDrafts(draftPayload.drafts ?? [])
    } catch (error) {
      console.error("[lead-factory-console] run detail failed:", error)
      toast.error(error instanceof Error ? error.message : "ラン詳細を取得できませんでした")
    }
  }, [])

  async function generateDrafts() {
    if (!selectedRunId) return toast.error("文面を生成するランを選択してください")
    setDraftBusy(true)
    try {
      const response = await fetch("/api/sales/initial-form-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runIds: [selectedRunId], limit: 40, force: false }),
      })
      const payload = await response.json() as { requested?: number; generated?: number; failed?: number; sent?: number; error?: string }
      if (!response.ok && response.status !== 207) throw new Error(payload.error ?? "初回文面を生成できませんでした")
      if (payload.sent !== 0) throw new Error("安全停止: 外部送信件数が0ではありません")
      toast.success(`${payload.generated ?? 0}/${payload.requested ?? 0}件をTwentyへ未送信保存。失敗${payload.failed ?? 0}件`)
      await loadRun(selectedRunId)
    } catch (error) {
      console.error("[lead-factory-console] initial drafts failed:", error)
      toast.error(error instanceof Error ? error.message : "初回文面を生成できませんでした")
    } finally {
      setDraftBusy(false)
    }
  }

  useEffect(() => {
    void refresh()
    const clock = window.setInterval(() => setClockMs(Date.now()), 30_000)
    const events = new EventSource("/api/sales/lead-candidates/factory/events")
    events.onopen = () => setConnection("live")
    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; runs?: FactoryRun[]; message?: string }
        if (payload.runs) setRuns((current) => mergeRuns(current, payload.runs ?? []))
        if (payload.type === "warning" || payload.type === "error") setConnection("degraded")
        if (payload.type === "error") setLoadError(payload.message ?? "Realtime接続に失敗しました")
      } catch (error) {
        console.error("[lead-factory-console] realtime parse failed:", error)
        setConnection("degraded")
      }
    }
    events.onerror = () => setConnection("degraded")
    return () => {
      window.clearInterval(clock)
      events.close()
    }
  }, [refresh])

  const totals = useMemo(() => runs.reduce((sum, run) => ({
    checked: sum.checked + run.forms_checked_count,
    qualified: sum.qualified + run.forms_qualified_count,
    sourceQualified: sum.sourceQualified + run.source_qualified_count,
    review: sum.review + run.review_required_count,
    rejected: sum.rejected + run.quality_rejected_count,
    synced: sum.synced + run.twenty_synced_count,
    failed: sum.failed + run.failure_count,
  }), { checked: 0, qualified: 0, sourceQualified: 0, review: 0, rejected: 0, synced: 0, failed: 0 }), [runs])

  async function startFactory() {
    const countryCodes = [...new Set(countries.split(/[\s,]+/).map((code) => code.trim().toUpperCase()).filter(Boolean))]
    if (countryCodes.length === 0 || countryCodes.some((code) => !/^[A-Z]{2}$/.test(code))) return toast.error("国コードを2文字のISO形式で入力してください")
    setBusy(true)
    try {
      const response = await fetch("/api/sales/lead-candidates/factory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCodes, technology: technology.trim() || undefined, limitPerCountry, verifyPerCountry, minOpportunityScore: minScore, minSmbScore, minFormConfidence }),
      })
      const payload = await response.json() as { runs?: Array<{ ok: boolean; runId: string }>; failed?: number; error?: string }
      if (!response.ok && response.status !== 207) throw new Error(payload.error ?? "量産ランを開始できませんでした")
      toast.success(`${payload.runs?.length ?? 0}地域の収集を開始。送信・文面生成は停止したままです`)
      await refresh()
    } catch (error) {
      console.error("[lead-factory-console] start failed:", error)
      toast.error(error instanceof Error ? error.message : "量産ランを開始できませんでした")
    } finally {
      setBusy(false)
    }
  }

  async function resumeRun(runId: string) {
    setResumingRunId(runId)
    try {
      const response = await fetch(`/api/sales/lead-candidates/runs/${runId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ async: false, batchSize: 24, maxBatches: 10 }),
      })
      const payload = await response.json() as {
        ok?: boolean
        processed?: number
        twentySynced?: number
        hasMore?: boolean
        error?: string
      }
      if (!response.ok || payload.ok !== true) throw new Error(payload.error ?? "停滞runを再開できませんでした")
      setContinuableRunIds((current) => payload.hasMore
        ? [...new Set([...current, runId])]
        : current.filter((id) => id !== runId))
      if (payload.hasMore) {
        toast.warning(`${payload.processed ?? 0}件を復旧。残りがあるため「復旧を続行」でもう一度進められます`)
      } else {
        toast.success(`${payload.processed ?? 0}件を復旧し、Twenty同期${payload.twentySynced ?? 0}件で完了しました`)
      }
      await refresh()
      if (selectedRunId === runId) await loadRun(runId)
    } catch (error) {
      console.error("[lead-factory-console] stalled run recovery failed:", error)
      toast.error(error instanceof Error ? error.message : "停滞runを再開できませんでした")
    } finally {
      setResumingRunId(null)
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[.24em] text-indigo-700">Form-qualified factory</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">候補収集 → 実フォーム確認 → Twenty追加</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">生候補はCRM外で保持し、実フォーム・SMB適合・機会スコアを通過した企業だけをTwentyへ同期します。量産ランの開始では文面生成、レポート生成、フォーム送信を起動しません。</p></div>
          <div className="flex flex-wrap gap-2"><Badge variant="outline">証拠付き公式・業界ソースのみ</Badge><Badge variant={connection === "live" ? "default" : "secondary"}>{connection === "live" ? "Realtime接続中" : connection === "degraded" ? "手動更新可能" : "接続中"}</Badge></div>
        </header>

        <LeadSourceManager />

        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Factory className="h-5 w-5" />量産条件</CardTitle><CardDescription>対象国ごとに取込済みの証拠付き企業だけを処理します。企業名・国・営利性・SMB根拠・Japan Entry適合・実問い合わせフォームの全ハードゲートに合格するまでTwentyへ追加しません。</CardDescription></CardHeader><CardContent className="space-y-5"><div><label className="text-sm font-semibold" htmlFor="factory-countries">対象国コード</label><Input id="factory-countries" className="mt-2" value={countries} onChange={(event) => setCountries(event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"><NumberField id="factory-limit" label="候補/国" value={limitPerCountry} min={1} max={10000} onChange={setLimitPerCountry} /><NumberField id="factory-verify" label="実確認/国" value={verifyPerCountry} min={1} max={5000} onChange={setVerifyPerCountry} /><NumberField id="factory-score" label="最低機会スコア" value={minScore} min={0} max={100} onChange={setMinScore} /><NumberField id="factory-smb" label="最低SMBスコア" value={minSmbScore} min={0} max={100} onChange={setMinSmbScore} /><NumberField id="factory-confidence" label="フォーム信頼度" value={minFormConfidence} min={0} max={100} onChange={setMinFormConfidence} /><div><label className="text-sm font-semibold" htmlFor="factory-tech">技術（任意）</label><Input id="factory-tech" className="mt-2" value={technology} onChange={(event) => setTechnology(event.target.value)} placeholder="Shopify" /></div></div><div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={startFactory}><SearchCheck className="h-4 w-4" />量産ランを開始</Button><Button variant="outline" disabled={busy} onClick={() => void refresh()}><RefreshCw className="h-4 w-4" />状態を更新</Button></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><ShieldCheck className="mr-2 inline h-4 w-4" />証拠付き収集元必須・実フォーム確認必須・SMB不明は要確認隔離・Twenty Opportunity作成なし・収集ラン中の外部送信なし・収集ラン中のDeepSeek消費なし。</div></CardContent></Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7"><Metric label="企業ゲート合格" value={totals.sourceQualified} /><Metric label="要確認隔離" value={totals.review} danger={totals.review > 0} /><Metric label="品質除外" value={totals.rejected} /><Metric label="フォーム確認" value={totals.checked} /><Metric label="実フォーム合格" value={totals.qualified} /><Metric label="Twenty同期" value={totals.synced} /><Metric label="処理エラー" value={totals.failed} danger={totals.failed > 0} /></div>

        <Card><CardHeader><CardTitle>量産ラン</CardTitle><CardDescription>行を選択するとフォーム判定とTwenty同期結果を確認できます。5分以上heartbeatが止まったrunだけ、画面から安全に復旧できます。</CardDescription></CardHeader><CardContent>{loading ? <p className="py-10 text-center text-sm text-slate-500">読み込み中...</p> : loadError && runs.length === 0 ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{loadError}</p> : runs.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">まだ量産ランはありません。</p> : <div className="space-y-3">{runs.map((run) => {
          const stale = run.source_slug === "evidence_first_sources" && isSalesRunStale(run, clockMs)
          const canContinueRecovery = continuableRunIds.includes(run.id)
          const lastActivityAt = getSalesRunLastActivityAt(run)
          return <article key={run.id} className={`rounded-xl border p-4 transition hover:border-indigo-300 ${selectedRunId === run.id ? "border-indigo-500 bg-indigo-50" : stale ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
            <button type="button" onClick={() => void loadRun(run.id)} className="w-full text-left" aria-label={`${run.country_code}のラン詳細を開く`}>
              <div className="flex flex-wrap items-center justify-between gap-3"><div><span className="font-bold">{run.country_code}</span><span className="ml-3 text-xs text-slate-500">{run.technology ?? "全技術"} / {new Date(run.created_at).toLocaleString("ja-JP")}</span></div><div className="flex items-center gap-2">{stale && <Badge variant="destructive">停滞</Badge>}<Badge variant={statusTone(run.status)}>{run.status}</Badge></div></div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, run.verify_limit > 0 ? (run.verified_count / run.verify_limit) * 100 : 0)}%` }} /></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-5"><span>取得 {run.fetched_count}</span><span>確認 {run.forms_checked_count}/{run.verify_limit}</span><span>フォーム {run.forms_qualified_count}</span><span>昇格 {run.promoted_count}</span><span>Twenty {run.twenty_synced_count}</span></div>
              {run.error_message && <p className="mt-2 text-xs text-red-700">{run.error_message}</p>}
            </button>
            {(stale || canContinueRecovery) && <div className="mt-4 flex flex-col gap-3 border-t border-amber-200 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-amber-950">最終活動: {lastActivityAt > 0 ? new Date(lastActivityAt).toLocaleString("ja-JP") : "不明"}。残り候補だけを再処理し、文面・レポート・外部送信は起動しません。</p><Button type="button" variant="outline" disabled={resumingRunId !== null} onClick={() => void resumeRun(run.id)} aria-label={`${run.country_code}の停滞runを再開`} className="shrink-0 border-amber-400 bg-white text-amber-950 hover:bg-amber-100">{resumingRunId === run.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}{resumingRunId === run.id ? "復旧中..." : canContinueRecovery ? "復旧を続行" : "停滞runを再開"}</Button></div>}
          </article>
        })}</div>}</CardContent></Card>

        {selectedRunId && <Card><CardHeader><CardTitle>直近100件の判定</CardTitle><CardDescription>収集元・企業ゲート・DOMフォーム判定を確認できます。URLは表示のみで、この画面から送信しません。</CardDescription></CardHeader><CardContent>{items.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">判定結果はまだありません。</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="p-3">Company / Domain</th><th className="p-3">Source</th><th className="p-3">Quality</th><th className="p-3">Score</th><th className="p-3">Form</th><th className="p-3">Confidence</th><th className="p-3">Twenty</th><th className="p-3">Status</th></tr></thead><tbody>{items.map((item) => <tr key={`${item.domain}-${item.updated_at}`} className="border-b last:border-0"><td className="p-3"><span className="block font-medium">{item.company_name ?? "企業名未確認"}</span><span className="text-xs text-slate-500">{item.domain}</span></td><td className="max-w-52 truncate p-3" title={item.source_page_url ?? ""}>{item.source_page_url ?? "-"}</td><td className="max-w-64 p-3"><Badge variant={item.quality_status === "passed" ? "default" : item.quality_status === "rejected" ? "destructive" : "secondary"}>{item.quality_status}</Badge>{item.quality_reasons.length > 0 && <p className="mt-1 text-xs text-slate-500">{item.quality_reasons.join(", ")}</p>}</td><td className="p-3">{item.opportunity_score ?? "-"}</td><td className="max-w-xs truncate p-3" title={item.form_url ?? item.form_qualification_reason ?? ""}>{item.form_verified ? item.form_url : item.form_qualification_reason ?? "未確認"}</td><td className="p-3">{item.form_confidence ?? "-"} {item.form_method ? `(${item.form_method})` : ""}</td><td className="p-3">{item.twenty_synced ? "同期済み" : "未同期"}</td><td className="p-3"><Badge variant={statusTone(item.status)}>{item.status}</Badge></td></tr>)}</tbody></table></div>}</CardContent></Card>}

        {selectedRunId && <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" />初回フォーム文面（未送信）</CardTitle><CardDescription>確認済みフォーム企業だけを再審査し、公開根拠からDeepSeek V4 Proが文面を生成します。URL・資料・価格は含めず、Twentyへ人間レビュー待ちで保存します。</CardDescription></CardHeader><CardContent className="space-y-5"><div className="flex flex-wrap items-center gap-3"><Button disabled={draftBusy} onClick={generateDrafts}><FileCheck2 className="h-4 w-4" />{draftBusy ? "生成・品質審査中..." : "合格企業の文面を生成"}</Button><Badge variant="outline">外部送信 0件固定</Badge></div>{drafts.length === 0 ? <p className="rounded-xl bg-slate-100 p-5 text-sm text-slate-600">このランの文面はまだありません。</p> : <div className="space-y-4">{drafts.map((draft) => <article key={draft.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-slate-950">{draft.sales_companies?.company_name ?? draft.company_id}</p><p className="text-xs text-slate-500">{draft.sales_companies?.domain ?? "domain未取得"}</p></div><div className="flex gap-2"><Badge variant={draft.status === "needs_review" ? "default" : "destructive"}>{draft.status}</Badge><Badge variant={draft.twenty_sync_status === "synced" ? "secondary" : "destructive"}>Twenty {draft.twenty_sync_status}</Badge></div></div>{draft.message ? <p className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-800">{draft.message}</p> : <p className="mt-4 text-sm text-red-700">{draft.error_message ?? "文面生成に失敗しました"}</p>}<div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>品質 {draft.review?.score ?? "-"}/100</span><span>安全性 {draft.review?.safetyScore ?? "-"}/100</span><span>送信 {draft.sent ? "異常" : "0件"}</span></div></article>)}</div>}</CardContent></Card>}
      </div>
    </main>
  )
}

function NumberField({ id, label, value, min, max, onChange }: { id: string; label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <div><label className="text-sm font-semibold" htmlFor={id}>{label}</label><Input id={id} type="number" className="mt-2" min={min} max={max} value={value} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value))))} /></div>
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-2 text-3xl font-bold ${danger ? "text-red-700" : "text-slate-950"}`}>{value.toLocaleString("ja-JP")}</p></CardContent></Card>
}
