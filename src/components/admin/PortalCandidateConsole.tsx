"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, DatabaseZap, ExternalLink, Images, LoaderCircle, RefreshCw, Send } from "lucide-react"
import { toast } from "sonner"
import type { DemoReviewedAsset } from "@/lib/sales/demo-private-access"
import type { Industry } from "@/lib/sales/types"
import type { PortalSource } from "@/lib/sales/portal-sources/types"
import { PortalSnapshotImportForm } from "./PortalSnapshotImportForm"

interface PortalCandidateView {
  id: string
  status: string
  opportunityScore: number
  source: PortalSource
  listingUrl: string
  companyName: string
  category: string
  description: string
  address: string | null
  prefecture: string | null
  websiteUrl: string | null
  contactUrl: string
  images: Array<{ url: string; alt: string }>
  suggestedIndustry: Industry
  smbFit: {
    eligible: boolean
    score: number
    decisionSignals: string[]
    enterpriseSignals: string[]
    reasons: string[]
  }
  reviewStatus: "ready_for_review" | "has_website" | "insufficient_content" | "enterprise_like" | "decision_fit_unverified"
  companyId: string | null
  twentySync: { status?: string; twentyCompanyId?: string | null; error?: string | null } | null
  lastSeenAt: string
}

const SOURCE_OPTIONS: Array<{ value: PortalSource; label: string; hint: string }> = [
  { value: "houzz", label: "Houzz", hint: "工務店・設計・リフォーム" },
  { value: "ekiten", label: "エキテン", hint: "ローカル店舗・専門サービス" },
  { value: "jmty", label: "ジモティー", hint: "地域サービス・法人投稿" },
]

const PAGE_SIZE = 50
const BULK_QUEUE_LIMIT = 50

function safeCssUrl(url: string): string {
  return `url("${url.replace(/["\\\n\r]/g, (character) => `\\${character}`)}")`
}

function isQueueableCandidate(candidate: PortalCandidateView): boolean {
  return candidate.reviewStatus === "ready_for_review" && candidate.status !== "promoted" && !candidate.websiteUrl && candidate.images.length >= 3
}

function buildReviewedAssets(candidate: PortalCandidateView, selectedUrls: string[]): DemoReviewedAsset[] {
  return selectedUrls.map((url, index) => ({
    id: `portal-${candidate.source}-${candidate.id.slice(0, 8)}-${index + 1}`,
    kind: "image",
    sourceUrl: url,
    ownerLabel: candidate.companyName,
    sourceAccount: candidate.listingUrl,
    useBasis: "private_proposal",
    officialSource: true,
    peopleVisible: false,
    watermarkVisible: false,
    alt: candidate.images.find((image) => image.url === url)?.alt ?? `${candidate.companyName}の掲載写真`,
    notes: `${candidate.source}公式プロフィール・非公開提案限定`,
  }))
}

async function queuePortalCandidate(candidate: PortalCandidateView, selectedUrls: string[]): Promise<{ ok: boolean; reused?: boolean; error?: string }> {
  const assets = buildReviewedAssets(candidate, selectedUrls)
  const response = await fetch("/api/sales/demo-site/portal-candidates", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ candidateId: candidate.id, industry: candidate.suggestedIndustry, prefecture: candidate.prefecture ?? undefined, assets }),
  })
  const payload = await response.json() as { ok?: boolean; reused?: boolean; error?: string }
  if (!response.ok || !payload.ok) return { ok: false, error: payload.error ?? "DEMOキュー投入に失敗しました" }
  return { ok: true, reused: payload.reused }
}

