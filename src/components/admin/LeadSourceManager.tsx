"use client"

import { useCallback, useEffect, useState } from "react"
import { DatabaseZap, Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface LeadSource {
  id: string
  name: string
  country_code: string
  source_type: string
  source_url: string
  source_format: string
  trust_tier: number
  active: boolean
  terms_checked: boolean
  approval_status: "draft" | "approved" | "suspended"
  approved_by: string | null
  last_preview: {
    accepted?: number
    rejected?: number
    acceptanceRate?: number
    sample?: Array<{ company_name: string; domain: string }>
  }
  last_previewed_at: string | null
  pilot_approved_by: string | null
  pilot_approved_at: string | null
  last_status: string
  last_error: string | null
  last_record_count: number
  record_count: number
  eligible_record_count: number
  last_ingested_at: string | null
  last_preflighted_at: string | null
  last_preflight?: PreflightSummary
}

interface PreflightSummary {
  total?: number
  pending?: number
  checking?: number
  eligible?: number
  retryable?: number
  rejected?: number
  reasonCounts?: Record<string, number>
  completed?: boolean
}

interface LeadSourceManagerProps {
  operatorName: string
}

const SOURCE_TYPES = [
  ["official_directory", "公的企業ディレクトリ"],
  ["export_directory", "公的輸出事業者名簿"],
  ["trade_association", "業界団体"],
  ["exhibitor_directory", "展示会出展者名簿"],
  ["company_registry", "企業登記・検証元"],
  ["structured_feed", "管理済み構造化フィード"],
] as const

const INPUT_CLASS = "mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"

export function LeadSourceManager({ operatorName }: LeadSourceManagerProps) {
  const [sources, setSources] = useState<LeadSource[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [preflightProgress, setPreflightProgress] = useState<Record<string, PreflightSummary>>({})
  const [name, setName] = useState("")
  const [countryCode, setCountryCode] = useState("US")
  const [sourceType, setSourceType] = useState("official_directory")
  const [sourceUrl, setSourceUrl] = useState("")
  const [sourceFormat, setSourceFormat] = useState("json")
  const [trustTier, setTrustTier] = useState(3)
  const [termsChecked, setTermsChecked] = useState(false)
  const [fieldMapping, setFieldMapping] = useState("{}")

  const refresh = useCallback(async () => {
    setLoadError(null)
    try {
      const response = await fetch("/api/sales/lead-sources", { cache: "no-store" })
      const payload = await response.json() as { ok?: boolean; sources?: LeadSource[]; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "収集元を取得できませんでした")
      setSources(payload.sources ?? [])
    } catch (error) {
      console.error("[lead-source-manager] refresh failed:", error)
      const message = error instanceof Error ? error.message : "収集元を取得できませんでした"
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function createSource() {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    let mapping: Record<string, unknown>
    try {
      const parsed = JSON.parse(fieldMapping) as unknown
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object required")
      mapping = parsed as Record<string, unknown>
    } catch (error) {
      console.error("[lead-source-manager] mapping JSON invalid:", error)
      return toast.error("フィールド対応はJSONオブジェクトで入力してください")
    }
    setCreating(true)
    try {
      const response = await fetch("/api/sales/lead-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, countryCode, sourceType, sourceUrl, sourceFormat, trustTier, termsChecked, fieldMapping: mapping, operatorName: operatorName.trim() }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "収集元を登録できませんでした")
      toast.success("収集元を登録しました。取込テスト後に量産へ利用できます")
      setName("")
      setSourceUrl("")
      setTermsChecked(false)
      await refresh()
    } catch (error) {
      console.error("[lead-source-manager] create failed:", error)
      toast.error(error instanceof Error ? error.message : "収集元を登録できませんでした")
    } finally {
      setCreating(false)
    }
  }

  async function patchSource(source: LeadSource, patch: { active?: boolean; termsChecked?: boolean; approvalStatus?: "draft" | "approved" | "suspended" }) {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    setBusyId(source.id)
    try {
      const response = await fetch(`/api/sales/lead-sources/${source.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, operatorName: operatorName.trim() }),
      })
      const payload = await response.json() as { ok?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "収集元を更新できませんでした")
      toast.success("収集元を更新しました")
      await refresh()
    } catch (error) {
      console.error("[lead-source-manager] update failed:", error)
      toast.error(error instanceof Error ? error.message : "収集元を更新できませんでした")
    } finally {
      setBusyId(null)
    }
  }

  async function preview(source: LeadSource) {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    setBusyId(source.id)
    try {
      const response = await fetch(`/api/sales/lead-sources/${source.id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorName: operatorName.trim() }),
      })
      const payload = await response.json() as { ok?: boolean; preview?: { accepted: number; rejected: number; acceptanceRate: number }; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "収集元をプレビューできませんでした")
      toast.success(`候補保存なしで${payload.preview?.accepted ?? 0}件を確認。採用率${payload.preview?.acceptanceRate ?? 0}%`)
      await refresh()
    } catch (error) {
      console.error("[lead-source-manager] preview failed:", error)
      toast.error(error instanceof Error ? error.message : "収集元をプレビューできませんでした")
    } finally {
      setBusyId(null)
    }
  }

  async function ingest(source: LeadSource) {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    setBusyId(source.id)
    try {
      const response = await fetch(`/api/sales/lead-sources/${source.id}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorName: operatorName.trim() }),
      })
      const payload = await response.json() as { ok?: boolean; accepted?: number; rejected?: number; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "収集元を取り込めませんでした")
      toast.success(`証拠付き企業${payload.accepted ?? 0}件を保存。不備${payload.rejected ?? 0}件`)
      await refresh()
    } catch (error) {
      console.error("[lead-source-manager] ingest failed:", error)
      toast.error(error instanceof Error ? error.message : "収集元を取り込めませんでした")
    } finally {
      setBusyId(null)
    }
  }

  async function preflight(source: LeadSource) {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    const pending = source.last_preflight?.pending ?? source.record_count
    const retryable = source.last_preflight?.retryable ?? 0
    let mode: "pending" | "retryable" | "all" | "continue" = pending > 0 ? "pending" : retryable > 0 ? "retryable" : "all"
    setBusyId(source.id)
    try {
      for (let chunk = 0; chunk < 200; chunk += 1) {
        const response = await fetch(`/api/sales/lead-sources/${source.id}/preflight`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operatorName: operatorName.trim(), mode }),
        })
        const payload = await response.json() as { ok?: boolean; remaining?: number; summary?: PreflightSummary; error?: string }
        if (!response.ok || !payload.ok || !payload.summary) throw new Error(payload.error ?? "候補サイトを事前検査できませんでした")
        setPreflightProgress((current) => ({ ...current, [source.id]: payload.summary ?? {} }))
        if ((payload.remaining ?? 0) === 0) {
          toast.success(`事前検査完了: 利用可${payload.summary.eligible ?? 0} / 一時障害${payload.summary.retryable ?? 0} / 除外${payload.summary.rejected ?? 0}`)
          await refresh()
          return
        }
        mode = "continue"
      }
      throw new Error("1回の操作上限10,000件に達しました。残件は再度実行してください")
    } catch (error) {
      console.error("[lead-source-manager] preflight failed:", error)
      toast.error(error instanceof Error ? error.message : "候補サイトを事前検査できませんでした")
    } finally {
      setBusyId(null)
      setPreflightProgress((current) => {
        const next = { ...current }
        delete next[source.id]
        return next
      })
    }
  }

  function preflightLabel(source: LeadSource): string {
    const progress = preflightProgress[source.id]
    if (progress) return `検査中 ${progress.eligible ?? 0}/${progress.total ?? source.record_count}`
    const pending = source.last_preflight?.pending ?? source.record_count
    const retryable = source.last_preflight?.retryable ?? 0
    if (pending > 0) return `未検査${pending}件を検査`
    if (retryable > 0) return `一時障害${retryable}件を再検査`
    return "全件を再検査"
  }

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><DatabaseZap className="h-5 w-5" />証拠付き収集元</CardTitle>
      <CardDescription>Trancoや検索順位は使いません。公的名簿・輸出事業者・業界団体・出展者名簿など、企業名と公式サイトを同時に確認できる収集元だけを登録します。</CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><label className="text-sm font-semibold" htmlFor="lead-source-name">収集元名</label><Input id="lead-source-name" className="mt-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="公式輸出事業者一覧" /></div>
        <div><label className="text-sm font-semibold" htmlFor="lead-source-country">国コード</label><Input id="lead-source-country" className="mt-2" maxLength={2} value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} /></div>
        <div><label className="text-sm font-semibold" htmlFor="lead-source-type">種別</label><select id="lead-source-type" className={INPUT_CLASS} value={sourceType} onChange={(event) => setSourceType(event.target.value)}>{SOURCE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div><label className="text-sm font-semibold" htmlFor="lead-source-format">形式</label><select id="lead-source-format" className={INPUT_CLASS} value={sourceFormat} onChange={(event) => setSourceFormat(event.target.value)}><option value="json">JSON</option><option value="jsonl">JSONL</option><option value="csv">CSV</option><option value="html">HTML + CSS selector</option></select></div>
        <div className="sm:col-span-2"><label className="text-sm font-semibold" htmlFor="lead-source-url">HTTPS URL</label><Input id="lead-source-url" className="mt-2" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://official.example/exporters.json" /></div>
        <div><label className="text-sm font-semibold" htmlFor="lead-source-tier">信頼Tier</label><Input id="lead-source-tier" className="mt-2" type="number" min={1} max={3} value={trustTier} onChange={(event) => setTrustTier(Number(event.target.value))} /></div>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={termsChecked} onChange={(event) => setTermsChecked(event.target.checked)} />利用規約・robots・再利用条件を確認済み</label>
        <div className="sm:col-span-2 lg:col-span-4"><label className="text-sm font-semibold" htmlFor="lead-source-mapping">フィールド対応JSON</label><Textarea id="lead-source-mapping" className="mt-2 font-mono text-xs" rows={3} value={fieldMapping} onChange={(event) => setFieldMapping(event.target.value)} placeholder={'{"company_name":"name","website_url":"website"}'} /><p className="mt-1 text-xs text-slate-500">HTMLは record_selector / company_name_selector / website_selector を指定。JSON・CSVは標準名なら {} のままで利用できます。企業詳細URLが配信元と別hostの場合は source_page_allowed_hosts に許可hostをカンマ区切りで指定します。</p></div>
        <div className="sm:col-span-2 lg:col-span-4"><Button disabled={creating || !name || !sourceUrl} onClick={() => void createSource()}>{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}収集元を登録</Button></div>
      </div>

      {loading ? <p className="py-8 text-center text-sm text-slate-500">収集元を読み込み中...</p> : loadError ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</p> : sources.length === 0 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">有効な収集元がありません。量産ランはfail-closedで開始できません。</p> : <div className="grid gap-3 lg:grid-cols-2">{sources.map((source) => <article key={source.id} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-950">{source.name}</p><a className="mt-1 block max-w-md truncate text-xs text-indigo-700 underline" href={source.source_url} target="_blank" rel="noopener noreferrer" title={source.source_url}>{source.country_code} · {source.source_type} · {source.source_format}</a></div><div className="flex flex-wrap gap-2"><Badge variant={source.active ? "default" : "outline"}>{source.active ? "有効" : "停止"}</Badge><Badge variant={source.approval_status === "approved" ? "default" : source.approval_status === "suspended" ? "destructive" : "outline"}>{source.approval_status}</Badge><Badge variant={source.last_status === "ready" ? "secondary" : source.last_status === "failed" ? "destructive" : "outline"}>{source.last_status}</Badge></div></div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4"><span>保存 {source.record_count}</span><span>利用可 {source.eligible_record_count}</span><span>Tier {source.trust_tier}</span><span>{source.pilot_approved_at ? "量産承認済" : "パイロット未承認"}</span></div>
        {source.last_previewed_at && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><p>直近プレビュー: 採用 {source.last_preview.accepted ?? 0} / 除外 {source.last_preview.rejected ?? 0} / 採用率 {source.last_preview.acceptanceRate ?? 0}%</p>{(source.last_preview.sample ?? []).length > 0 && <p className="mt-1 truncate">例: {(source.last_preview.sample ?? []).map((item) => `${item.company_name} (${item.domain})`).join("、")}</p>}</div>}
        {(source.last_preflight?.total ?? 0) > 0 && <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700"><p>サイト事前検査: 利用可 {source.last_preflight?.eligible ?? 0} / 一時障害 {source.last_preflight?.retryable ?? 0} / 除外 {source.last_preflight?.rejected ?? 0} / 未検査 {source.last_preflight?.pending ?? 0}</p>{Object.keys(source.last_preflight?.reasonCounts ?? {}).length > 0 && <p className="mt-1 text-slate-500">理由: {Object.entries(source.last_preflight?.reasonCounts ?? {}).map(([reason, count]) => `${reason} ${count}`).join("、")}</p>}</div>}
        {source.last_error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{source.last_error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">{!source.terms_checked && <Button size="sm" variant="outline" disabled={busyId !== null} onClick={() => void patchSource(source, { termsChecked: true })}><ShieldCheck className="h-4 w-4" />規約確認済みにする</Button>}<Button size="sm" variant="outline" disabled={busyId !== null || !source.terms_checked} onClick={() => void preview(source)}>{busyId === source.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}候補保存なしでプレビュー</Button>{source.approval_status !== "approved" ? <Button size="sm" variant="outline" disabled={busyId !== null || !source.last_previewed_at} onClick={() => void patchSource(source, { approvalStatus: "approved" })}>収集元を承認</Button> : <><Button size="sm" variant="outline" disabled={busyId !== null} onClick={() => void patchSource(source, { active: !source.active })}>{source.active ? "収集元を一時停止" : "収集元を有効化"}</Button><Button size="sm" variant="outline" disabled={busyId !== null} onClick={() => void patchSource(source, { approvalStatus: "suspended" })}>承認を停止</Button></>}<Button size="sm" variant="outline" disabled={busyId !== null || source.approval_status !== "approved" || !source.active} onClick={() => void ingest(source)}>承認データを取込</Button><Button size="sm" disabled={busyId !== null || source.approval_status !== "approved" || !source.active || source.record_count === 0} onClick={() => void preflight(source)}>{busyId === source.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{preflightLabel(source)}</Button></div>
      </article>)}</div>}
    </CardContent>
  </Card>
}
