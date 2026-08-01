"use client"

import { useState } from "react"
import { Loader2, ScanSearch, Wrench } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RepairAnomaly {
  companyId: string
  domain: string
  reasons: string[]
  repaired: boolean
  error: string | null
}

interface RepairResult {
  scanned: number
  drifted: number
  repaired: number
  failed: number
  anomalies: RepairAnomaly[]
}

export function ListLeadRepairPanel({ operatorName }: { operatorName: string }) {
  const [busy, setBusy] = useState<"preview" | "repair" | null>(null)
  const [result, setResult] = useState<RepairResult | null>(null)

  async function run(action: "preview" | "repair") {
    if (operatorName.trim().length < 2) return toast.error("操作者名を入力してください")
    setBusy(action)
    try {
      const response = await fetch("/api/sales/lead-candidates/list-only/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, operatorName: operatorName.trim(), limit: 100 }),
      })
      const payload = await response.json() as RepairResult & { ok?: boolean; error?: string }
      if (!response.ok && response.status !== 207) throw new Error(payload.error ?? "Twenty整合性を確認できませんでした")
      setResult(payload)
      if (action === "preview") toast.success(`${payload.scanned}社を確認、不整合${payload.drifted}社`)
      else if (payload.failed > 0) toast.warning(`${payload.repaired}社を修復、失敗${payload.failed}社`)
      else toast.success(`${payload.repaired}社を修復。外部送信0件`)
    } catch (error) {
      console.error("[list-lead-repair-panel] failed:", error)
      toast.error(error instanceof Error ? error.message : "Twenty整合性を確認できませんでした")
    } finally {
      setBusy(null)
    }
  }

  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />既存候補のTwenty整合性</CardTitle>
      <CardDescription>list-only候補のTwenty ID、候補カルテ、旧レポート項目を監査し、不整合だけを安全に再同期します。Opportunity・文面・レポート・外部送信は生成しません。</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={busy !== null} onClick={() => void run("preview")}>
          {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}不整合を確認
        </Button>
        <Button type="button" disabled={busy !== null || !result || result.drifted === 0} onClick={() => void run("repair")}>
          {busy === "repair" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}不整合だけ修復
        </Button>
        <Badge variant="outline">外部送信 0件固定</Badge>
      </div>
      {result && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="flex flex-wrap gap-4"><span>確認 {result.scanned}</span><span>不整合 {result.drifted}</span><span>修復 {result.repaired}</span><span className={result.failed > 0 ? "text-red-700" : ""}>失敗 {result.failed}</span></div>
        {result.anomalies.length > 0 && <ul className="mt-3 space-y-1 text-xs text-slate-600">{result.anomalies.slice(0, 10).map((item) => <li key={item.companyId}>{item.domain}: {item.reasons.join(", ")}{item.error ? ` / ${item.error}` : ""}</li>)}</ul>}
      </div>}
    </CardContent>
  </Card>
}
