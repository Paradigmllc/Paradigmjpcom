"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Gauge, RefreshCw, ShieldAlert, WalletCards } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { GenerationControlDashboard, GenerationPolicy } from "@/lib/video-studio-control/types"
import { BenchmarkResults, BenchmarkReviewForm } from "./BenchmarkReviewForm"

type ApiPayload = { ok: boolean; error?: string; dashboard?: GenerationControlDashboard }

async function api(method: "GET" | "POST", body?: Record<string, unknown>): Promise<ApiPayload> {
  const response = await fetch("/api/sales/video-studio-control", {
    method, headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined, cache: "no-store",
  })
  const payload = await response.json() as ApiPayload
  if (!response.ok || !payload.ok) throw new Error(payload.error ?? "操作に失敗しました")
  return payload
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function PolicyForm({ policy, busy, onSave }: { policy: GenerationPolicy; busy: boolean; onSave: (body: Record<string, unknown>) => Promise<void> }) {
  const [draft, setDraft] = useState(policy)
  const numeric = (key: keyof GenerationPolicy, value: string) => setDraft((current) => ({ ...current, [key]: Number(value) }))
  return <Card className="border-zinc-200"><CardHeader><CardTitle className="text-base">強制上限</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {[
      ["dailyBudgetCents", "日次上限 (cent)"], ["perRunBudgetCents", "1実行上限 (cent)"],
      ["perRunLlmTokenLimit", "LLM token上限"], ["perRunGpuSecondsLimit", "GPU秒上限"],
      ["maxAttempts", "最大試行回数"], ["circuitFailureThreshold", "遮断までの失敗数"],
      ["circuitCooldownMinutes", "遮断時間 (分)"], ["reservationTtlMinutes", "予約TTL (分)"],
    ].map(([key, label]) => <label key={key} className="space-y-1 text-xs font-semibold text-zinc-700">{label}<Input type="number" min={0} value={String(draft[key as keyof GenerationPolicy])} onChange={(event) => numeric(key as keyof GenerationPolicy, event.target.value)} /></label>)}
    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))} />生成予約を有効化</label>
    <Button className="sm:col-span-2 lg:col-span-3" disabled={busy} onClick={() => onSave({ action: "update_policy", enabled: draft.enabled, dailyBudgetCents: draft.dailyBudgetCents, perRunBudgetCents: draft.perRunBudgetCents, perRunLlmTokenLimit: draft.perRunLlmTokenLimit, perRunGpuSecondsLimit: draft.perRunGpuSecondsLimit, maxAttempts: draft.maxAttempts, circuitFailureThreshold: draft.circuitFailureThreshold, circuitCooldownMinutes: draft.circuitCooldownMinutes, reservationTtlMinutes: draft.reservationTtlMinutes })}>上限を保存</Button>
  </CardContent></Card>
}