export function PortalCandidateConsole() {
  const [source, setSource] = useState<PortalSource>("houzz")
  const [candidates, setCandidates] = useState<PortalCandidateView[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([])
  const [syncBusy, setSyncBusy] = useState(false)
  const [bulkConfirmed, setBulkConfirmed] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null)

  const refresh = useCallback(async (nextSource: PortalSource = source, nextPage: number = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ source: nextSource, limit: String(PAGE_SIZE), offset: String(nextPage * PAGE_SIZE) })
      const response = await fetch(`/api/sales/demo-site/portal-candidates?${params.toString()}`, { cache: "no-store" })
      const payload = await response.json() as { ok?: boolean; candidates?: PortalCandidateView[]; nextOffset?: number | null; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "候補取得に失敗しました")
      setCandidates(payload.candidates ?? [])
      setHasMore(payload.nextOffset !== null && payload.nextOffset !== undefined)
      setSelectedCandidateIds([])
    } catch (error) {
      console.error("[portal-console] refresh failed:", error)
      toast.error(error instanceof Error ? error.message : "候補取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [page, source])

  useEffect(() => { void refresh(source, page) }, [refresh, page, source])

  const counts = useMemo(() => ({
    ready: candidates.filter((candidate) => candidate.reviewStatus === "ready_for_review" && candidate.status !== "promoted").length,
    enterprise: candidates.filter((candidate) => candidate.reviewStatus === "enterprise_like").length,
    unverified: candidates.filter((candidate) => candidate.reviewStatus === "decision_fit_unverified").length,
    queued: candidates.filter((candidate) => candidate.status === "promoted").length,
  }), [candidates])
  const readyIds = candidates.filter((candidate) => isQueueableCandidate(candidate)).map((candidate) => candidate.id)
  const bulkQueueCandidates = useMemo(
    () => candidates.filter(isQueueableCandidate).slice(0, BULK_QUEUE_LIMIT),
    [candidates],
  )

  async function queueReadyCandidates() {
    if (!bulkConfirmed) return toast.error("公式プロフィール・人物/透かしなし画像の確認にチェックしてください")
    if (bulkQueueCandidates.length === 0) return toast.error("一括投入できる審査可能候補がありません")
    setBulkBusy(true)
    setBulkProgress({ done: 0, total: bulkQueueCandidates.length })
    let success = 0
    let failed = 0
    try {
      for (const candidate of bulkQueueCandidates) {
        const result = await queuePortalCandidate(candidate, candidate.images.slice(0, 6).map((image) => image.url))
        if (result.ok) success += 1
        else {
          failed += 1
          console.error("[portal-console] bulk queue failed:", candidate.id, result.error)
        }
        setBulkProgress((current) => current ? { ...current, done: current.done + 1 } : current)
      }
      if (failed > 0) toast.warning(`DEMO一括投入: 成功${success}件 / 失敗${failed}件。失敗候補は個別確認してください。`)
      else toast.success(`DEMO一括投入: ${success}件を生成キューへ追加しました。送信はありません。`)
      await refresh(source)
    } catch (error) {
      console.error("[portal-console] bulk queue crashed:", error)
      toast.error(error instanceof Error ? error.message : "DEMO一括投入に失敗しました")
    } finally {
      setBulkBusy(false)
      setBulkProgress(null)
      setBulkConfirmed(false)
    }
  }

  function togglePageSelection() {
    setSelectedCandidateIds((current) => readyIds.every((id) => current.includes(id))
      ? current.filter((id) => !readyIds.includes(id))
      : [...new Set([...current, ...readyIds])])
  }

  async function syncSelectedToTwenty() {
    if (selectedCandidateIds.length === 0) return toast.error("Twentyへ登録する候補を選択してください")
    setSyncBusy(true)
    try {
      const response = await fetch("/api/sales/demo-site/portal-candidates/twenty-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, candidateIds: selectedCandidateIds }),
      })
      const payload = await response.json() as { ok?: boolean; synced?: number; reused?: number; skipped?: number; failed?: number; error?: string }
      if (!response.ok && response.status !== 207) throw new Error(payload.error ?? "Twenty登録に失敗しました")
      if ((payload.failed ?? 0) > 0) toast.warning(`Twenty登録: 成功${payload.synced ?? 0} / 再利用${payload.reused ?? 0} / スキップ${payload.skipped ?? 0} / 失敗${payload.failed ?? 0}`)
      else toast.success(`Twenty登録完了: ${payload.synced ?? 0}件 / 再実行不要${payload.reused ?? 0}件`)
      await refresh(source, page)
    } catch (error) {
      console.error("[portal-console] Twenty bulk sync failed:", error)
      toast.error(error instanceof Error ? error.message : "Twenty登録に失敗しました")
    } finally {
      setSyncBusy(false)
    }
  }

  return (
    <section className="mx-auto mt-8 max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-violet-700">Portal sourcing</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Houzz・エキテン・ジモティー候補収集</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">検索エンジン・ポータルをサーバー巡回せず、通常ブラウザで確認した公開プロフィールだけを保存します。独自HP、大企業シグナル、意思決定者未確認、情報不足の候補は自動で生成対象から除外し、送信は行いません。</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
          <Metric label="審査可能" value={counts.ready} tone="emerald" />
          <Metric label="大企業除外" value={counts.enterprise} tone="red" />
          <Metric label="意思決定者未確認" value={counts.unverified} tone="amber" />
          <Metric label="生成投入済み" value={counts.queued} tone="slate" />
        </div>
      </div>

      <div className="mt-7 max-w-xl">
        <div>
          <label className="text-sm font-semibold" htmlFor="portal-source">対象ポータル</label>
          <select id="portal-source" value={source} onChange={(event) => setSource(event.target.value as PortalSource)} className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 outline-none focus:border-violet-600">
            {SOURCE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} — {option.hint}</option>)}
          </select>
        </div>
      </div>
      <PortalSnapshotImportForm source={source} onImported={() => refresh(source)} />
      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">審査可能候補を一括DEMO生成へ投入</h3>
            <p className="mt-1 text-xs leading-5 text-emerald-900">現在のsourceで審査可能な候補を最大{BULK_QUEUE_LIMIT}件まとめてキューへ入れます。送信・DM・メール・フォーム送信は行わず、7日限定URL発行前の生成キューまでです。</p>
            {bulkProgress && <p className="mt-2 text-xs font-bold text-emerald-950">投入中 {bulkProgress.done} / {bulkProgress.total}</p>}
          </div>
          <div className="flex flex-col gap-3 lg:min-w-96">
            <label className="flex items-start gap-3 text-xs leading-5 text-emerald-950">
              <input type="checkbox" checked={bulkConfirmed} onChange={(event) => setBulkConfirmed(event.target.checked)} className="mt-1 h-4 w-4" />
              <span>対象候補が事業者本人の公式プロフィールで、先頭画像に人物・透かし・権利リスクがないことを確認済み</span>
            </label>
            <button type="button" disabled={loading || bulkBusy || !bulkConfirmed || bulkQueueCandidates.length === 0} onClick={() => void queueReadyCandidates()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white disabled:opacity-40">
              {bulkBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {bulkBusy ? "投入中…" : `${bulkQueueCandidates.length}件を一括生成投入`}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={loading} onClick={() => void refresh(source)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold disabled:opacity-50"><RefreshCw className="h-4 w-4" />一覧を更新</button>
        <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold"><input type="checkbox" checked={readyIds.length > 0 && readyIds.every((id) => selectedCandidateIds.includes(id))} onChange={togglePageSelection} disabled={readyIds.length === 0 || syncBusy} />このページの審査可能候補を選択</label>
        <button type="button" disabled={syncBusy || selectedCandidateIds.length === 0} onClick={() => void syncSelectedToTwenty()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-bold text-white disabled:opacity-40"><DatabaseZap className="h-4 w-4" />{syncBusy ? "Twenty登録中…" : `選択${selectedCandidateIds.length}件をTwenty登録`}</button>
      </div>
      <p className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs leading-5 text-indigo-950">Twenty登録は候補リストだけを作成します。DEMO生成・文面生成・フォーム送信・メール送信は起動しません。1回50件、同時4件、失敗した企業だけ再実行できます。</p>

      <div className="mt-7 space-y-5">
        {loading && <div className="flex min-h-32 items-center justify-center gap-2 rounded-2xl bg-slate-50 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" />候補を読み込んでいます</div>}
        {!loading && candidates.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">まだ候補がありません。事業者プロフィールURLを投入してください。</div>}
        {!loading && candidates.map((candidate) => <PortalCandidateCard key={candidate.id} candidate={candidate} selectedForTwenty={selectedCandidateIds.includes(candidate.id)} onToggleTwenty={() => setSelectedCandidateIds((current) => current.includes(candidate.id) ? current.filter((id) => id !== candidate.id) : [...current, candidate.id])} onQueued={() => refresh(source, page)} />)}
      </div>
      {!loading && (page > 0 || hasMore) && <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:flex-row sm:items-center">
        <p>{page * PAGE_SIZE + 1}件目以降を表示（1ページ最大{PAGE_SIZE}件）</p>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="前の候補ページ" disabled={page === 0 || loading} onClick={() => setPage((current) => Math.max(0, current - 1))} className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 font-bold disabled:opacity-40">前へ</button>
          <span className="min-w-20 text-center">{page + 1}</span>
          <button type="button" aria-label="次の候補ページ" disabled={!hasMore || loading} onClick={() => setPage((current) => current + 1)} className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 font-bold disabled:opacity-40">次へ</button>
        </div>
      </div>}
    </section>
  )
}

function PortalCandidateCard({ candidate, selectedForTwenty, onToggleTwenty, onQueued }: { candidate: PortalCandidateView; selectedForTwenty: boolean; onToggleTwenty: () => void; onQueued: () => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>(candidate.images.slice(0, 6).map((image) => image.url))
  const [excluded, setExcluded] = useState<Record<string, { people: boolean; watermark: boolean }>>({})
  const [officialConfirmed, setOfficialConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const isReady = candidate.reviewStatus === "ready_for_review" && candidate.status !== "promoted"

  function markRisk(url: string, key: "people" | "watermark", checked: boolean) {
    setExcluded((current) => ({ ...current, [url]: { people: current[url]?.people ?? false, watermark: current[url]?.watermark ?? false, [key]: checked } }))
    if (checked) setSelected((current) => current.filter((item) => item !== url))
  }

  async function queueDemo() {
    if (!officialConfirmed) return toast.error("事業者本人の公式プロフィールであることを確認してください")
    if (selected.length < 3) return toast.error("人物・透かしのない画像を3件以上選択してください")
    setBusy(true)
    try {
      const result = await queuePortalCandidate(candidate, selected)
      if (!result.ok) throw new Error(result.error ?? "DEMOキュー投入に失敗しました")
      toast.success(result.reused ? "既存の同一DEMOを再利用しました" : "品質ゲート付きDEMO生成へ追加しました")
      await onQueued()
    } catch (error) {
      console.error("[portal-console] queue failed:", error)
      toast.error(error instanceof Error ? error.message : "DEMOキュー投入に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {isQueueableCandidate(candidate) && <label className="inline-flex items-center gap-2 text-xs font-bold text-indigo-800"><input type="checkbox" checked={selectedForTwenty} onChange={onToggleTwenty} aria-label={`${candidate.companyName}をTwenty登録対象にする`} />Twenty登録</label>}
            <h3 className="text-lg font-semibold">{candidate.companyName}</h3>
            <StatusBadge candidate={candidate} />
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-800">適合度 {candidate.opportunityScore}</span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800">SMB意思決定 {candidate.smbFit.score}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{candidate.category}{candidate.address ? ` / ${candidate.address}` : ""}</p>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{candidate.description || "説明文を取得できませんでした。"}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{candidate.smbFit.reasons.join(" / ")}</p>
          {candidate.twentySync?.status === "synced" && <p className="mt-2 text-xs font-semibold text-indigo-700">Twenty登録済み{candidate.twentySync.twentyCompanyId ? ` / ${candidate.twentySync.twentyCompanyId}` : ""}</p>}
          {candidate.twentySync?.status === "failed" && <p className="mt-2 text-xs font-semibold text-red-700">Twenty登録失敗: {candidate.twentySync.error ?? "再実行してください"}</p>}
        </div>
        <a href={candidate.listingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-300 px-4 text-xs font-bold"><ExternalLink className="h-4 w-4" />元ページ確認</a>
      </div>

      {candidate.websiteUrl && <div className="border-y border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-950">独自HP候補を検出したため生成対象外: {candidate.websiteUrl}</div>}
      {isReady && <div className="border-t border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-2"><Images className="h-4 w-4" /><p className="text-sm font-semibold">画像審査 — 人物・透かしが見える画像はチェックして除外</p></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {candidate.images.slice(0, 12).map((image) => {
            const risk = excluded[image.url] ?? { people: false, watermark: false }
            const checked = selected.includes(image.url)
            return <div key={image.url} className={`overflow-hidden rounded-xl border bg-white ${checked ? "border-emerald-500 ring-1 ring-emerald-500" : "border-slate-200"}`}>
              <button type="button" aria-label={`${image.alt}を${checked ? "除外" : "選択"}`} onClick={() => setSelected((current) => checked ? current.filter((url) => url !== image.url) : [...current, image.url])} disabled={risk.people || risk.watermark} className="block h-36 w-full bg-cover bg-center disabled:opacity-40" style={{ backgroundImage: safeCssUrl(image.url) }} />
              <div className="space-y-2 p-3 text-[11px]">
                <label className="flex items-center gap-2"><input type="checkbox" checked={risk.people} onChange={(event) => markRisk(image.url, "people", event.target.checked)} />人物あり</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={risk.watermark} onChange={(event) => markRisk(image.url, "watermark", event.target.checked)} />透かしあり</label>
              </div>
            </div>
          })}
        </div>
        <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl bg-white p-4 sm:flex-row sm:items-center">
          <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={officialConfirmed} onChange={(event) => setOfficialConfirmed(event.target.checked)} className="mt-1 h-4 w-4" /><span>事業者本人が管理する公式プロフィールであることを元ページで確認済み</span></label>
          <button type="button" disabled={busy || !officialConfirmed || selected.length < 3} onClick={queueDemo} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-40"><Send className="h-4 w-4" />{busy ? "投入中…" : `${selected.length}素材で生成`}</button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">実画像は非公開提案限定として登録します。権利確認前のクリーン公開URL発行と外部送信はブロックされます。</p>
      </div>}
    </article>
  )
}

function StatusBadge({ candidate }: { candidate: PortalCandidateView }) {
  if (candidate.status === "promoted") return <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white"><CheckCircle2 className="h-3 w-3" />生成投入済み</span>
  if (candidate.twentySync?.status === "synced") return <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-800"><CheckCircle2 className="h-3 w-3" />Twenty登録済み</span>
  if (candidate.reviewStatus === "ready_for_review") return <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">審査可能</span>
  if (candidate.reviewStatus === "has_website") return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">独自HPあり</span>
  if (candidate.reviewStatus === "enterprise_like") return <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-800">大企業シグナル除外</span>
  if (candidate.reviewStatus === "decision_fit_unverified") return <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-800">意思決定者未確認</span>
  return <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-800">情報不足</span>
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "emerald" | "amber" | "red" | "slate" }) {
  const tones = { emerald: "bg-emerald-50 text-emerald-900", amber: "bg-amber-50 text-amber-900", red: "bg-red-50 text-red-900", slate: "bg-slate-100 text-slate-900" }
  return <div className={`min-w-20 rounded-xl px-3 py-2 ${tones[tone]}`}><strong className="block text-lg">{value}</strong><span>{label}</span></div>
}
