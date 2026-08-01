"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UploadSlot { assetId: string; uploadUrl: string; contentType: string }

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`)
  return body
}

export default function PetMovieContributionForm({ token }: { token: string }) {
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [completeUrl, setCompleteUrl] = useState<string | null>(null)

  async function upload() {
    if (files.length === 0) {
      toast.error("Choose at least one photo.")
      return
    }
    setBusy(true)
    setProgress(5)
    try {
      const reservation = await parseResponse<{ uploads: UploadSlot[] }>(await fetch(`/api/pet-life-movie/contributions/${token}/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: files.map((file) => ({ name: file.name, type: file.type, size: file.size })) }),
      }))
      setProgress(20)
      await Promise.all(reservation.uploads.map(async (slot, index) => {
        const response = await fetch(slot.uploadUrl, { method: "PUT", headers: { "Content-Type": slot.contentType }, body: files[index] })
        if (!response.ok) throw new Error(`Photo ${index + 1} upload failed (${response.status})`)
        setProgress(20 + Math.round(((index + 1) / files.length) * 60))
      }))
      const completed = await parseResponse<{ previewUrl: string }>(await fetch(`/api/pet-life-movie/contributions/${token}/uploads`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: reservation.uploads.map((slot) => slot.assetId) }),
      }))
      setProgress(100)
      setCompleteUrl(completed.previewUrl)
      toast.success("Your photos were added to the story.")
    } catch (error) {
      console.error("[pet-life-movie] contribution upload failed", error)
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  if (completeUrl) {
    return <div className="text-center"><CheckCircle2 className="mx-auto mb-5 h-12 w-12 text-emerald-500" aria-hidden="true" /><h2 className="font-display text-3xl">Photos added</h2><p className="my-4 text-sm text-paradigm-ink-soft">The private preview has been rebuilt with the family&apos;s photos.</p><a href={completeUrl} className="text-sm font-semibold text-paradigm-accent underline">Watch the updated preview</a></div>
  }

  return (
    <div className="space-y-6">
      <div><h2 className="font-display text-3xl">Add your photos</h2><p className="mt-2 text-sm leading-6 text-paradigm-ink-soft">Choose photos you have permission to share. They stay private and are only used for this family story.</p></div>
      <div><Label htmlFor="contribution-photos" className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-paradigm-accent/50 bg-paradigm-accent/5 p-8"><Upload className="h-5 w-5" aria-hidden="true" />Choose up to 10 photos</Label><Input id="contribution-photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 10))} /></div>
      {files.length > 0 && <p className="text-sm font-medium">{files.length} photo{files.length === 1 ? "" : "s"} selected</p>}
      {busy && <div className="space-y-2" aria-live="polite"><div className="flex justify-between text-xs"><span>Uploading securely</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-paradigm-line"><div className="h-full bg-paradigm-accent transition-all" style={{ width: `${progress}%` }} /></div></div>}
      <Button size="lg" className="w-full" disabled={busy || files.length === 0} onClick={upload}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}Add to the story</Button>
    </div>
  )
}

