"use client"

import { useState } from "react"
import { CheckCircle2, Play, Plus, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { VideoGrowthVariant } from "@/lib/video-growth/types"

type Props = {
  busy: boolean
  variant: VideoGrowthVariant
  onAction: (payload: Record<string, unknown>) => Promise<void>
}

export function VideoGrowthRevisionPanel({ busy, variant, onAction }: Props) {
  const [category, setCategory] = useState("copy")
  const [severity, setSeverity] = useState("minor")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [resolution, setResolution] = useState<Record<string, string>>({})
  const active = variant.revisions.filter((item) => ["open", "in_progress"].includes(item.status))
  return (
    <details className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <summary className="cursor-pointer text-xs font-black text-zinc-900"><RotateCcw className="mr-2 inline h-4 w-4" />修正管理（未完了 {active.length}件）</summary>
      <div className="mt-3 space-y-3">
        {active.map((item) => (
          <div key={item.id} className="rounded-lg border border-zinc-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold">{item.description}</p><Badge variant="outline">{item.severity} · {item.status}</Badge></div>
            <p className="mt-1 text-[11px] text-zinc-500">{item.category} · {item.requestedBy}{item.assignedTo ? ` → ${item.assignedTo}` : ""}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input aria-label="修正完了メモ" placeholder="完了内容・却下理由" value={resolution[item.id] ?? ""} onChange={(event) => setResolution((current) => ({ ...current, [item.id]: event.target.value }))} />
              {item.status === "open" && <Button variant="outline" disabled={busy} onClick={() => onAction({ target: "revision", action: "start", revisionRequestId: item.id, expectedRevision: item.revision, assignedTo: assignedTo || item.assignedTo || "", resolutionNote: "" })}><Play className="mr-2 h-4 w-4" />着手</Button>}
              <Button disabled={busy || (resolution[item.id]?.trim().length ?? 0) < 5} onClick={() => onAction({ target: "revision", action: "resolve", revisionRequestId: item.id, expectedRevision: item.revision, assignedTo: item.assignedTo ?? "", resolutionNote: resolution[item.id] ?? "" })}><CheckCircle2 className="mr-2 h-4 w-4" />解決</Button>
            </div>
          </div>
        ))}
        <div className="grid gap-2 rounded-lg border border-dashed border-zinc-300 bg-white p-3 md:grid-cols-2">
          <div className="space-y-1"><Label className="text-xs" htmlFor={`${variant.id}-revision-category`}>修正種別</Label><select id={`${variant.id}-revision-category`} className="min-h-10 w-full rounded-md border border-zinc-300 px-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>{["copy", "visual", "audio", "subtitles", "legal", "other"].map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="space-y-1"><Label className="text-xs" htmlFor={`${variant.id}-revision-severity`}>重要度</Label><select id={`${variant.id}-revision-severity`} className="min-h-10 w-full rounded-md border border-zinc-300 px-2 text-sm" value={severity} onChange={(event) => setSeverity(event.target.value)}>{["minor", "major", "blocking"].map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="space-y-1"><Label className="text-xs" htmlFor={`${variant.id}-revision-owner`}>担当</Label><Input id={`${variant.id}-revision-owner`} value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs" htmlFor={`${variant.id}-revision-due`}>期限</Label><Input id={`${variant.id}-revision-due`} type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></div>
          <div className="space-y-1 md:col-span-2"><Label className="text-xs" htmlFor={`${variant.id}-revision-description`}>修正内容</Label><Textarea id={`${variant.id}-revision-description`} rows={2} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <Button variant="outline" className="md:col-span-2" disabled={busy || description.trim().length < 5} onClick={() => onAction({
            target: "revision", action: "open", variantId: variant.id, expectedRevision: variant.revision,
            category, severity, description, assignedTo,
            dueAt: dueAt ? new Date(dueAt).toISOString() : "",
          })}><Plus className="mr-2 h-4 w-4" />修正依頼を追加</Button>
        </div>
      </div>
    </details>
  )
}
