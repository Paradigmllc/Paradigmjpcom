"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BriefcaseBusiness, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getJapanOperatorStageDefinition, JAPAN_OPERATOR_STAGES } from "@/lib/sales/japan-operator-workflow"
import { JapanOperatorCaseCard } from "@/components/admin/japan-operator/JapanOperatorCaseCard"
import { JapanOperatorWorkspace } from "@/components/admin/japan-operator/JapanOperatorWorkspace"
import {
  normalizeCase,
  normalizeEvent,
  type JsonRecord,
  type OperatorCase,
  type OperatorEvent,
  type OperatorPrincipal,
} from "@/components/admin/japan-operator/types"

export function JapanOperatorCaseBoard() {
  const [cases, setCases] = useState<OperatorCase[]>([])
  const [events, setEvents] = useState<OperatorEvent[]>([])
  const [principal, setPrincipal] = useState<OperatorPrincipal | null>(null)
  const [newCompanyId, setNewCompanyId] = useState("")
  const [owner, setOwner] = useState("Paradigm commercial lead")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [workspaceCase, setWorkspaceCase] = useState<OperatorCase | null>(null)

  const refresh = useCallback(async () => {
    setLoadError(null)
    try {
      const response = await fetch("/api/sales/japan-operator/cases", { cache: "no-store" })
      const payload = await response.json() as { ok?: boolean; cases?: unknown[]; events?: unknown[]; error?: string; principal?: OperatorPrincipal }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "代理店案件を取得できませんでした")
      setCases((payload.cases ?? []).map(normalizeCase).filter((item): item is OperatorCase => item !== null))
      setEvents((payload.events ?? []).map(normalizeEvent).filter((item): item is OperatorEvent => item !== null))
      setPrincipal(payload.principal ?? null)
    } catch (error) {
      console.error("[japan-operator-board] refresh failed:", error)
      const message = error instanceof Error ? error.message : "代理店案件を取得できませんでした"
      setLoadError(message)
      toast.error(message)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const stageCounts = useMemo(() => cases.reduce<Record<string, number>>((result, item) => {
    result[item.stage] = (result[item.stage] ?? 0) + 1
    return result
  }, {}), [cases])

  async function callApi(method: "POST" | "PATCH", body: JsonRecord, key: string) {
    setBusyKey(key)
    try {
      const response = await fetch("/api/sales/japan-operator/cases", {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const payload = await response.json() as { ok?: boolean; error?: string; notification?: { ok?: boolean } }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "案件を更新できませんでした")
      payload.notification?.ok === false ? toast.warning("案件は保存済みですが、通知の一部が失敗しました") : toast.success("RevenueOSへ保存しました")
      await refresh()
    } catch (error) {
      console.error("[japan-operator-board] mutation failed:", error)
      toast.error(error instanceof Error ? error.message : "案件を更新できませんでした")
    } finally { setBusyKey(null) }
  }

  if (loading) return <Card><CardContent className="flex items-center gap-3 py-10 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Japan operator案件を読込中です。</CardContent></Card>
  if (loadError) return <Card className="border-red-200 bg-red-50"><CardContent className="py-8"><p className="font-semibold text-red-900">案件を読み込めませんでした</p><p className="mt-2 text-sm text-red-800">{loadError}</p><Button className="mt-4" variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />再試行</Button></CardContent></Card>

  return (
    <section className="space-y-5" aria-labelledby="japan-operator-heading">
      <Card className="border-violet-200 bg-violet-50/60">
        <CardHeader><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><h2 id="japan-operator-heading" className="flex items-center gap-2 text-2xl font-semibold leading-none tracking-tight"><BriefcaseBusiness className="h-5 w-5 text-violet-700" />Japan Market Operator 運用OS</h2><CardDescription className="mt-2 max-w-3xl leading-6">候補収集、証跡、送信承認、契約、入金、SKU法規、運用、月次精算、KPI、終了処理を一つの案件台帳で管理します。外部送信は完全一致の承認がない限り中央ガードで停止します。</CardDescription></div><div className="flex flex-col items-end gap-2"><Badge variant="outline" className="border-violet-300 bg-white text-violet-800">外部自動送信 0</Badge><p className="text-xs text-slate-600">{principal?.email ?? principal?.key ?? "認証済み"} ・ {principal?.role ?? "—"}</p></div></div></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <div><label htmlFor="operator-company-id" className="text-xs font-semibold">RevenueOS企業UUID</label><Input id="operator-company-id" className="mt-2 bg-white font-mono text-xs" value={newCompanyId} onChange={(event) => setNewCompanyId(event.target.value)} placeholder="同一企業の再契約時も新しいEngagementとして登録" /></div>
          <div><label htmlFor="operator-owner" className="text-xs font-semibold">案件担当</label><Input id="operator-owner" className="mt-2 bg-white" value={owner} onChange={(event) => setOwner(event.target.value)} /></div>
          <Button className="self-end" disabled={busyKey !== null || !newCompanyId.trim() || owner.trim().length < 2} onClick={() => void callApi("POST", { companyId: newCompanyId.trim(), offerCode: "standard_operator_v1", owner: owner.trim(), note: "RevenueOS企業をJapan market operator案件として受け付けました。" }, "create").then(() => setNewCompanyId(""))}>標準案件として登録</Button>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{JAPAN_OPERATOR_STAGES.filter((stage) => stageCounts[stage]).map((stage) => <div key={stage} className="rounded-lg border bg-white p-3"><p className="text-[11px] font-semibold text-slate-500">{getJapanOperatorStageDefinition(stage).label}</p><p className="mt-1 text-2xl font-semibold">{stageCounts[stage]}</p></div>)}</div>
      {cases.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-slate-600">運用案件はまだありません。RevenueOS企業UUIDから最初の案件を登録してください。</CardContent></Card> : cases.map((operatorCase) => <JapanOperatorCaseCard key={`${operatorCase.id}:${operatorCase.revision}`} operatorCase={operatorCase} events={events} busyKey={busyKey} mutate={(body, key) => callApi("PATCH", body, key)} openWorkspace={() => setWorkspaceCase(operatorCase)} />)}
      <JapanOperatorWorkspace operatorCase={workspaceCase} open={workspaceCase !== null} onOpenChange={(open) => { if (!open) setWorkspaceCase(null) }} />
    </section>
  )
}
