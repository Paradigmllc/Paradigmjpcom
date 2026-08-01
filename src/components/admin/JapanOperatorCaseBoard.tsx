"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, ArrowRight, BriefcaseBusiness, CalendarClock, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  getJapanOperatorStageDefinition,
  getMissingJapanOperatorChecks,
  getNextJapanOperatorStage,
  isJapanOperatorStage,
  JAPAN_OPERATOR_STAGES,
  type JapanOperatorGateData,
  type JapanOperatorStage,
} from "@/lib/sales/japan-operator-workflow"

type JsonRecord = Record<string, unknown>

interface CompanySummary {
  id: string
  company_name: string
  domain: string
}

interface OperatorCase {
  id: string
  company_id: string
  offer_code: string
  stage: JapanOperatorStage
  status: string
  owner: string | null
  reviewer: string | null
  next_action: string | null
  next_action_due_at: string | null
  gate_data: JapanOperatorGateData
  blocker_codes: string[]
  stage_entered_at: string
  revision: number
  updated_at: string
  company: CompanySummary
}

interface OperatorEvent {
  id: string
  case_id: string
  action: string
  from_stage: string | null
  to_stage: string | null
  actor: string
  note: string
  created_at: string
}

interface CaseDraft {
  owner: string
  nextAction: string
  dueDate: string
  note: string
  status: string
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {}
}

function textValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function normalizeCompany(value: unknown): CompanySummary {
  const row = record(Array.isArray(value) ? value[0] : value)
  return {
    id: textValue(row.id),
    company_name: textValue(row.company_name, "名称未取得"),
    domain: textValue(row.domain, "—"),
  }
}

