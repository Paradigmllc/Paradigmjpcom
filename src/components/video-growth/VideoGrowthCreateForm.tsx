"use client"

import { useState } from "react"
import { Loader2, Plus, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { StudioProjectSummary } from "@/lib/video-growth/types"

type Props = {
  actor: string
  busy: boolean
  studioProjects: StudioProjectSummary[]
  onCreate: (payload: Record<string, unknown>) => Promise<void>
}

export function VideoGrowthCreateForm({ actor, busy, studioProjects, onCreate }: Props) {
  const [projectId, setProjectId] = useState(studioProjects[0]?.projectId ?? "")
  const [name, setName] = useState("")
  const [objective, setObjective] = useState("")
  const [audience, setAudience] = useState("")
  const [offer, setOffer] = useState("")
  const [landingUrl, setLandingUrl] = useState("")
  const selectedProjectId = projectId || studioProjects[0]?.projectId || ""

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onCreate({
      name,
      studioProjectId: selectedProjectId,
      objective,
      audience,
      offer,
      landingUrl,
      owner: actor,
      actor,
    })
    setName("")
    setObjective("")
    setAudience("")
    setOffer("")
    setLandingUrl("")
  }

  return (
    <Card className="border-zinc-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Plus className="h-5 w-5" />新規直販キャンペーン</CardTitle>
        <p className="text-sm leading-6 text-zinc-500">最終承認済みStudio案件から、4媒体の制作・承認・計測カードを作成します。</p>
      </CardHeader>
      <CardContent>
        {studioProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
            <ShieldCheck className="mx-auto h-7 w-7 text-zinc-400" />
            <p className="mt-3 text-sm font-semibold text-zinc-800">Studio案件がまだありません</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">Video Factory Consoleで案件を作成すると、ここから直販キャンペーンへ接続できます。</p>
          </div>
        ) : (
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={submit}>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="growth-project">Studio案件</Label>
              <select id="growth-project" className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm" value={selectedProjectId} onChange={(event) => setProjectId(event.target.value)} required>
                {studioProjects.map((project) => <option key={project.projectId} value={project.projectId}>{project.projectName} · {project.status} · {project.deliverables.length} variants</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label htmlFor="growth-name">キャンペーン名</Label><Input id="growth-name" value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={160} required /></div>
            <div className="space-y-2"><Label htmlFor="growth-audience">対象顧客</Label><Input id="growth-audience" value={audience} onChange={(event) => setAudience(event.target.value)} minLength={3} maxLength={500} required /></div>
            <div className="space-y-2 lg:col-span-2"><Label htmlFor="growth-objective">獲得目標</Label><Textarea id="growth-objective" rows={3} value={objective} onChange={(event) => setObjective(event.target.value)} minLength={10} maxLength={1000} required /></div>
            <div className="space-y-2"><Label htmlFor="growth-offer">オファー</Label><Input id="growth-offer" value={offer} onChange={(event) => setOffer(event.target.value)} minLength={3} maxLength={500} required /></div>
            <div className="space-y-2"><Label htmlFor="growth-landing">LP URL</Label><Input id="growth-landing" type="url" inputMode="url" placeholder="https://..." value={landingUrl} onChange={(event) => setLandingUrl(event.target.value)} required /></div>
            <Button className="lg:col-span-2" disabled={busy || actor.trim().length < 2 || !selectedProjectId} type="submit">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}4媒体の制作キューを作成
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
