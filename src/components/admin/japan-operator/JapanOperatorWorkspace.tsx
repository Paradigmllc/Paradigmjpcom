"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, ClipboardList, Loader2, RefreshCw, Send, ShieldBan } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { JsonRecord, OperatorCase, OperatorPrincipal } from "./types"
import { record } from "./types"

const ACTIONS = [
  ["record_suppression", "配信停止"], ["link_source", "収集ソース"], ["link_contract", "契約"],
  ["create_contract_draft", "DocuSeal契約下書き"], ["record_invoice", "請求・入金"], ["upsert_sku", "SKU法規・通関"], ["record_deliverable", "成果物・受入"],
  ["record_finance_period", "月次精算"], ["record_finance_line", "精算明細"], ["record_operation", "受注・在庫・返品・CS"],
  ["record_incident", "インシデント"], ["record_kpi", "KPI・独占判定"], ["record_offboarding", "終了処理"],
  ["assign_role", "権限割当"],
] as const

function dateOnly(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10)
}

function actionTemplate(action: string, operatorCase: OperatorCase): JsonRecord {
  const caseId = operatorCase.id
  switch (action) {
    case "record_suppression": return { action, companyId: operatorCase.company_id, contactKey: null, channel: "all", scope: "company", reasonCode: "operator_hold", reason: "停止理由を記載", expiresAt: null, evidenceId: null }
    case "link_source": return { action, sourceConfigId: "", offerCode: operatorCase.offer_code, cadenceHours: 168, filters: { japan_intent_required: true } }
    case "create_contract_draft": return { action, caseId, contractKind: "validation_sow", contractName: `${operatorCase.company.company_name} 日本市場検証SOW`, templateId: 0, submitterName: "", submitterEmail: "", submitterRole: "Brand", amountMinor: 0, currency: "JPY", expiresAt: null, values: {} }
    case "link_contract": return { action, caseId, contractKind: "validation_sow", salesContractId: "", docusealSubmissionId: null, status: "draft", signedAt: null, detail: {} }
    case "record_invoice": return { action, caseId, invoiceKind: "validation", provider: "stripe", externalInvoiceId: null, externalPaymentId: null, amountMinor: 500000, currency: "USD", status: "draft", issuedAt: new Date().toISOString(), dueAt: null, paidAt: null, evidenceId: null, validationCreditSourceId: null }
    case "upsert_sku": return { action, caseId, sku: "", productName: "", category: "", hsCode: null, importerOfRecord: null, sellerOfRecord: null, labelingStatus: "pending", complianceStatus: "pending", customsStatus: "pending", blockerCodes: [], evidenceId: null, detail: {} }
    case "record_deliverable": return { action, caseId, phase: "validation", deliverableType: "market_validation", title: "", description: "成果物の範囲を記載", owner: operatorCase.owner ?? "", dueAt: null, status: "planned", acceptanceCriteria: ["受入条件を記載"], acceptedAt: null, evidenceId: null, changeRequestOfId: null }
    case "record_finance_period": return { action, caseId, periodStart: dateOnly(-30), periodEnd: dateOnly(), settlementCurrency: "USD", fxRate: 1, grossMinor: 0, refundMinor: 0, taxMinor: 0, channelFeeMinor: 0, paymentFeeMinor: 0, fulfillmentMinor: 0, freightDutyMinor: 0, marketingMinor: 0, otherDeductionMinor: 0, netRevenueMinor: 0, revenueShareMinor: 0, retainerMinor: 250000, payableMinor: 0, status: "open", evidenceId: null }
    case "record_finance_line": return { action, periodId: "", externalOrderId: null, channel: "shopify", transactionAt: new Date().toISOString(), sourceCurrency: "USD", grossMinor: 0, refundMinor: 0, taxMinor: 0, channelFeeMinor: 0, paymentFeeMinor: 0, fulfillmentMinor: 0, freightDutyMinor: 0, marketingMinor: 0, otherDeductionMinor: 0, netRevenueMinor: 0, evidenceId: null, detail: {} }
    case "record_operation": return { action, caseId, recordType: "order", externalRef: null, skuId: null, status: "open", quantity: null, amountMinor: null, currency: null, occurredAt: new Date().toISOString(), dueAt: null, owner: operatorCase.owner, evidenceId: null, detail: {} }
    case "record_incident": return { action, caseId, incidentType: "quality", severity: "medium", title: "", description: "発生内容と初動を記載", occurredAt: new Date().toISOString(), owner: operatorCase.owner ?? "", evidenceId: "" }
    case "record_kpi": return { action, caseId, periodStart: dateOnly(-90), periodEnd: dateOnly(), metrics: { net_sales: 0 }, targets: { net_sales: 0 }, status: "draft", exclusivityDecision: "not_applicable", cureDueAt: null, evidenceId: null }
    case "record_offboarding": return { action, caseId, status: "planned", reason: "終了理由を記載", effectiveAt: null, checklist: { finance_reconciled: false, inventory_dispositioned: false, data_exported: false, credentials_revoked: false, support_handoff_complete: false, brand_assets_returned: false }, evidenceId: null }
    default: return { action: "assign_role", principalKey: "email:", principalEmail: null, operatorRole: "viewer", active: true, reason: "権限付与理由を記載" }
  }
}

