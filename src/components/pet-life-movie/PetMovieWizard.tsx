"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Check, Copy, Loader2, PawPrint, Sparkles, Upload, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createPetMovieProjectSchema, type CreatePetMovieProjectInput } from "@/lib/pet-life-movie/schema"
import type { PetMoviePlan, PetMovieStoryboard } from "@/lib/pet-life-movie/types"
import PetMoviePreview from "./PetMoviePreview"

type Locale = "ja" | "en" | "es" | "pt"

const text = {
  ja: { title: "無料プレビューをつくる", pet: "ペットのお名前", together: "一緒に過ごした時間", memories: "本当にあった思い出", photos: "写真を5〜20枚選ぶ", consent: "写真を使用する権利があり、AIによる動画補助に同意します", create: "無料プレビューを生成", working: "大切に仕上げています", share: "限定共有リンクをコピー", copied: "リンクをコピーしました", plans: "透かしなしの本編をつくる", required: "写真を5枚以上選んでください", failed: "プレビューを作成できませんでした", progress: "進行状況" },
  en: { title: "Create your free preview", pet: "Pet name", together: "Time together", memories: "Memories that really happened", photos: "Choose 5–20 photos", consent: "I have the right to use these photos and consent to AI-assisted video creation", create: "Create free preview", working: "Treating every memory with care", share: "Copy private share link", copied: "Link copied", plans: "Create the full film without watermark", required: "Please choose at least 5 photos", failed: "We could not create the preview", progress: "Progress" },
  es: { title: "Crea tu vista previa gratis", pet: "Nombre de tu mascota", together: "Tiempo juntos", memories: "Recuerdos que ocurrieron de verdad", photos: "Elige entre 5 y 20 fotos", consent: "Tengo derecho a usar estas fotos y acepto la creación de vídeo asistida por IA", create: "Crear vista previa gratis", working: "Cuidando cada recuerdo", share: "Copiar enlace privado", copied: "Enlace copiado", plans: "Crear la película sin marca de agua", required: "Elige al menos 5 fotos", failed: "No pudimos crear la vista previa", progress: "Progreso" },
  pt: { title: "Crie sua prévia grátis", pet: "Nome do pet", together: "Tempo juntos", memories: "Memórias que realmente aconteceram", photos: "Escolha de 5 a 20 fotos", consent: "Tenho direito de usar estas fotos e concordo com a criação de vídeo assistida por IA", create: "Criar prévia grátis", working: "Cuidando de cada memória", share: "Copiar link privado", copied: "Link copiado", plans: "Criar o filme sem marca d'água", required: "Escolha pelo menos 5 fotos", failed: "Não foi possível criar a prévia", progress: "Progresso" },
} as const

const plans: Array<{ id: PetMoviePlan; name: string; price: string; detail: string }> = [
  { id: "mini", name: "Mini", price: "$19", detail: "30 sec · 9:16" },
  { id: "story", name: "Story", price: "$39", detail: "60 sec · 9:16 + 16:9" },
  { id: "cinema", name: "Cinema", price: "$79", detail: "60 sec · all formats + narration" },
]