function PreflightForm({ busy, onRun }: { busy: boolean; onRun: (body: Record<string, unknown>) => Promise<void> }) {
  const [prompt, setPrompt] = useState("ブランド紹介動画、自然な人物動作、商用品質")
  const [cost, setCost] = useState(300)
  const [tokens, setTokens] = useState(4000)
  const [gpuSeconds, setGpuSeconds] = useState(180)
  const [shotKind, setShotKind] = useState("cinematic")
  const [qualityTier, setQualityTier] = useState("balanced")
  const [provider, setProvider] = useState("auto")
  const run = async () => onRun({
    action: "preflight", idempotencyKey: `console-${crypto.randomUUID()}`,
    contentHash: await sha256(JSON.stringify({ prompt, shotKind, qualityTier, provider })),
    projectId: "", shotKind, qualityTier, requestedProvider: provider,
    estimatedCostCents: cost, estimatedLlmTokens: tokens, estimatedGpuSeconds: gpuSeconds,
  })
  return <Card className="border-zinc-200"><CardHeader><CardTitle className="text-base">無課金preflight</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    <label className="space-y-1 text-xs font-semibold md:col-span-2 xl:col-span-3">生成指示（DBにはSHA-256だけ保存）<Input value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
    <label className="space-y-1 text-xs font-semibold">shot<select aria-label="shot種別" className="block min-h-10 w-full rounded-md border bg-white px-3" value={shotKind} onChange={(event) => setShotKind(event.target.value)}>{["avatar", "cinematic", "product", "social", "broll", "motion_graphics"].map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="space-y-1 text-xs font-semibold">品質<select aria-label="品質tier" className="block min-h-10 w-full rounded-md border bg-white px-3" value={qualityTier} onChange={(event) => setQualityTier(event.target.value)}>{["economy", "balanced", "premium"].map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="space-y-1 text-xs font-semibold">provider<select aria-label="生成provider" className="block min-h-10 w-full rounded-md border bg-white px-3" value={provider} onChange={(event) => setProvider(event.target.value)}>{["auto", "vast_oss", "runway", "kling", "seedance", "heygen"].map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="space-y-1 text-xs font-semibold">予想費用 (cent)<Input type="number" min={0} value={cost} onChange={(event) => setCost(Number(event.target.value))} /></label>
    <label className="space-y-1 text-xs font-semibold">予想LLM token<Input type="number" min={0} value={tokens} onChange={(event) => setTokens(Number(event.target.value))} /></label>
    <label className="space-y-1 text-xs font-semibold">予想GPU秒<Input type="number" min={0} value={gpuSeconds} onChange={(event) => setGpuSeconds(Number(event.target.value))} /></label>
    <Button className="md:col-span-2 xl:col-span-3" disabled={busy || prompt.trim().length < 8} onClick={() => void run()}>GPU/APIを起動せず判定</Button>
  </CardContent></Card>
}

export function VideoStudioControlDashboard() {
  const [dashboard, setDashboard] = useState<GenerationControlDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const refresh = useCallback(async () => {
    try { setError(null); setDashboard((await api("GET")).dashboard ?? null) }
    catch (loadError) { console.error("[video-studio-control-ui] load failed:", loadError); setError(loadError instanceof Error ? loadError.message : "読み込みに失敗しました") }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const mutate = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true)
    try { await api("POST", payload); toast.success(success); await refresh() }
    catch (mutationError) { console.error("[video-studio-control-ui] mutation failed:", mutationError); toast.error(mutationError instanceof Error ? mutationError.message : "操作に失敗しました"); await refresh() }
    finally { setBusy(false) }
  }
  return <main className="min-h-dvh bg-zinc-50 px-4 py-6 sm:px-6 sm:py-10"><div className="mx-auto max-w-[1500px] space-y-6">
    <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">検証用の予約台帳です。実際の生成処理・GPU停止とはまだ接続されていません。自動再試行と成果物キャッシュ再利用は無効です。以下の上限は申告見積もりの予約判定であり、実課金の強制停止を保証しません。</p>
    <header className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Video Studio Control Plane</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">品質・費用・Vast.ai安定運用</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">日次・実行単位の見積もり、トークン数、GPU秒数を予約時に検査します。同一キーの再送は同じ予約を返します。この画面の事前判定はGPUも有料APIも起動しません。</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void refresh()} disabled={busy}><RefreshCw />更新</Button><Button asChild variant="outline"><Link href="/video-factory-console" prefetch={false}>Factory Console</Link></Button></div></div></header>
    {error && <Card className="border-rose-200"><CardContent className="flex items-center justify-between gap-3 p-5"><p role="alert" className="flex items-center gap-2 text-sm text-rose-700"><AlertTriangle />{error}</p><Button variant="outline" onClick={() => void refresh()}>再試行</Button></CardContent></Card>}
    {!dashboard && !error && <Card><CardContent className="p-10 text-center text-sm text-zinc-500">生成台帳を読み込み中…</CardContent></Card>}
    {dashboard && <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[<><WalletCards />本日予約 {money(dashboard.totals.todayCommittedCents)}</>, <><Gauge />実費 {money(dashboard.totals.todayActualCents)}</>, <><ShieldAlert />遮断 {dashboard.totals.blockedRuns}件</>, <><CheckCircle2 />再利用 {dashboard.totals.cacheHits}件</>].map((content, index) => <Card key={index}><CardContent className="flex items-center gap-3 p-5 text-sm font-bold">{content}</CardContent></Card>)}
      </section>
      <PreflightForm busy={busy} onRun={(payload) => mutate(payload, "preflight判定を記録しました")} />
      <PolicyForm policy={dashboard.policy} busy={busy} onSave={(payload) => mutate(payload, "強制上限を更新しました")} />
      <BenchmarkReviewForm dashboard={dashboard} busy={busy} onSave={(payload) => mutate(payload, "実映像の評価を記録しました")} />
      <BenchmarkResults dashboard={dashboard} />
      <Card><CardHeader><CardTitle className="text-base">Provider circuit breaker</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{dashboard.providers.length === 0 ? <p className="text-sm text-zinc-500">provider状態はまだありません。</p> : dashboard.providers.map((provider) => <div key={provider.provider} className="rounded-lg border p-4"><p className="font-bold">{provider.provider}</p><p className={provider.circuitState === "closed" ? "text-sm text-emerald-700" : "text-sm text-rose-700"}>{provider.circuitState}</p><p className="mt-1 text-xs text-zinc-500">連続失敗 {provider.consecutiveFailures}</p></div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">直近の生成予約</CardTitle></CardHeader><CardContent>{dashboard.runs.length === 0 ? <p className="text-sm text-zinc-500">生成予約はまだありません。</p> : <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-xs"><thead><tr className="border-b">{["時刻", "判定", "状態", "provider", "品質", "予想", "実費", "試行", "理由"].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{dashboard.runs.slice(0, 30).map((run) => <tr key={run.id} className="border-b"><td className="p-2">{new Date(run.createdAt).toLocaleString("ja-JP")}</td><td className="p-2 font-bold">{run.decision}</td><td className="p-2">{run.state}</td><td className="p-2">{run.selectedProvider}</td><td className="p-2">{run.qualityTier}</td><td className="p-2">{money(run.estimatedCostCents)}</td><td className="p-2">{money(run.actualCostCents)}</td><td className="p-2">{run.attemptCount}/{run.maxAttempts}</td><td className="p-2 text-rose-700">{run.blockReason ?? "—"}</td></tr>)}</tbody></table></div>}</CardContent></Card>
    </>}
  </div></main>
}
