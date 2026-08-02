"use client"

import { useState, type FormEvent } from "react"
import { Loader2, Plus, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { StudioProjectSummary, VideoGrowthPrincipal } from "@/lib/video-growth/types"

type Props = {
  principal: VideoGrowthPrincipal
  busy: boolean
  studioProjects: StudioProjectSummary[]
  onCreate: (payload: Record<string, unknown>) => Promise<void>
}

function localDateTime(daysFromNow: number): string {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function VideoGrowthCreateForm({ principal, busy, studioProjects, onCreate }: Props) {
  const [projectId, setProjectId] = useState(studioProjects[0]?.projectId ?? "")
  const [name, setName] = useState("")
  const [clientName, setClientName] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [objective, setObjective] = useState("")
  const [audience, setAudience] = useState("")
  const [offer, setOffer] = useState("")
  const [landingUrl, setLandingUrl] = useState("")
  const [plan, setPlan] = useState("growth")
  const [quota, setQuota] = useState(8)
  const [billingStatus, setBillingStatus] = useState("contracted")
  const [priority, setPriority] = useState("normal")
  const [languages, setLanguages] = useState("ja")
  const [contractReference, setContractReference] = useState("")
  const [purchaseOrderReference, setPurchaseOrderReference] = useState("")
  const [clientApprover, setClientApprover] = useState("")
  const [kickoffAt, setKickoffAt] = useState(localDateTime(0))
  const [deliveryDueAt, setDeliveryDueAt] = useState(localDateTime(14))
  const selectedProjectId = projectId || studioProjects[0]?.projectId || ""

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onCreate({
      name, studioProjectId: selectedProjectId, objective, audience, offer, landingUrl,
      clientName, clientContactName: contactName, clientContactEmail: contactEmail,
      plan, monthlyVideoQuota: quota, billingStatus, priority, timezone: "Asia/Tokyo",
      languages: languages.split(",").map((item) => item.trim()).filter(Boolean),
      contractReference, purchaseOrderReference, deliveryOwner: principal.displayName,
      clientApprover, kickoffAt: kickoffAt ? new Date(kickoffAt).toISOString() : "",
      deliveryDueAt: new Date(deliveryDueAt).toISOString(),
    })
    setName("")
    setClientName("")
    setContactName("")
    setContactEmail("")
    setObjective("")
    setAudience("")
    setOffer("")
    setLandingUrl("")
    setContractReference("")
    setPurchaseOrderReference("")
    setClientApprover("")
  }

  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Plus className="h-5 w-5" />新規商用ワークオーダー</CardTitle>
        <p className="text-sm leading-6 text-zinc-500">承認済みStudio案件に、顧客・契約・請求・納期・月次制作枠を紐づけて4媒体の制作キューを開始します。</p>
      </CardHeader>
      <CardContent>
        {studioProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
            <ShieldCheck className="mx-auto h-7 w-7 text-zinc-400" />
            <p className="mt-3 text-sm font-semibold text-zinc-800">Studio案件がまだありません</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Video Factory Consoleで案件を作成・最終承認すると、商用運用へ接続できます。</p>
          </div>
        ) : (
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="growth-project">Studio案件</Label>
              <select id="growth-project" className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={selectedProjectId} onChange={(event) => setProjectId(event.target.value)} required>
                {studioProjects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName} · {project.status} · {project.deliverables.length}納品物</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label htmlFor="growth-name">案件名</Label><Input id="growth-name" value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={160} required /></div>
            <div className="space-y-2"><Label htmlFor="growth-client">顧客名</Label><Input id="growth-client" value={clientName} onChange={(event) => setClientName(event.target.value)} minLength={2} maxLength={160} required /></div>
            <div className="space-y-2"><Label htmlFor="growth-contact">顧客担当者</Label><Input id="growth-contact" value={contactName} onChange={(event) => setContactName(event.target.value)} maxLength={120} /></div>
            <div className="space-y-2"><Label htmlFor="growth-email">顧客連絡先メール</Label><Input id="growth-email" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} maxLength={254} /></div>
            <div className="space-y-2"><Label htmlFor="growth-approver">顧客承認者</Label><Input id="growth-approver" value={clientApprover} onChange={(event) => setClientApprover(event.target.value)} maxLength={120} /></div>
            <div className="space-y-2"><Label htmlFor="growth-languages">言語（カンマ区切り）</Label><Input id="growth-languages" value={languages} onChange={(event) => setLanguages(event.target.value)} required /></div>
            <div className="space-y-2 xl:col-span-2"><Label htmlFor="growth-objective">獲得目標</Label><Textarea id="growth-objective" rows={3} value={objective} onChange={(event) => setObjective(event.target.value)} minLength={10} maxLength={1000} required /></div>
            <div className="space-y-2"><Label htmlFor="growth-audience">対象顧客</Label><Input id="growth-audience" value={audience} onChange={(event) => setAudience(event.target.value)} minLength={3} maxLength={500} required /></div>
            <div className="space-y-2"><Label htmlFor="growth-offer">オファー</Label><Input id="growth-offer" value={offer} onChange={(event) => setOffer(event.target.value)} minLength={3} maxLength={500} required /></div>
            <div className="space-y-2 xl:col-span-2"><Label htmlFor="growth-landing">LP URL</Label><Input id="growth-landing" type="url" placeholder="https://..." value={landingUrl} onChange={(event) => setLandingUrl(event.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="growth-plan">プラン</Label><select id="growth-plan" className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={plan} onChange={(event) => setPlan(event.target.value)}>{["essential", "growth", "scale", "custom"].map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="growth-quota">月次動画枠</Label><Input id="growth-quota" type="number" min={1} max={100} value={quota} onChange={(event) => setQuota(Number(event.target.value))} required /></div>
            <div className="space-y-2"><Label htmlFor="growth-billing">請求状態</Label><select id="growth-billing" className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={billingStatus} onChange={(event) => setBillingStatus(event.target.value)}>{["trial", "contracted", "invoiced", "paid", "overdue"].map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="growth-priority">優先度</Label><select id="growth-priority" className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>{["normal", "high", "urgent"].map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="growth-contract">契約参照番号</Label><Input id="growth-contract" value={contractReference} onChange={(event) => setContractReference(event.target.value)} maxLength={200} /></div>
            <div className="space-y-2"><Label htmlFor="growth-po">発注番号</Label><Input id="growth-po" value={purchaseOrderReference} onChange={(event) => setPurchaseOrderReference(event.target.value)} maxLength={200} /></div>
            <div className="space-y-2"><Label htmlFor="growth-kickoff">開始日時</Label><Input id="growth-kickoff" type="datetime-local" value={kickoffAt} onChange={(event) => setKickoffAt(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="growth-due">納期</Label><Input id="growth-due" type="datetime-local" value={deliveryDueAt} onChange={(event) => setDeliveryDueAt(event.target.value)} required /></div>
            <Button className="md:col-span-2 xl:col-span-4" disabled={busy || !selectedProjectId || !deliveryDueAt} type="submit">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}商用案件と4媒体キューを作成
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