async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const body = await response.json() as { error?: string } & T
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`)
  return body
}

export default function PetMovieWizard({ locale, checkoutEnabled }: { locale: Locale; checkoutEnabled: boolean }) {
  const t = text[locale]
  const [files, setFiles] = useState<File[]>([])
  const [localUrls, setLocalUrls] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<{ storyboard: PetMovieStoryboard; assetUrls: Record<string, string>; url: string; projectId: string; token: string } | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const form = useForm<CreatePetMovieProjectInput>({
    resolver: zodResolver(createPetMovieProjectSchema),
    defaultValues: {
      petName: "",
      species: "dog",
      occasion: "life",
      locale,
      mood: "warm",
      timeTogether: "",
      memories: ["", "", ""],
      consentConfirmed: true,
    },
  })

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setLocalUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  const onSubmit = form.handleSubmit(async (values) => {
    if (files.length < 5) {
      toast.error(t.required)
      return
    }
    setBusy(true)
    setProgress(5)
    try {
      const payload = { ...values, memories: values.memories.filter((memory) => memory.trim()) }
      const created = await jsonRequest<{ project: { id: string }; accessToken: string }>("/api/pet-life-movie/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const projectId = created.project.id
      const token = created.accessToken
      sessionStorage.setItem(`pet-movie:${projectId}`, token)
      setProgress(18)
      const signed = await jsonRequest<{ uploads: Array<{ assetId: string; uploadUrl: string; contentType: string }> }>(`/api/pet-life-movie/projects/${projectId}/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pet-movie-token": token },
        body: JSON.stringify({ files: files.map((file) => ({ name: file.name, type: file.type, size: file.size })) }),
      })
      await Promise.all(signed.uploads.map(async (upload, index) => {
        const response = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": upload.contentType }, body: files[index] })
        if (!response.ok) throw new Error(`Photo ${index + 1} upload failed (${response.status})`)
        setProgress(18 + Math.round(((index + 1) / files.length) * 42))
      }))
      await jsonRequest(`/api/pet-life-movie/projects/${projectId}/uploads`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-pet-movie-token": token },
        body: JSON.stringify({ assetIds: signed.uploads.map((upload) => upload.assetId) }),
      })
      setProgress(68)
      const story = await jsonRequest<{ storyboard: PetMovieStoryboard }>(`/api/pet-life-movie/projects/${projectId}/storyboard`, {
        method: "POST",
        headers: { "x-pet-movie-token": token },
      })
      setProgress(84)
      const generated = await jsonRequest<{ previewUrl: string }>(`/api/pet-life-movie/projects/${projectId}/preview`, {
        method: "POST",
        headers: { "x-pet-movie-token": token },
      })
      setPreview({
        storyboard: story.storyboard,
        assetUrls: Object.fromEntries(signed.uploads.map((upload, index) => [upload.assetId, localUrls[index]])),
        url: generated.previewUrl,
        projectId,
        token,
      })
      setProgress(100)
      toast.success(t.copied.replace("copied", "ready"))
    } catch (error) {
      console.error("[pet-life-movie] preview creation failed", error)
      toast.error(error instanceof Error ? error.message : t.failed)
    } finally {
      setBusy(false)
    }
  })

  async function startCheckout(plan: PetMoviePlan) {
    if (!preview) return
    setBusy(true)
    try {
      const result = await jsonRequest<{ url: string }>(`/api/pet-life-movie/projects/${preview.projectId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pet-movie-token": preview.token },
        body: JSON.stringify({ plan }),
      })
      window.location.assign(result.url)
    } catch (error) {
      console.error("[pet-life-movie] checkout failed", error)
      toast.error(error instanceof Error ? error.message : t.failed)
      setBusy(false)
    }
  }

  async function copyShareLink() {
    if (!preview) return
    try {
      await navigator.clipboard.writeText(preview.url)
      toast.success(t.copied)
    } catch (error) {
      console.error("[pet-life-movie] share link copy failed", error)
      toast.error(t.failed)
    }
  }

  async function createInvite() {
    if (!preview) return
    try {
      const result = await jsonRequest<{ inviteUrl: string }>(`/api/pet-life-movie/projects/${preview.projectId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pet-movie-token": preview.token },
        body: JSON.stringify({ displayName: "Family & friends" }),
      })
      setInviteUrl(result.inviteUrl)
      await navigator.clipboard.writeText(result.inviteUrl)
      toast.success(t.copied)
    } catch (error) {
      console.error("[pet-life-movie] invite creation failed", error)
      toast.error(error instanceof Error ? error.message : t.failed)
    }
  }

  return (
    <section id="create" className="bg-paradigm-paper-deep py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 md:px-8 lg:grid-cols-[1.05fr_.95fr]">
        <Card className="border-paradigm-line bg-paradigm-paper-card shadow-xl">
          <CardHeader><CardTitle className="font-display text-3xl">{t.title}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="petName">{t.pet}</Label><Input id="petName" {...form.register("petName")} aria-invalid={Boolean(form.formState.errors.petName)} /></div>
                <div className="space-y-2"><Label htmlFor="timeTogether">{t.together}</Label><Input id="timeTogether" {...form.register("timeTogether")} placeholder={locale === "ja" ? "例：12年間" : "e.g. 12 years"} /></div>
                <div className="space-y-2"><Label htmlFor="species">Species</Label><select id="species" {...form.register("species")} className="h-10 w-full rounded-md border border-paradigm-line bg-transparent px-3 text-sm"><option value="dog">Dog</option><option value="cat">Cat</option></select></div>
                <div className="space-y-2"><Label htmlFor="occasion">Story</Label><select id="occasion" {...form.register("occasion")} className="h-10 w-full rounded-md border border-paradigm-line bg-transparent px-3 text-sm"><option value="life">Life story</option><option value="birthday">Birthday</option><option value="adoption">Adoption</option><option value="growth">Growing up</option><option value="memorial">Memorial</option></select></div>
              </div>
              <fieldset className="space-y-3"><legend className="text-sm font-medium">{t.memories}</legend>{[0, 1, 2].map((index) => <Textarea key={index} {...form.register(`memories.${index}`)} aria-label={`${t.memories} ${index + 1}`} placeholder={`${index + 1}.`} className="min-h-20" />)}</fieldset>
              <div className="space-y-3">
                <Label htmlFor="photos" className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-paradigm-accent/50 bg-paradigm-accent/5 px-5 py-8 text-center hover:bg-paradigm-accent/10"><Upload className="h-5 w-5" aria-hidden="true" />{t.photos}</Label>
                <Input id="photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 20))} />
                {localUrls.length > 0 && <div className="grid grid-cols-5 gap-2">{localUrls.map((url, index) => <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-paradigm-paper"><Image src={url} alt={`${files[index].name} preview`} fill sizes="96px" className="object-cover" unoptimized /></div>)}</div>}
              </div>
              <label className="flex items-start gap-3 text-xs leading-relaxed text-paradigm-ink-soft"><input type="checkbox" {...form.register("consentConfirmed")} className="mt-0.5" />{t.consent}</label>
              {busy && <div aria-live="polite" className="space-y-2"><div className="flex justify-between text-xs"><span>{t.working}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-paradigm-line"><div className="h-full bg-paradigm-accent transition-all" style={{ width: `${progress}%` }} /></div></div>}
              <Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}{t.create}</Button>
            </form>
          </CardContent>
        </Card>
        <div className="flex flex-col items-center justify-center gap-6">
          {preview ? <PetMoviePreview storyboard={preview.storyboard} assetUrls={preview.assetUrls} className="w-full max-w-[360px]" /> : <div className="grid aspect-[9/16] w-full max-w-[360px] place-items-center rounded-[2rem] border border-paradigm-line bg-paradigm-paper-card text-center shadow-xl"><div className="p-8"><PawPrint className="mx-auto mb-4 h-12 w-12 text-paradigm-accent" aria-hidden="true" /><p className="font-display text-xl">Your preview appears here</p><p className="mt-2 text-sm text-paradigm-ink-mute">480p · 9:16 · private by default</p></div></div>}
          {preview && <div className="flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={copyShareLink}><Copy className="h-4 w-4" aria-hidden="true" />{t.share}</Button><Button variant="outline" onClick={createInvite}><UserPlus className="h-4 w-4" aria-hidden="true" />Invite family</Button></div>}
          {inviteUrl && <p className="max-w-sm break-all text-center text-xs text-paradigm-ink-mute">{inviteUrl}</p>}
        </div>
      </div>
      {preview && <div className="mx-auto mt-16 max-w-5xl px-5 md:px-8"><h3 className="mb-7 text-center font-display text-3xl">{t.plans}</h3><div className="grid gap-4 md:grid-cols-3">{plans.map((plan) => <Card key={plan.id} className={plan.id === "story" ? "border-paradigm-accent shadow-lg" : "border-paradigm-line"}><CardContent className="p-6"><div className="mb-4 flex items-start justify-between"><div><p className="font-display text-xl">{plan.name}</p><p className="text-sm text-paradigm-ink-mute">{plan.detail}</p></div><span className="text-2xl font-bold">{plan.price}</span></div><ul className="mb-5 space-y-2 text-sm text-paradigm-ink-soft"><li className="flex gap-2"><Check className="h-4 w-4 text-paradigm-accent" />No watermark</li><li className="flex gap-2"><Check className="h-4 w-4 text-paradigm-accent" />Identity-safe fallback</li></ul><Button className="w-full" variant={plan.id === "story" ? "default" : "outline"} disabled={busy || !checkoutEnabled} onClick={() => startCheckout(plan.id)}>{checkoutEnabled ? `Choose ${plan.name}` : "Paid render coming soon"}</Button></CardContent></Card>)}</div></div>}
    </section>
  )
}
