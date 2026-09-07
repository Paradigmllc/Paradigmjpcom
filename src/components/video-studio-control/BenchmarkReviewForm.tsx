"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { benchmarkAxes, benchmarkDefects, benchmarkGenres, benchmarkSchema, benchmarkScore, benchmarkThreshold } from "@/lib/video-studio-control/benchmark"
import type { GenerationControlDashboard } from "@/lib/video-studio-control/types"

const genreNames = { explainer: "解説", avatar: "アバター", anime: "アニメ", manga: "漫画", product: "商品広告", landscape: "風景", music: "音楽", brand: "ブランド" }
const defectNames = { identity_break: "人物・被写体の不一致", product_distortion: "商品の変形", frozen_motion: "意図しない静止", unreadable_text: "文字の破綻", audio_desync: "音ズレ", rights_unresolved: "権利未確認", watermark: "透かし", corrupt_output: "ファイル破損" }

async function digest(bytes: BufferSource) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((b) => b.toString(16).padStart(2, "0")).join("")
}

export function BenchmarkReviewForm({ dashboard, busy, onSave }: {
  dashboard: GenerationControlDashboard; busy: boolean; onSave: (body: Record<string, unknown>) => Promise<void>
}) {
  const [runId, setRunId] = useState("")
  const [genre, setGenre] = useState<(typeof benchmarkGenres)[number]>("product")
  const [caseId, setCaseId] = useState("")
  const [protocol, setProtocol] = useState("")
  const [note, setNote] = useState("")
  const [scores, setScores] = useState<Record<string, string>>({})
  const [excluded, setExcluded] = useState<string[]>([])
  const [defects, setDefects] = useState<string[]>([])
  const [approved, setApproved] = useState(false)
  const [cost, setCost] = useState("")
  const [repair, setRepair] = useState("")
  const [media, setMedia] = useState<{ url: string; hash: string } | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [hashing, setHashing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [watched, setWatched] = useState(false)
  const selection = useRef(0)
  const locked = busy || hashing || submitting
  useEffect(() => () => { if (media) URL.revokeObjectURL(media.url) }, [media])
  useEffect(() => () => { if (reference) URL.revokeObjectURL(reference) }, [reference])
  const run = dashboard.runs.find((item) => item.id === runId && item.state === "succeeded")
  const parsed = benchmarkSchema.safeParse({
    rubricVersion: "studio-8axis-v1", genre, caseId, protocolHash: "0".repeat(64), artifactSha256: media?.hash,
    scores: Object.fromEntries(benchmarkAxes.map(({ key }) => [key, excluded.includes(key) ? null : scores[key]?.trim() ? Number(scores[key]) : undefined])),
    blockingDefects: defects, totalCostCents: cost.trim() ? Number(cost) : null, repairMinutes: repair.trim() ? Number(repair) : null,
  })
  const total = parsed.success ? benchmarkScore(parsed.data) : null
  const canApprove = total !== null && !!run && total >= benchmarkThreshold(run.qualityTier) && defects.length === 0
  const ready = !!run && parsed.success && protocol.trim().length >= 10 && note.trim().length >= 10 && watched

  const load = async (file?: File) => {
    const current = ++selection.current
    setMedia(null); setWatched(false); setApproved(false)
    if (!file) { setHashing(false); return }
    setHashing(true)
    try {
      if (!file.type.startsWith("video/") || file.size > 100 * 1024 * 1024) throw new Error("100MB以下の確認用動画を選択してください")
      const hash = await digest(await file.arrayBuffer())
      if (selection.current === current) setMedia({ url: URL.createObjectURL(file), hash })
    } catch (error) { console.error("[benchmark] local media failed", error); toast.error(error instanceof Error ? error.message : "動画を確認できませんでした") }
    finally { if (selection.current === current) setHashing(false) }
  }
  const save = async () => {
    if (!ready || !parsed.success || !media || locked) return
    setSubmitting(true)
    try {
      const protocolHash = await digest(new TextEncoder().encode(protocol.trim()))
      await onSave({ action: "review_benchmark", runId, benchmark: { ...parsed.data, protocolHash }, approved: approved && canApprove, note })
      setApproved(false)
    } catch (error) { console.error("[benchmark] save failed", error); toast.error(error instanceof Error ? error.message : "評価を保存できませんでした") }
    finally { setSubmitting(false) }
  }
  return <Card><CardHeader><CardTitle className="text-base">8項目・実映像ベンチマーク</CardTitle></CardHeader><CardContent><fieldset disabled={locked} className="space-y-4">
    <p className="text-sm text-zinc-600">未入力は未評価です。合格点は仮基準（75 / 85 / 90）。技術テストの合格とは別に実映像を審査します。比較条件・対象項目が異なる評価は集計を分けます。</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-xs font-semibold">評価対象の生成<select aria-label="品質レビュー対象run" className="mt-1 block min-h-10 w-full rounded border px-2" value={runId} onChange={(event) => { setRunId(event.target.value); setApproved(false); setWatched(false); setScores({}); setDefects([]); setNote(""); setCost(""); setRepair(""); setExcluded([]) }}><option value="">完了した生成を選択</option>{dashboard.runs.filter((item) => item.state === "succeeded").map((item) => <option key={item.id} value={item.id}>{item.selectedProvider} · {item.id.slice(0, 8)}</option>)}</select></label>
      <label className="text-xs font-semibold">ジャンル<select aria-label="評価ジャンル" value={genre} onChange={(event) => { setGenre(event.target.value as typeof genre); setApproved(false) }} className="mt-1 block min-h-10 w-full rounded border px-2">{benchmarkGenres.map((key) => <option key={key} value={key}>{genreNames[key]}</option>)}</select></label>
      <label className="text-xs font-semibold">評価ケースID（例 coffee-steam-v1）<Input aria-label="評価ケースID" value={caseId} onChange={(event) => setCaseId(event.target.value)} /></label>
    </div>
    <label className="block text-xs font-semibold">固定の比較条件（構図・動き・参照素材のハッシュ・尺・解像度・言語など。DBにはハッシュのみ保存）<textarea aria-label="固定の比較条件" className="mt-1 min-h-20 w-full rounded border p-2" maxLength={4000} value={protocol} onChange={(event) => setProtocol(event.target.value)} /></label>
    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
      <div className="space-y-2"><label className="block text-xs font-semibold">今回の動画（端末内プレビュー・アップロードなし）<Input aria-label="評価する動画" type="file" accept="video/*" disabled={busy} onChange={(event) => void load(event.target.files?.[0])} /></label>{hashing && <p role="status">動画のハッシュを計算中…</p>}{media && <><video className="aspect-video w-full rounded bg-black" aria-label="今回の評価動画" controls playsInline src={media.url} onError={() => { setWatched(false); toast.error("この動画をブラウザで再生できません") }} /><p className="break-all text-xs text-zinc-500">SHA-256: {media.hash}</p></>}</div>
      <div className="space-y-2"><label className="block text-xs font-semibold">比較用動画（任意・保存されません）<Input aria-label="比較用動画" type="file" accept="video/*" onChange={(event) => { const file = event.target.files?.[0]; setReference(null); if (file && file.type.startsWith("video/") && file.size <= 100 * 1024 * 1024) setReference(URL.createObjectURL(file)); else if (file) toast.error("100MB以下の動画を選択してください") }} /></label>{reference && <video className="aspect-video w-full rounded bg-black" aria-label="比較用の参考動画" controls playsInline src={reference} />}</div>
    </div>
    <p className="text-xs text-amber-800">ファイルと生成runの対応・費用はレビュー担当者の申告です。サーバー側の成果物照合や実課金確認ではなく、納品許可・自動再利用には使いません。</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benchmarkAxes.map((axis) => <div key={axis.key} className="space-y-1"><label className="text-xs font-semibold">{axis.label}（重み {axis.weight}）<Input aria-label={axis.label} type="number" min={0} max={100} step={1} placeholder="未評価" value={scores[axis.key] ?? ""} disabled={excluded.includes(axis.key)} onChange={(event) => { setScores((old) => ({ ...old, [axis.key]: event.target.value })); setApproved(false) }} /></label>{axis.optional && <label className="flex items-center gap-2 text-xs"><input aria-label={`${axis.label}は対象外`} type="checkbox" checked={excluded.includes(axis.key)} onChange={(event) => { setExcluded((old) => event.target.checked ? [...old, axis.key] : old.filter((key) => key !== axis.key)); setApproved(false) }} />対象外（根拠に理由を記載）</label>}</div>)}</div>
    <fieldset className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><legend className="mb-2 text-sm font-semibold">重大欠陥（1つでもあれば不合格）</legend>{benchmarkDefects.map((key) => <label key={key} className="flex items-center gap-2 text-xs"><input aria-label={defectNames[key]} type="checkbox" checked={defects.includes(key)} onChange={(event) => { setDefects((old) => event.target.checked ? [...old, key] : old.filter((item) => item !== key)); setApproved(false) }} />{defectNames[key]}</label>)}</fieldset>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">試行全体の申告原価（USD cent・不明は空欄）<Input aria-label="申告原価" type="number" min={0} value={cost} onChange={(event) => setCost(event.target.value)} /></label><label className="text-xs font-semibold">手直し時間（分・不明は空欄）<Input aria-label="手直し時間" type="number" min={0} value={repair} onChange={(event) => setRepair(event.target.value)} /></label></div>
    <label className="block text-xs font-semibold">レビュー根拠（問題の時刻・理由・対象外項目の理由。秘密情報を含めない）<textarea aria-label="レビュー根拠" className="mt-1 min-h-20 w-full rounded border p-2" maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
    <p role="status" className="text-sm font-semibold">総合：{total === null ? "未評価" : `${total}/100`} · 合格には {run ? benchmarkThreshold(run.qualityTier) : "—"} 点以上と重大欠陥ゼロが必要</p>
    <label className="flex items-center gap-2 text-sm"><input aria-label="全編を確認済み" type="checkbox" disabled={!media} checked={watched} onChange={(event) => setWatched(event.target.checked)} />選択runの映像であることと全編を確認した</label>
    <label className="flex items-center gap-2 text-sm"><input aria-label="品質合格" type="checkbox" disabled={!canApprove || !watched} checked={approved && canApprove} onChange={(event) => setApproved(event.target.checked)} />品質合格として記録（納品の承認ではありません）</label>
    <Button aria-label="実映像の評価を保存" disabled={locked || !ready} onClick={() => void save()}>{submitting || busy ? "保存中…" : "実映像の評価を保存"}</Button>
    {dashboard.runs.every((item) => item.state !== "succeeded") && <p className="text-sm text-zinc-500">評価可能な生成結果がまだありません。予約やキャッシュの再利用を新しい生成実績として評価しません。</p>}
  </fieldset></CardContent></Card>
}