function normalizeGateData(value: unknown): JapanOperatorGateData {
  const source = record(value)
  return Object.fromEntries(Object.entries(source).flatMap(([stage, checks]) => {
    if (!isJapanOperatorStage(stage)) return []
    const values = record(checks)
    return [[stage, Object.fromEntries(Object.entries(values).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"))]]
  }))
}

function normalizeCase(value: unknown): OperatorCase | null {
  const row = record(value)
  const id = textValue(row.id)
  const stage = row.stage
  if (!id || !isJapanOperatorStage(stage)) return null
  return {
    id,
    company_id: textValue(row.company_id),
    offer_code: textValue(row.offer_code),
    stage,
    status: textValue(row.status, "active"),
    owner: textValue(row.owner) || null,
    reviewer: textValue(row.reviewer) || null,
    next_action: textValue(row.next_action) || null,
    next_action_due_at: textValue(row.next_action_due_at) || null,
    gate_data: normalizeGateData(row.gate_data),
    blocker_codes: Array.isArray(row.blocker_codes) ? row.blocker_codes.filter((item): item is string => typeof item === "string") : [],
    stage_entered_at: textValue(row.stage_entered_at),
    revision: typeof row.revision === "number" ? row.revision : 1,
    updated_at: textValue(row.updated_at),
    company: normalizeCompany(row.sales_companies),
  }
}

function normalizeEvent(value: unknown): OperatorEvent | null {
  const row = record(value)
  const id = textValue(row.id)
  if (!id) return null
  return {
    id,
    case_id: textValue(row.case_id),
    action: textValue(row.action),
    from_stage: textValue(row.from_stage) || null,
    to_stage: textValue(row.to_stage) || null,
    actor: textValue(row.actor),
    note: textValue(row.note),
    created_at: textValue(row.created_at),
  }
}

function dueDateValue(value: string | null): string {
  return value ? value.slice(0, 10) : ""
}

function caseDraft(operatorCase: OperatorCase): CaseDraft {
  return {
    owner: operatorCase.owner ?? "",
    nextAction: operatorCase.next_action ?? "",
    dueDate: dueDateValue(operatorCase.next_action_due_at),
    note: "",
    status: operatorCase.status,
  }
}

export function JapanOperatorCaseBoard() {
  const [cases, setCases] = useState<OperatorCase[]>([])
  const [events, setEvents] = useState<OperatorEvent[]>([])
  const [drafts, setDrafts] = useState<Record<string, CaseDraft>>({})
  const [actor, setActor] = useState("")
  const [newCompanyId, setNewCompanyId] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoadError(null)
    try {
      const response = await fetch("/api/sales/japan-operator/cases", { cache: "no-store" })
      const payload = await response.json() as { ok?: boolean; cases?: unknown[]; events?: unknown[]; error?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "運用案件を取得できませんでした")
      const normalizedCases = (payload.cases ?? []).map(normalizeCase).filter((item): item is OperatorCase => item !== null)
      setCases(normalizedCases)
      setEvents((payload.events ?? []).map(normalizeEvent).filter((item): item is OperatorEvent => item !== null))
      setDrafts(Object.fromEntries(normalizedCases.map((item) => [item.id, caseDraft(item)])))
    } catch (error) {
      console.error("[japan-operator-board] refresh failed:", error)
      const message = error instanceof Error ? error.message : "運用案件を取得できませんでした"
      setLoadError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const stageCounts = useMemo(() => cases.reduce<Record<string, number>>((result, item) => {
    result[item.stage] = (result[item.stage] ?? 0) + 1
    return result
  }, {}), [cases])

  async function callApi(method: "POST" | "PATCH", body: JsonRecord, key: string) {
    if (actor.trim().length < 2) return toast.error("監査履歴に残す担当者名を入力してください")
    setBusyKey(key)
    try {
      const response = await fetch("/api/sales/japan-operator/cases", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await response.json() as { ok?: boolean; error?: string; notification?: { ok?: boolean } }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "案件を更新できませんでした")
      if (payload.notification?.ok === false) toast.warning("案件は保存済みですが、DBベルまたはSlack通知を確認してください")
      else toast.success("RevenueOSへ保存しました")
      await refresh()
    } catch (error) {
      console.error("[japan-operator-board] mutation failed:", error)
      toast.error(error instanceof Error ? error.message : "案件を更新できませんでした")
    } finally {
      setBusyKey(null)
    }
  }

  async function createCase() {
    await callApi("POST", {
      companyId: newCompanyId.trim(),
      offerCode: "standard_operator_v1",
      actor: actor.trim(),
      owner: actor.trim(),
      note: "RevenueOS企業を外部Japan market operator候補として受付",
    }, "create")
    setNewCompanyId("")
  }

  function updateDraft(caseId: string, patch: Partial<CaseDraft>) {
    setDrafts((current) => ({ ...current, [caseId]: { ...current[caseId], ...patch } as CaseDraft }))
  }

  if (loading) {
    return <Card><CardContent className="flex items-center gap-3 py-10 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Japan operator案件を読込中です。</CardContent></Card>
  }

  if (loadError) {
    return (
      <Card className="border-red-200 bg-red-50"><CardContent className="py-8">
        <p className="font-semibold text-red-900">案件を読み込めませんでした</p>
        <p className="mt-2 text-sm text-red-800">{loadError}</p>
        <Button className="mt-4" variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />再試行</Button>
      </CardContent></Card>
    )
  }

  return (
    <section className="space-y-5" aria-labelledby="japan-operator-heading">
      <Card className="border-violet-200 bg-violet-50/60">
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <CardTitle id="japan-operator-heading" className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-violet-700" />Japan Market Operator 運用ボード</CardTitle>
              <CardDescription className="mt-2 max-w-3xl leading-6">Wave 1を、根拠確認から契約・運営まで同じゲートで管理します。この画面は外部メッセージを送信しません。送信は人間承認後に別経路で実行し、日時と経路だけをここへ記録します。</CardDescription>
            </div>
            <Badge variant="outline" className="w-fit border-violet-300 bg-white text-violet-800">外部自動送信 0</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <div>
            <label htmlFor="operator-actor" className="text-xs font-semibold text-slate-700">操作担当者名</label>
            <Input id="operator-actor" value={actor} onChange={(event) => setActor(event.target.value)} placeholder="例: Yamada / Commercial lead" className="mt-2 bg-white" />
          </div>
          <div>
            <label htmlFor="operator-company-id" className="text-xs font-semibold text-slate-700">新規RevenueOS企業UUID</label>
            <Input id="operator-company-id" value={newCompanyId} onChange={(event) => setNewCompanyId(event.target.value)} placeholder="既存企業を案件化する場合のみ" className="mt-2 bg-white font-mono text-xs" />
          </div>
          <Button className="self-end" disabled={busyKey !== null || !newCompanyId.trim()} onClick={() => void createCase()}>標準案件として登録</Button>
        </CardContent>
      </Card>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {JAPAN_OPERATOR_STAGES.filter((stage) => stageCounts[stage]).map((stage) => (
          <div key={stage} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold text-slate-500">{getJapanOperatorStageDefinition(stage).label}</p>
            <p className="mt-1 text-2xl font-semibold">{stageCounts[stage]}</p>
          </div>
        ))}
      </div>

      {cases.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-slate-600">運用案件はまだありません。RevenueOS企業UUIDから最初の案件を登録してください。</CardContent></Card>
      ) : cases.map((operatorCase) => {
        const definition = getJapanOperatorStageDefinition(operatorCase.stage)
        const nextStage = getNextJapanOperatorStage(operatorCase.stage)
        const nextDefinition = nextStage ? getJapanOperatorStageDefinition(nextStage) : null
        const missing = nextStage ? getMissingJapanOperatorChecks(nextStage, operatorCase.gate_data) : []
        const draft = drafts[operatorCase.id] ?? caseDraft(operatorCase)
        const progress = Math.round((JAPAN_OPERATOR_STAGES.indexOf(operatorCase.stage) / (JAPAN_OPERATOR_STAGES.length - 1)) * 100)
        const recentEvents = events.filter((event) => event.case_id === operatorCase.id).slice(0, 3)
        return (
          <Card key={operatorCase.id} className="overflow-hidden">
            <div className="h-1 bg-slate-100"><div className="h-full bg-violet-600" style={{ width: `${progress}%` }} /></div>
            <CardHeader>
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{operatorCase.company.company_name}</CardTitle>
                    <Badge>{definition.label}</Badge>
                    <Badge variant="outline">{operatorCase.status}</Badge>
                  </div>
                  <CardDescription className="mt-2">{operatorCase.company.domain} · {operatorCase.offer_code} · rev {operatorCase.revision}</CardDescription>
                </div>
                <div className="text-right text-xs text-slate-500"><p>担当: {operatorCase.owner ?? "未設定"}</p><p className="mt-1">ステージ開始: {operatorCase.stage_entered_at ? new Date(operatorCase.stage_entered_at).toLocaleString("ja-JP") : "—"}</p></div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
              <div className="space-y-5">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">現在の目的</p>
                  <p className="mt-2 text-sm leading-6 text-slate-800">{definition.purpose}</p>
                </div>

                {nextDefinition ? (
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-sm font-semibold">次: {nextDefinition.label}</p><p className="mt-1 text-xs text-slate-500">入場条件 {nextDefinition.requiredChecks.length - missing.length}/{nextDefinition.requiredChecks.length} · 標準SLA {nextDefinition.slaBusinessDays ?? "継続"}営業日</p></div>
                      {missing.length === 0 ? <Badge className="bg-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />進行可能</Badge> : <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">残り {missing.length}</Badge>}
                    </div>
                    <div className="mt-3 space-y-2">
                      {nextDefinition.requiredChecks.map((check) => {
                        const checked = operatorCase.gate_data[nextDefinition.stage]?.[check.id] === true
                        const key = `${operatorCase.id}:${check.id}`
                        return (
                          <label key={check.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm leading-5 hover:bg-slate-50">
                            <input type="checkbox" className="mt-1 h-4 w-4 rounded" checked={checked} disabled={busyKey !== null || actor.trim().length < 2} onChange={(event) => void callApi("PATCH", { action: "set_check", caseId: operatorCase.id, expectedRevision: operatorCase.revision, actor: actor.trim(), stage: nextDefinition.stage, checkId: check.id, checked: event.target.checked }, key)} />
                            <span>{check.label}</span>
                            {busyKey === key && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ) : <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><ShieldCheck className="mb-2 h-5 w-5" />運営中の最終ステージです。週次報告、月次精算、四半期KPI判定を継続してください。</div>}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div><label className="text-xs font-semibold text-slate-700">次アクション</label><Textarea rows={2} className="mt-2" value={draft.nextAction} onChange={(event) => updateDraft(operatorCase.id, { nextAction: event.target.value })} /></div>
                  <div className="space-y-3"><div><label className="text-xs font-semibold text-slate-700">担当者</label><Input className="mt-2" value={draft.owner} onChange={(event) => updateDraft(operatorCase.id, { owner: event.target.value })} /></div><div><label className="text-xs font-semibold text-slate-700">期限</label><Input className="mt-2" type="date" value={draft.dueDate} onChange={(event) => updateDraft(operatorCase.id, { dueDate: event.target.value })} /></div></div>
                </div>
                <Button variant="outline" disabled={busyKey !== null || !draft.dueDate || !draft.nextAction.trim() || !draft.owner.trim()} onClick={() => void callApi("PATCH", { action: "save_next_action", caseId: operatorCase.id, expectedRevision: operatorCase.revision, actor: actor.trim(), owner: draft.owner.trim(), nextAction: draft.nextAction.trim(), nextActionDueAt: new Date(`${draft.dueDate}T09:00:00+09:00`).toISOString() }, `${operatorCase.id}:save`)}><CalendarClock className="mr-2 h-4 w-4" />次アクションを保存</Button>
              </div>

              <div className="space-y-5 border-slate-200 xl:border-l xl:pl-6">
                {nextStage && <div><label className="text-xs font-semibold text-slate-700">ステージ変更の監査メモ</label><Textarea className="mt-2" rows={3} value={draft.note} onChange={(event) => updateDraft(operatorCase.id, { note: event.target.value })} placeholder="確認した根拠、判断、例外、次の責任者を記録" /><Button className="mt-3 w-full" disabled={busyKey !== null || missing.length > 0 || draft.note.trim().length < 8} onClick={() => void callApi("PATCH", { action: "advance", caseId: operatorCase.id, expectedRevision: operatorCase.revision, actor: actor.trim(), note: draft.note.trim() }, `${operatorCase.id}:advance`)}>次のステージへ<ArrowRight className="ml-2 h-4 w-4" /></Button></div>}

                <div><p className="text-xs font-semibold text-slate-700">案件の停止・終了</p><div className="mt-2 flex gap-2"><select aria-label="案件ステータス" className="min-h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm" value={draft.status} onChange={(event) => updateDraft(operatorCase.id, { status: event.target.value })}>{["active", "on_hold", "won", "lost", "disqualified"].map((status) => <option key={status}>{status}</option>)}</select><Button variant="outline" disabled={busyKey !== null || draft.status === operatorCase.status || draft.note.trim().length < 8} onClick={() => void callApi("PATCH", { action: "set_status", caseId: operatorCase.id, expectedRevision: operatorCase.revision, actor: actor.trim(), status: draft.status, note: draft.note.trim() }, `${operatorCase.id}:status`)}>反映</Button></div><p className="mt-2 flex items-start gap-2 text-xs leading-5 text-amber-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />停止・失注・不適格の理由は上の監査メモへ必ず記載します。</p></div>

                <div><p className="text-xs font-semibold text-slate-700">直近の監査履歴</p><div className="mt-2 space-y-2">{recentEvents.length > 0 ? recentEvents.map((event) => <div key={event.id} className="rounded-lg border border-slate-200 p-3 text-xs leading-5"><p className="font-semibold">{event.action} · {event.actor}</p><p className="mt-1 text-slate-600">{event.note}</p><p className="mt-1 text-slate-400">{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : ""}</p></div>) : <p className="text-xs text-slate-500">履歴はまだありません。</p>}</div></div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
