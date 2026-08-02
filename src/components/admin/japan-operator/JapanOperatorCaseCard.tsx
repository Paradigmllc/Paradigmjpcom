"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Loader2, ShieldCheck, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  getJapanOperatorStageDefinition,
  getMissingJapanOperatorChecks,
  getNextJapanOperatorStage,
  JAPAN_OPERATOR_STAGES,
} from "@/lib/sales/japan-operator-workflow"
import type { JsonRecord, OperatorCase, OperatorEvent } from "./types"

type Draft = { owner: string; nextAction: string; dueDate: string; note: string; status: string; evidenceUrl: string; evidenceNote: string }

export type CaseMutation = (body: JsonRecord, key: string) => Promise<void>

export function JapanOperatorCaseCard(props: {
  operatorCase: OperatorCase
  events: OperatorEvent[]
  busyKey: string | null
  mutate: CaseMutation
  openWorkspace: () => void
}) {
  const { operatorCase } = props
  const [draft, setDraft] = useState<Draft>({
    owner: operatorCase.owner ?? "", nextAction: operatorCase.next_action ?? "",
    dueDate: operatorCase.next_action_due_at?.slice(0, 10) ?? "", note: "",
    status: operatorCase.status, evidenceUrl: "", evidenceNote: "",
  })
  const definition = getJapanOperatorStageDefinition(operatorCase.stage)
  const nextStage = getNextJapanOperatorStage(operatorCase.stage)
  const nextDefinition = nextStage ? getJapanOperatorStageDefinition(nextStage) : null
  const missing = nextStage ? getMissingJapanOperatorChecks(nextStage, operatorCase.gate_data) : []
  const recentEvents = useMemo(() => props.events.filter((event) => event.case_id === operatorCase.id).slice(0, 4), [operatorCase.id, props.events])
  const progress = Math.round((JAPAN_OPERATOR_STAGES.indexOf(operatorCase.stage) / (JAPAN_OPERATOR_STAGES.length - 1)) * 100)
  const terminal = ["won", "lost", "disqualified"].includes(operatorCase.status)

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-slate-100"><div className="h-full bg-violet-600" style={{ width: `${progress}%` }} /></div>
      <CardHeader>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{operatorCase.company.company_name}</CardTitle>
              <Badge>{definition.label}</Badge><Badge variant="outline">{operatorCase.status}</Badge>
            </div>
            <CardDescription className="mt-2">{operatorCase.company.domain} ・ Engagement #{operatorCase.engagement_no} ・ {operatorCase.offer_code} / {operatorCase.offer_version}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-xs text-slate-500">担当: {operatorCase.owner ?? "未設定"}</p>
            <Button size="sm" variant="outline" onClick={props.openWorkspace}><Wrench className="mr-2 h-4 w-4" />実務ワークスペース</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">現在の目的</p>
            <p className="mt-2 text-sm leading-6 text-slate-800">{definition.purpose}</p>
          </div>

          {nextDefinition ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-sm font-semibold">次: {nextDefinition.label}</p><p className="mt-1 text-xs text-slate-500">入場条件 {nextDefinition.requiredChecks.length - missing.length}/{nextDefinition.requiredChecks.length}</p></div>
                {missing.length === 0 ? <Badge className="bg-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />進行可能</Badge> : <Badge variant="outline">残り {missing.length}</Badge>}
              </div>
              <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50/60 p-3 sm:grid-cols-2">
                <div><label className="text-xs font-semibold" htmlFor={`evidence-url-${operatorCase.id}`}>証跡URL</label><Input id={`evidence-url-${operatorCase.id}`} className="mt-1 bg-white" type="url" value={draft.evidenceUrl} onChange={(event) => update({ evidenceUrl: event.target.value })} placeholder="https://…" /></div>
                <div><label className="text-xs font-semibold" htmlFor={`evidence-note-${operatorCase.id}`}>確認内容</label><Input id={`evidence-note-${operatorCase.id}`} className="mt-1 bg-white" value={draft.evidenceNote} onChange={(event) => update({ evidenceNote: event.target.value })} placeholder="誰が何を確認したか" /></div>
                <p className="text-xs leading-5 text-blue-900 sm:col-span-2">未完了のチェックを付ける際は、改ざん検知ハッシュ付きの証跡としてURLと確認内容を保存します。</p>
              </div>
              <div className="space-y-2">
                {nextDefinition.requiredChecks.map((check) => {
                  const checked = operatorCase.gate_data[nextDefinition.stage]?.[check.id] === true
                  const key = `${operatorCase.id}:${check.id}`
                  return (
                    <label key={check.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm leading-5 hover:bg-slate-50">
                      <input
                        type="checkbox" className="mt-1 h-4 w-4 rounded" checked={checked} disabled={props.busyKey !== null || terminal || (!checked && (!draft.evidenceUrl.startsWith("http") || draft.evidenceNote.trim().length < 2))}
                        onChange={(event) => void props.mutate({
                          action: "set_check", caseId: operatorCase.id, expectedRevision: operatorCase.revision,
                          stage: nextDefinition.stage, checkId: check.id, checked: event.target.checked,
                          ...(event.target.checked ? { evidence: {
                            evidenceType: "source_url", sourceUrl: draft.evidenceUrl, observedAt: new Date().toISOString(),
                            note: draft.evidenceNote, detail: { company_domain: operatorCase.company.domain },
                          } } : {}),
                        }, key)}
                      />
                      <span>{check.label}</span>{props.busyKey === key && <Loader2 className="ml-auto h-4 w-4 animate-spin" />}
                    </label>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><ShieldCheck className="mb-2 h-5 w-5" />運用中です。週次運用、月次精算、四半期KPIをワークスペースから継続してください。</div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="text-xs font-semibold">次アクション</label><Textarea rows={2} className="mt-2" value={draft.nextAction} onChange={(event) => update({ nextAction: event.target.value })} /></div>
            <div className="space-y-3"><div><label className="text-xs font-semibold">担当者</label><Input className="mt-2" value={draft.owner} onChange={(event) => update({ owner: event.target.value })} /></div><div><label className="text-xs font-semibold">期限</label><Input className="mt-2" type="date" value={draft.dueDate} onChange={(event) => update({ dueDate: event.target.value })} /></div></div>
          </div>
          <Button variant="outline" disabled={props.busyKey !== null || terminal || !draft.dueDate || !draft.nextAction.trim() || !draft.owner.trim()} onClick={() => void props.mutate({ action: "save_next_action", caseId: operatorCase.id, expectedRevision: operatorCase.revision, owner: draft.owner.trim(), nextAction: draft.nextAction.trim(), nextActionDueAt: new Date(`${draft.dueDate}T09:00:00+09:00`).toISOString() }, `${operatorCase.id}:save`)}><CalendarClock className="mr-2 h-4 w-4" />次アクションを保存</Button>
        </div>

        <div className="space-y-5 border-slate-200 xl:border-l xl:pl-6">
          <div><label className="text-xs font-semibold">監査メモ</label><Textarea className="mt-2" rows={3} value={draft.note} onChange={(event) => update({ note: event.target.value })} placeholder="根拠、判断、例外、次の責任者" /></div>
          {nextStage && <Button className="w-full" disabled={props.busyKey !== null || terminal || missing.length > 0 || draft.note.trim().length < 8} onClick={() => void props.mutate({ action: "advance", caseId: operatorCase.id, expectedRevision: operatorCase.revision, note: draft.note.trim() }, `${operatorCase.id}:advance`)}>次のステージへ<ArrowRight className="ml-2 h-4 w-4" /></Button>}
          <div>
            <p className="text-xs font-semibold">案件状態</p>
            <div className="mt-2 flex gap-2"><select aria-label="案件ステータス" className="min-h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm" value={draft.status} onChange={(event) => update({ status: event.target.value })}>{["active", "on_hold", "won", "lost", "disqualified"].map((status) => <option key={status}>{status}</option>)}</select><Button variant="outline" disabled={props.busyKey !== null || terminal || draft.status === operatorCase.status || draft.note.trim().length < 8} onClick={() => void props.mutate({ action: "set_status", caseId: operatorCase.id, expectedRevision: operatorCase.revision, status: draft.status, note: draft.note.trim() }, `${operatorCase.id}:status`)}>反映</Button></div>
            {terminal && <Button className="mt-2" variant="outline" disabled={draft.note.trim().length < 20 || props.busyKey !== null} onClick={() => void props.mutate({ action: "reopen", caseId: operatorCase.id, expectedRevision: operatorCase.revision, note: draft.note.trim() }, `${operatorCase.id}:reopen`)}>管理者理由付きで再開</Button>}
            <p className="mt-2 flex gap-2 text-xs leading-5 text-amber-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />終端状態は通常変更できません。再開は管理者と20文字以上の理由が必要です。</p>
          </div>
          <div><p className="text-xs font-semibold">直近の監査履歴</p><div className="mt-2 space-y-2">{recentEvents.map((event) => <div key={event.id} className="rounded-lg border p-3 text-xs leading-5"><p className="font-semibold">{event.action} ・ {event.actor_role ?? "system"}</p><p className="mt-1 text-slate-600">{event.note}</p><p className="mt-1 text-slate-400">{new Date(event.created_at).toLocaleString("ja-JP")}</p></div>)}</div></div>
        </div>
      </CardContent>
    </Card>
  )
}
