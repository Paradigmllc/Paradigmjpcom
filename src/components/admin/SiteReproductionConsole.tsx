"use client"

import { useState } from "react"
import { ExternalLink, Eye, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface SitePageResult {
  id: string
  path: string
  title: string
  quality?: { score?: number; passed?: boolean; blockers?: string[]; warnings?: string[] }
  previewUrl?: string | null
}

interface SiteResult {
  ok?: boolean
  status?: string
  slug?: string
  previewUrl?: string
  artifact?: { quality?: { score?: number; passed?: boolean; blockers?: string[]; warnings?: string[] }; discovery?: Record<string, number>; visionRequired?: boolean }
  pages?: SitePageResult[]
  error?: string
}

export function SiteReproductionConsole() {
  const [companyId, setCompanyId] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [paths, setPaths] = useState("")
  const [maxPages, setMaxPages] = useState(12)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SiteResult | null>(null)

  async function run() {
    if (!companyId.trim()) return toast.error("company_idを入力してください")
    setBusy(true)
    setResult(null)
    try {
      const requestedPaths = paths.split("\n").map((value) => value.trim()).filter(Boolean)
      const response = await fetch("/api/sales/demo-site/screenshot-to-code/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId.trim(), source_url: sourceUrl.trim() || undefined, requested_paths: requestedPaths, max_pages: maxPages }),
      })
      const payload = await response.json() as SiteResult
      setResult(payload)
      if (!response.ok && response.status !== 207) throw new Error(payload.error ?? "全ページ再現に失敗しました")
      toast.success(payload.artifact?.quality?.passed ? "全ページの視覚再現が品質ゲートを通過しました" : "生成しましたが品質ゲートで要確認です")
    } catch (error) {
      console.error("[site-reproduction-console] run failed:", error)
      toast.error(error instanceof Error ? error.message : "全ページ再現に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  const quality = result?.artifact?.quality
  return (
    <section className="mx-auto mt-8 max-w-6xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-fuchsia-700">Vision-led site reproduction</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">全ページ・スクショ準拠DEMO生成</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">公開サイトの同一ドメイン内ページを巡回し、PC・モバイルを撮影。画像対応解析を通してページごとに生成し、品質ゲート合格分だけ7日間の非公開レビューURLで確認します。外部送信・公開・Twenty同期は起動しません。</p>
        </div>
        <div className="rounded-2xl bg-fuchsia-50 px-4 py-3 text-xs leading-6 text-fuchsia-950"><strong>Vision必須:</strong> 画像を読めない場合は成功扱いにしません。</div>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block text-sm font-semibold">company_id<input value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="field mt-2" placeholder="Twenty / sales_companies のUUID" /></label>
        <label className="block text-sm font-semibold">対象サイトURL（省略時は会社domain）<input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="field mt-2" placeholder="https://example.jp" /></label>
        <label className="block text-sm font-semibold">最大ページ数（最大24）<input type="number" min={1} max={24} value={maxPages} onChange={(event) => setMaxPages(Number(event.target.value))} className="field mt-2" /></label>
        <label className="block text-sm font-semibold">追加で必ず含めるパス（任意）<textarea value={paths} onChange={(event) => setPaths(event.target.value)} className="field mt-2 min-h-24 py-3" placeholder="/about\n/menu\n/contact" /></label>
      </div>
      <button type="button" disabled={busy} onClick={() => void run()} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-fuchsia-700 px-6 text-sm font-bold text-white disabled:opacity-50"><Sparkles className="h-4 w-4" />{busy ? "巡回・撮影・解析・生成中…" : "全ページを再現生成"}</button>
      {result && <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold">結果: {result.status ?? "unknown"}</p>{result.previewUrl && <a href={result.previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white"><Eye className="h-4 w-4" />全体プレビュー</a>}</div>
        {quality && <div className="mt-4 grid gap-3 sm:grid-cols-4"><Metric label="総合品質" value={`${quality.score ?? 0}/100`} /><Metric label="判定" value={quality.passed ? "合格" : "要確認"} /><Metric label="生成ページ" value={String(result.pages?.length ?? 0)} /><Metric label="Vision" value={result.artifact?.visionRequired ? "必須" : "未使用"} /></div>}
        {result.artifact?.discovery && <p className="mt-4 text-xs text-slate-600">巡回: {result.artifact.discovery.discovered ?? 0}件 / 生成: {result.artifact.discovery.generated ?? 0}件 / 撮影: {result.artifact.discovery.captured ?? 0}件</p>}
        {quality?.blockers?.map((blocker) => <p key={blocker} className="mt-2 text-xs font-semibold text-red-700">公開停止: {blocker}</p>)}
        <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">{result.pages?.map((page) => <div key={page.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"><div><p className="font-semibold">{page.title}</p><p className="text-xs text-slate-500">{page.path} / {page.quality?.score ?? 0}/100</p>{page.quality?.blockers?.map((blocker) => <p key={blocker} className="mt-1 text-xs text-red-700">{blocker}</p>)}</div>{page.previewUrl && <a href={page.previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold"><ExternalLink className="h-3.5 w-3.5" />このページ</a>}</div>)}</div>
        {result.error && <p className="mt-3 text-sm font-semibold text-red-700">{result.error}</p>}
      </div>}
      <style jsx>{`.field{height:3rem;width:100%;border-radius:.75rem;border:1px solid #cbd5e1;padding:0 .875rem;background:white;outline:none;font-weight:400}.field:focus{border-color:#a21caf}`}</style>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white px-3 py-2 text-center"><strong className="block text-lg">{value}</strong><span className="text-xs text-slate-500">{label}</span></div>
}