function list(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(record) : []
}

export function JapanOperatorWorkspace(props: { operatorCase: OperatorCase | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [workspace, setWorkspace] = useState<JsonRecord>({})
  const [principal, setPrincipal] = useState<OperatorPrincipal | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [action, setAction] = useState<string>(ACTIONS[0][0])
  const [jsonInput, setJsonInput] = useState("{}")
  const [recipient, setRecipient] = useState("")
  const [message, setMessage] = useState("")
  const [requestNote, setRequestNote] = useState("")
  const [overrideReason, setOverrideReason] = useState("")

  const refresh = useCallback(async () => {
    if (!props.operatorCase) return
    setLoading(true)
    try {
      const response = await fetch(`/api/sales/japan-operator/workspace?caseId=${props.operatorCase.id}`, { cache: "no-store" })
      const payload = await response.json() as { ok?: boolean; error?: string; workspace?: JsonRecord; principal?: OperatorPrincipal }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "実務ワークスペースを読み込めませんでした")
      setWorkspace(payload.workspace ?? {})
      setPrincipal(payload.principal ?? null)
    } catch (error) {
      console.error("[japan-operator-workspace] load failed:", error)
      toast.error(error instanceof Error ? error.message : "実務ワークスペースを読み込めませんでした")
    } finally { setLoading(false) }
  }, [props.operatorCase])

  useEffect(() => {
    if (props.open && props.operatorCase) {
      setJsonInput(JSON.stringify(actionTemplate(action, props.operatorCase), null, 2))
      void refresh()
    }
  }, [props.open, props.operatorCase, refresh, action])

  async function post(body: JsonRecord) {
    setBusy(true)
    try {
      const response = await fetch("/api/sales/japan-operator/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const payload = await response.json() as { ok?: boolean; error?: string; notification?: { ok?: boolean } }
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "実務レコードを保存できませんでした")
      payload.notification?.ok === false ? toast.warning("保存済みですが、通知の一部が失敗しました") : toast.success("実務レコードを保存しました")
      await refresh()
    } catch (error) {
      console.error("[japan-operator-workspace] save failed:", error)
      toast.error(error instanceof Error ? error.message : "実務レコードを保存できませんでした")
    } finally { setBusy(false) }
  }

  const counts = useMemo(() => [
    ["証跡", list(workspace.evidence).length], ["契約", list(workspace.contracts).length], ["請求", list(workspace.invoices).length],
    ["SKU", list(workspace.skus).length], ["成果物", list(workspace.deliverables).length], ["運用", list(workspace.operations).length],
    ["事故", list(workspace.incidents).filter((row) => !["resolved", "closed"].includes(String(row.status))).length], ["KPI", list(workspace.kpis).length],
  ], [workspace])
  const pendingApprovals = list(workspace.approvals).filter((row) => row.decision === "requested")

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader><DialogTitle>{props.operatorCase?.company.company_name ?? "Japan代理店OS"} 実務ワークスペース</DialogTitle><DialogDescription>契約・請求・SKU・運用・精算・KPI・終了処理を案件IDに連結して記録します。</DialogDescription></DialogHeader>
        {loading ? <div className="flex items-center gap-2 py-12 text-sm"><Loader2 className="h-5 w-5 animate-spin" />読み込み中…</div> : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-slate-50 p-3"><div><p className="text-xs text-slate-500">認証済み操作者</p><p className="text-sm font-semibold">{principal?.email ?? principal?.key ?? "—"}</p></div><Badge>{principal?.role ?? "—"}</Badge><Button size="sm" variant="outline" onClick={() => void refresh()}><RefreshCw className="mr-2 h-4 w-4" />更新</Button></div>
            <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">{counts.map(([label, count]) => <div key={label} className="rounded-lg border p-3"><p className="text-[11px] text-slate-500">{label}</p><p className="text-xl font-semibold">{count}</p></div>)}</div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Send className="h-4 w-4" />外部送信の厳密一致承認</CardTitle></CardHeader><CardContent className="space-y-3"><Input aria-label="送信先" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="送信先URLまたはメールアドレス" /><Textarea aria-label="承認対象本文" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="実際に送る本文を完全一致で入力" rows={5} /><Input aria-label="申請理由" value={requestNote} onChange={(event) => setRequestNote(event.target.value)} placeholder="申請理由" /><Button disabled={busy || !recipient || !message || requestNote.length < 2} onClick={() => void post({ action: "request_outbound", caseId: props.operatorCase?.id, channel: "contact_form", recipient, message, note: requestNote, expiresAt: new Date(Date.now() + 24 * 3_600_000).toISOString() })}>送信承認を申請</Button></CardContent></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Check className="h-4 w-4" />承認待ち</CardTitle></CardHeader><CardContent className="space-y-3"><Input aria-label="管理者例外理由" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="同一人物承認時のみ管理者例外理由（10文字以上）" />{pendingApprovals.length === 0 ? <p className="text-sm text-slate-500">承認待ちはありません。</p> : pendingApprovals.map((approval) => { const detail = record(approval.detail); return <div key={String(approval.id)} className="rounded-lg border p-3 text-xs"><p className="font-semibold break-all">{String(detail.recipient ?? "—")}</p><p className="mt-2 line-clamp-4 whitespace-pre-wrap">{String(detail.message ?? "")}</p><Button className="mt-3" size="sm" disabled={busy} onClick={() => void post({ action: "approve_outbound", approvalId: approval.id, ...(overrideReason ? { overrideReason } : {}) })}>完全一致で承認</Button></div> })}</CardContent></Card>
            </div>

            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ClipboardList className="h-4 w-4" />実務レコード登録</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-col gap-2 sm:flex-row"><select aria-label="実務レコード種別" className="min-h-10 flex-1 rounded-md border bg-white px-3 text-sm" value={action} onChange={(event) => { const next = event.target.value; setAction(next); if (props.operatorCase) setJsonInput(JSON.stringify(actionTemplate(next, props.operatorCase), null, 2)) }}>{ACTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><Button variant="outline" onClick={() => props.operatorCase && setJsonInput(JSON.stringify(actionTemplate(action, props.operatorCase), null, 2))}>入力例に戻す</Button></div><Textarea aria-label="実務レコードJSON" className="min-h-72 font-mono text-xs" value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} /><div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><ShieldBan className="mt-0.5 h-4 w-4 shrink-0" />操作者IDはサーバーが認証情報から付与します。paid・accepted・completed・critical等の重要状態は証跡IDと権限が不足するとDB/APIで拒否されます。</div><Button disabled={busy} onClick={() => { try { void post(JSON.parse(jsonInput) as JsonRecord) } catch (error) { console.error("[japan-operator-workspace] JSON parse failed:", error); toast.error("JSON形式を確認してください") } }}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}登録する</Button></CardContent></Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Summary title="SKU readiness" rows={list(workspace.skus)} empty="SKU未登録" fields={["sku", "product_name", "compliance_status", "customs_status"]} />
              <Summary title="Finance close" rows={list(workspace.financePeriods)} empty="精算期間未登録" fields={["period_start", "period_end", "status", "payable_minor"]} />
              <Summary title="Incidents / KPI" rows={[...list(workspace.incidents), ...list(workspace.kpis)]} empty="記録なし" fields={["title", "severity", "status", "period_start"]} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Summary(props: { title: string; rows: JsonRecord[]; empty: string; fields: string[] }) {
  return <Card><CardHeader><CardTitle className="text-sm">{props.title}</CardTitle></CardHeader><CardContent className="space-y-2">{props.rows.length === 0 ? <p className="text-xs text-slate-500">{props.empty}</p> : props.rows.slice(0, 5).map((row, index) => <div key={String(row.id ?? index)} className="rounded border p-2 text-xs">{props.fields.filter((field) => row[field] !== null && row[field] !== undefined).map((field) => <p key={field}><span className="text-slate-500">{field}: </span>{String(row[field])}</p>)}</div>)}</CardContent></Card>
}