export function BenchmarkResults({ dashboard }: { dashboard: GenerationControlDashboard }) {
  return <Card><CardHeader><CardTitle className="text-base">同条件・ジャンル別の品質比較</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="text-xs text-zinc-500">直近100レビュー内で、各runの最新評価のみ。異なるケース・条件・対象項目・品質tierは別集計です。未評価の失敗ジョブを含まないため、全運用の採用率やSaaS優劣を示す数値ではありません。原価は全費用を含む担当者申告で、未確定があれば表示しません。</p>
    {!dashboard.benchmarkGroups?.length ? <p className="text-sm text-zinc-500">実映像の比較評価はまだありません。</p> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{dashboard.benchmarkGroups.map((item) => <article key={`${item.provider}-${item.qualityTier}-${item.genre}-${item.caseId}-${item.protocolHash}-${item.applicability}`} className="rounded border p-3 text-sm">
      <p className="font-bold">{item.provider} · {genreNames[item.genre]} · {item.caseId}</p>
      <p className="text-xs text-zinc-500">条件 {item.protocolHash.slice(0, 12)} · 基準 {benchmarkThreshold(item.qualityTier)}点</p>
      <p className="mt-2">{item.averageScore}/100 · {item.reviewCount}本 · 合格率 {item.approvalRate}%</p>
      <p>採用1本あたり申告原価：{item.costPerAcceptedCents === null ? "未確定／採用なし" : `$${(item.costPerAcceptedCents / 100).toFixed(2)}`}</p>
      <p>手直し合計：{item.repairMinutes === null ? "未確定" : `${item.repairMinutes}分`}</p>
    </article>)}</div>}
  </CardContent></Card>
}
