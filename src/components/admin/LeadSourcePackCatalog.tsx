"use client"

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Loader2, PackagePlus, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface SourcePack {
  id: string
  version: number
  name: string
  countryCode: string
  marketLabel: string
  region: string
  provider: string
  providerUrl: string
  description: string
  licenseName: string
  licenseUrl: string
  licenseCheckedAt: string
  maxRecords: number
  criteria: string[]
  registeredSource: {
    id: string
    approvalStatus: "draft" | "approved" | "suspended"
    active: boolean
    termsChecked: boolean
  } | null
}

interface LeadSourcePackCatalogProps {
  operatorName: string
  onRegistered: () => void | Promise<void>
}

export function LeadSourcePackCatalog({ operatorName, onRegistered }: LeadSourcePackCatalogProps) {
  const [packs, setPacks] = useState<SourcePack[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoadError(null)
    try {
      const response = await fetch("/api/sales/lead-source-packs", { cache: "no-store" })
      const payload = await response.json() as { ok?: boolean; packs?: SourcePack[]; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "source packを取得できませんでした")
      setPacks(payload.packs ?? [])
    } catch (error) {
      console.error("[lead-source-pack-catalog] refresh failed:", error)
      const message = error instanceof Error ? error.message : "source packを取得できませんでした"
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function register(pack: SourcePack) {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    setBusyId(pack.id)
    try {
      const response = await fetch("/api/sales/lead-source-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id, operatorName: operatorName.trim() }),
      })
      const payload = await response.json() as { ok?: boolean; created?: boolean; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "source packを登録できませんでした")
      toast.success(payload.created
        ? `${pack.marketLabel}をdraft登録しました。規約確認後にpreviewしてください`
        : `${pack.marketLabel}は登録済みです`)
      await Promise.all([refresh(), onRegistered()])
    } catch (error) {
      console.error("[lead-source-pack-catalog] registration failed:", error)
      toast.error(error instanceof Error ? error.message : "source packを登録できませんでした")
    } finally {
      setBusyId(null)
    }
  }

  async function registerAll() {
    if (!operatorName.trim()) return toast.error("操作者名を入力してください")
    const packIds = packs.filter((pack) => !pack.registeredSource).map((pack) => pack.id)
    if (packIds.length === 0) return toast.success("全source packがdraft登録済みです")
    setBusyId("all")
    try {
      const response = await fetch("/api/sales/lead-source-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packIds, operatorName: operatorName.trim() }),
      })
      const payload = await response.json() as { ok?: boolean; createdCount?: number; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "source packを一括登録できませんでした")
      toast.success(`${payload.createdCount ?? 0}件をdraft登録しました。収集開始には規約確認・preview・承認が必要です`)
      await Promise.all([refresh(), onRegistered()])
    } catch (error) {
      console.error("[lead-source-pack-catalog] bulk registration failed:", error)
      toast.error(error instanceof Error ? error.message : "source packを一括登録できませんでした")
    } finally {
      setBusyId(null)
    }
  }

  return <section className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4" aria-labelledby="lead-source-pack-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id="lead-source-pack-title" className="flex items-center gap-2 font-semibold text-slate-950"><PackagePlus className="h-4 w-4" />国別source pack</h3>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">Codexなしで再現できる版管理済みの候補元です。登録はdraft作成だけで、規約確認・preview・承認・取込・サイト事前検査を自動実行しません。</p>
      </div>
      <div className="flex flex-wrap gap-2"><Badge variant="outline" className="border-indigo-300 bg-white">外部送信 0</Badge><Button size="sm" variant="outline" disabled={busyId !== null || packs.every((pack) => pack.registeredSource)} onClick={() => void registerAll()}>{busyId === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}未登録packを一括draft登録</Button></div>
    </div>

    {loading ? <p className="py-5 text-center text-sm text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />source packを読み込み中...</p>
      : loadError ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</p>
        : packs.length === 0 ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">利用可能なsource packがありません。</p>
          : <div className="grid gap-3 lg:grid-cols-2">{packs.map((pack) => <article key={pack.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-semibold text-slate-950">{pack.marketLabel}</p><p className="mt-1 text-xs font-medium text-slate-700">{pack.provider}</p><p className="mt-1 text-xs text-slate-500">{pack.region} · {pack.countryCode} · v{pack.version} · 最大{pack.maxRecords}件</p></div>
              <Badge variant={pack.registeredSource ? "secondary" : "outline"}>{pack.registeredSource ? "登録済" : "未登録"}</Badge>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">{pack.description}</p>
            <ul className="mt-3 space-y-1 text-xs text-slate-600">{pack.criteria.map((criterion) => <li key={criterion} className="flex gap-2"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />{criterion}</li>)}</ul>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <a href={pack.providerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-700 underline">{pack.provider}<ExternalLink className="h-3 w-3" /></a>
              <a href={pack.licenseUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-700 underline">{pack.licenseName}（確認 {pack.licenseCheckedAt}）<ExternalLink className="h-3 w-3" /></a>
            </div>
            <Button className="mt-4" size="sm" variant="outline" disabled={busyId !== null || Boolean(pack.registeredSource)} aria-label={`${pack.marketLabel}のsource packをdraft登録`} onClick={() => void register(pack)}>
              {busyId === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}{pack.registeredSource ? "draft登録済み" : "draft登録"}
            </Button>
          </article>)}</div>}
  </section>
}
