"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Check, Copy, ExternalLink, KeyRound, Loader2, PawPrint, Sparkles, Upload, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createPetMovieProjectSchema, type CreatePetMovieProjectInput } from "@/lib/pet-life-movie/schema"
import type { PetMoviePlan, PetMovieStoryboard } from "@/lib/pet-life-movie/types"
import { validatePetMovieFiles } from "@/lib/pet-life-movie/client-files"
import { PET_MOVIE_PLANS } from "@/lib/pet-life-movie/commercial"
import PetMoviePreview from "./PetMoviePreview"

type Locale = "ja" | "en" | "es" | "pt"

const text = {
  ja: { title: "無料プレビューをつくる", pet: "ペットのお名前", together: "一緒に過ごした時間", memories: "本当にあった思い出", photos: "写真を5〜20枚選ぶ", consent: "写真を使用する権利があり、AIによる動画補助に同意します", create: "無料プレビューを生成", working: "大切に仕上げています", share: "限定共有リンクをコピー", copied: "リンクをコピーしました", previewReady: "プレビューが完成しました", plans: "透かしなしの本編をつくる", required: "写真を5枚以上選んでください", failed: "プレビューを作成できませんでした", progress: "進行状況", species: "種類", dog: "犬", cat: "猫", story: "物語", life: "生涯の物語", birthday: "誕生日", adoption: "家族になった日", growth: "成長記録", memorial: "メモリアル", previewPlaceholder: "ここにプレビューが表示されます", previewDetail: "480p・9:16・初期設定は非公開", invite: "家族を招待", noWatermark: "透かしなし", identitySafe: "本人らしさを守るフォールバック", choosePlan: "{plan}を選ぶ", paidSoon: "有料レンダリング準備中", invalid: "未入力または確認が必要な項目があります", terms: "一回払い・5営業日以内の納品・取消し／返金条件を確認し、Pet Life Movie提供条件に同意します", resume: "前回のプロジェクトを開く", resumeHint: "このブラウザだけに保存された管理情報から再開できます。", selected: "枚選択済み" },
  en: { title: "Create your free preview", pet: "Pet name", together: "Time together", memories: "Memories that really happened", photos: "Choose 5–20 photos", consent: "I have the right to use these photos and consent to AI-assisted video creation", create: "Create free preview", working: "Treating every memory with care", share: "Copy private share link", copied: "Link copied", previewReady: "Your preview is ready", plans: "Create the full film without watermark", required: "Please choose at least 5 photos", failed: "We could not create the preview", progress: "Progress", species: "Species", dog: "Dog", cat: "Cat", story: "Story", life: "Life story", birthday: "Birthday", adoption: "Adoption", growth: "Growing up", memorial: "Memorial", previewPlaceholder: "Your preview appears here", previewDetail: "480p · 9:16 · private by default", invite: "Invite family", noWatermark: "No watermark", identitySafe: "Identity-safe fallback", choosePlan: "Choose {plan}", paidSoon: "Paid render coming soon", invalid: "Complete the required fields and confirmations", terms: "I agree to the one-time purchase, five-business-day delivery, cancellation/refund policy, and Pet Life Movie terms", resume: "Open my previous project", resumeHint: "Resume from management information saved only in this browser.", selected: "photos selected" },
  es: { title: "Crea tu vista previa gratis", pet: "Nombre de tu mascota", together: "Tiempo juntos", memories: "Recuerdos que ocurrieron de verdad", photos: "Elige entre 5 y 20 fotos", consent: "Tengo derecho a usar estas fotos y acepto la creación de vídeo asistida por IA", create: "Crear vista previa gratis", working: "Cuidando cada recuerdo", share: "Copiar enlace privado", copied: "Enlace copiado", previewReady: "Tu vista previa está lista", plans: "Crear la película sin marca de agua", required: "Elige al menos 5 fotos", failed: "No pudimos crear la vista previa", progress: "Progreso", species: "Especie", dog: "Perro", cat: "Gato", story: "Historia", life: "Historia de vida", birthday: "Cumpleaños", adoption: "Adopción", growth: "Crecimiento", memorial: "Memorial", previewPlaceholder: "Tu vista previa aparecerá aquí", previewDetail: "480p · 9:16 · privada por defecto", invite: "Invitar a la familia", noWatermark: "Sin marca de agua", identitySafe: "Alternativa que protege la identidad", choosePlan: "Elegir {plan}", paidSoon: "Renderizado de pago próximamente", invalid: "Completa los campos y confirmaciones obligatorios", terms: "Acepto el pago único, la entrega en cinco días laborables, la política de cancelación/reembolso y las condiciones de Pet Life Movie", resume: "Abrir mi proyecto anterior", resumeHint: "Continúa con la información de gestión guardada solo en este navegador.", selected: "fotos seleccionadas" },
  pt: { title: "Crie sua prévia grátis", pet: "Nome do pet", together: "Tempo juntos", memories: "Memórias que realmente aconteceram", photos: "Escolha de 5 a 20 fotos", consent: "Tenho direito de usar estas fotos e concordo com a criação de vídeo assistida por IA", create: "Criar prévia grátis", working: "Cuidando de cada memória", share: "Copiar link privado", copied: "Link copiado", previewReady: "Sua prévia está pronta", plans: "Criar o filme sem marca d'água", required: "Escolha pelo menos 5 fotos", failed: "Não foi possível criar a prévia", progress: "Progresso", species: "Espécie", dog: "Cachorro", cat: "Gato", story: "História", life: "História de vida", birthday: "Aniversário", adoption: "Adoção", growth: "Crescimento", memorial: "Memorial", previewPlaceholder: "Sua prévia aparecerá aqui", previewDetail: "480p · 9:16 · privada por padrão", invite: "Convidar a família", noWatermark: "Sem marca d'água", identitySafe: "Alternativa que protege a identidade", choosePlan: "Escolher {plan}", paidSoon: "Renderização paga em breve", invalid: "Preencha os campos e confirmações obrigatórios", terms: "Concordo com o pagamento único, entrega em cinco dias úteis, política de cancelamento/reembolso e termos do Pet Life Movie", resume: "Abrir meu projeto anterior", resumeHint: "Continue usando as informações de gestão salvas somente neste navegador.", selected: "fotos selecionadas" },
} as const

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
  const [checkoutEmail, setCheckoutEmail] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [recentUrl, setRecentUrl] = useState<string | null>(null)
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
      consentConfirmed: false,
    },
  })

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setLocalUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pet-movie:recent")
      if (!raw) return
      const parsed = JSON.parse(raw) as { url?: unknown }
      if (typeof parsed.url !== "string") return
      const url = new URL(parsed.url, window.location.origin)
      if (url.origin === window.location.origin && url.pathname.includes("/pet-life-movie/memories/")) setRecentUrl(`${url.pathname}${url.search}`)
    } catch (error) {
      console.error("[pet-life-movie] recent project recovery failed", error)
      localStorage.removeItem("pet-movie:recent")
    }
  }, [])

  const submitPreview = async (values: CreatePetMovieProjectInput) => {
    const fileError = validatePetMovieFiles(files)
    if (fileError) {
      toast.error(files.length < 5 ? t.required : fileError)
      return
    }
    setBusy(true)
    setProgress(5)
    try {
      const payload = { ...values, memories: values.memories.filter((memory: string) => memory.trim()) }
      const created = await jsonRequest<{ project: { id: string }; accessToken: string }>("/api/pet-life-movie/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const projectId = created.project.id
      const token = created.accessToken
      localStorage.setItem(`pet-movie:${projectId}`, token)
      setProgress(18)
      const signed = await jsonRequest<{ uploads: Array<{ assetId: string; uploadUrl: string; contentType: string }> }>(`/api/pet-life-movie/projects/${projectId}/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pet-movie-token": token },
        body: JSON.stringify({ files: files.map((file) => ({ name: file.name, type: file.type, size: file.size })) }),
      })
      let completedUploads = 0
      await Promise.all(signed.uploads.map(async (upload, index) => {
        const response = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": upload.contentType }, body: files[index] })
        if (!response.ok) throw new Error(`Photo ${index + 1} upload failed (${response.status})`)
        completedUploads += 1
        setProgress(18 + Math.round((completedUploads / files.length) * 42))
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
      localStorage.setItem("pet-movie:recent", JSON.stringify({ projectId, url: generated.previewUrl, petName: values.petName }))
      setRecentUrl(generated.previewUrl)
      setPreview({
        storyboard: story.storyboard,
        assetUrls: Object.fromEntries(signed.uploads.map((upload, index) => [upload.assetId, localUrls[index]])),
        url: generated.previewUrl,
        projectId,
        token,
      })
      setProgress(100)
      toast.success(t.previewReady)
    } catch (error) {
      console.error("[pet-life-movie] preview creation failed", error)
      toast.error(error instanceof Error ? error.message : t.failed)
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = form.handleSubmit(submitPreview, () => toast.error(t.invalid))

  async function startCheckout(plan: PetMoviePlan) {
    if (!preview) return
    if (!/^\S+@\S+\.\S+$/.test(checkoutEmail.trim())) {
      toast.error(locale === "ja" ? "納品先のメールアドレスを入力してください" : "Enter the email address for delivery")
      return
    }
    if (!termsAccepted) {
      toast.error(t.invalid)
      return
    }
    setBusy(true)
    try {
      const result = await jsonRequest<{ url: string }>(`/api/pet-life-movie/projects/${preview.projectId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-pet-movie-token": preview.token },
        body: JSON.stringify({ plan, email: checkoutEmail.trim(), termsAccepted }),
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
      try {
        await navigator.clipboard.writeText(result.inviteUrl)
        toast.success(t.copied)
      } catch (clipboardError) {
        console.error("[pet-life-movie] invite clipboard copy failed", clipboardError)
        toast.success(locale === "ja" ? "招待リンクを作成しました。表示されたURLをコピーしてください。" : "Invitation created. Copy the URL shown below.")
      }
    } catch (error) {
      console.error("[pet-life-movie] invite creation failed", error)
      toast.error(error instanceof Error ? error.message : t.failed)
    }
  }

  async function copyManageLink() {
    if (!preview) return
    try {
      await navigator.clipboard.writeText(`${preview.url}#manage=${encodeURIComponent(preview.token)}`)
      toast.success(locale === "ja" ? "管理用リンクをコピーしました。共有しないでください。" : "Management link copied. Keep it private.")
    } catch (error) {
      console.error("[pet-life-movie] management link copy failed", error)
      toast.error(t.failed)
    }
  }

  return (
    <section id="create" className="bg-paradigm-paper-deep py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 md:px-8 lg:grid-cols-[1.05fr_.95fr]">
        <Card className="border-paradigm-line bg-paradigm-paper-card shadow-xl">
          <CardHeader><CardTitle className="font-display text-3xl">{t.title}</CardTitle></CardHeader>
          <CardContent>
            {recentUrl && !preview && <a href={recentUrl} className="mb-6 flex items-center justify-between rounded-2xl border border-paradigm-accent/30 bg-paradigm-accent/5 p-4 text-sm"><span><strong className="block">{t.resume}</strong><span className="mt-1 block text-xs text-paradigm-ink-mute">{t.resumeHint}</span></span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" /></a>}
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="petName">{t.pet}</Label><Input id="petName" {...form.register("petName")} aria-invalid={Boolean(form.formState.errors.petName)} />{form.formState.errors.petName && <p role="alert" className="text-xs text-red-700">{form.formState.errors.petName.message}</p>}</div>
                <div className="space-y-2"><Label htmlFor="timeTogether">{t.together}</Label><Input id="timeTogether" {...form.register("timeTogether")} placeholder={locale === "ja" ? "例：12年間" : "e.g. 12 years"} /></div>
                <div className="space-y-2"><Label htmlFor="species">{t.species}</Label><select id="species" {...form.register("species")} className="h-10 w-full rounded-md border border-paradigm-line bg-transparent px-3 text-sm"><option value="dog">{t.dog}</option><option value="cat">{t.cat}</option></select></div>
                <div className="space-y-2"><Label htmlFor="occasion">{t.story}</Label><select id="occasion" {...form.register("occasion")} className="h-10 w-full rounded-md border border-paradigm-line bg-transparent px-3 text-sm"><option value="life">{t.life}</option><option value="birthday">{t.birthday}</option><option value="adoption">{t.adoption}</option><option value="growth">{t.growth}</option><option value="memorial">{t.memorial}</option></select></div>
              </div>
              <fieldset className="space-y-3"><legend className="text-sm font-medium">{t.memories}</legend>{[0, 1, 2].map((index) => <Textarea key={index} {...form.register(`memories.${index}`)} aria-label={`${t.memories} ${index + 1}`} placeholder={`${index + 1}.`} className="min-h-20" />)}</fieldset>
              <div className="space-y-3">
                <Label htmlFor="photos" className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-paradigm-accent/50 bg-paradigm-accent/5 px-5 py-8 text-center hover:bg-paradigm-accent/10"><Upload className="h-5 w-5" aria-hidden="true" />{t.photos}</Label>
                <input id="photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={(event) => { const selected = Array.from(event.target.files ?? []); const error = validatePetMovieFiles(selected, 0); if (error) { toast.error(error); event.target.value = ""; setFiles([]); return } setFiles(selected) }} />
                {files.length > 0 && <p className="text-center text-xs font-medium" aria-live="polite">{files.length} {t.selected}</p>}
                {localUrls.length > 0 && <div className="grid grid-cols-5 gap-2">{localUrls.map((url, index) => <div key={url} className="relative aspect-square overflow-hidden rounded-lg bg-paradigm-paper"><Image src={url} alt={`${files[index].name} preview`} fill sizes="96px" className="object-cover" unoptimized /></div>)}</div>}
              </div>
              <label className="flex items-start gap-3 text-xs leading-relaxed text-paradigm-ink-soft"><input type="checkbox" {...form.register("consentConfirmed")} className="mt-0.5" />{t.consent}</label>{form.formState.errors.consentConfirmed && <p role="alert" className="text-xs text-red-700">{t.invalid}</p>}
              {busy && <div aria-live="polite" className="space-y-2"><div className="flex justify-between text-xs"><span>{t.working}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-paradigm-line"><div className="h-full bg-paradigm-accent transition-all" style={{ width: `${progress}%` }} /></div></div>}
              <Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}{t.create}</Button>
            </form>
          </CardContent>
        </Card>
        <div className="flex flex-col items-center justify-center gap-6">
          {preview ? <PetMoviePreview storyboard={preview.storyboard} assetUrls={preview.assetUrls} className="w-full max-w-[360px]" /> : <div className="grid aspect-[9/16] w-full max-w-[360px] place-items-center rounded-[2rem] border border-paradigm-line bg-paradigm-paper-card text-center shadow-xl"><div className="p-8"><PawPrint className="mx-auto mb-4 h-12 w-12 text-paradigm-accent" aria-hidden="true" /><p className="font-display text-xl">{t.previewPlaceholder}</p><p className="mt-2 text-sm text-paradigm-ink-mute">{t.previewDetail}</p></div></div>}
          {preview && <div className="flex flex-wrap justify-center gap-3"><Button variant="outline" onClick={copyShareLink}><Copy className="h-4 w-4" aria-hidden="true" />{t.share}</Button><Button variant="outline" onClick={createInvite}><UserPlus className="h-4 w-4" aria-hidden="true" />{t.invite}</Button><Button variant="ghost" onClick={copyManageLink}><KeyRound className="h-4 w-4" aria-hidden="true" />{locale === "ja" ? "管理用リンク" : "Management link"}</Button></div>}
          {inviteUrl && <div className="max-w-sm space-y-3 text-center"><p className="break-all text-xs text-paradigm-ink-mute">{inviteUrl}</p><a href={`https://line.me/R/msg/text/?${encodeURIComponent(inviteUrl)}`} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-full bg-[#06C755] px-4 py-2 text-xs font-semibold text-white">LINE</a></div>}
        </div>
      </div>
      {preview && <div className="mx-auto mt-16 max-w-5xl px-5 md:px-8"><h3 className="mb-7 text-center font-display text-3xl">{t.plans}</h3><div className="mx-auto mb-7 max-w-md space-y-3"><Label htmlFor="checkoutEmail">{locale === "ja" ? "納品先メールアドレス" : "Delivery email"}</Label><Input id="checkoutEmail" type="email" autoComplete="email" required value={checkoutEmail} onChange={(event) => setCheckoutEmail(event.target.value)} placeholder="you@example.com" /><p className="text-xs text-paradigm-ink-mute">{locale === "ja" ? "注文確認と、品質確認済み動画の完成通知にのみ使用します。" : "Used for your receipt, order confirmation, and reviewed-film delivery."}</p><label className="flex items-start gap-3 text-xs leading-5 text-paradigm-ink-soft"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1" /><span>{t.terms} <a className="font-semibold underline" href={`/${locale}/pet-life-movie/terms`} target="_blank" rel="noopener noreferrer">Terms</a></span></label></div><div className="grid gap-4 md:grid-cols-3">{PET_MOVIE_PLANS.map((plan) => <Card key={plan.id} className={plan.id === "story" ? "border-paradigm-accent shadow-lg" : "border-paradigm-line"}><CardContent className="p-6"><div className="mb-4 flex items-start justify-between"><div><p className="font-display text-xl">{plan.name}</p><p className="text-sm text-paradigm-ink-mute">{plan.durationSeconds} sec · {plan.formats.join(" + ")}</p></div><span className="text-2xl font-bold">${plan.priceUsd}</span></div><ul className="mb-5 space-y-2 text-sm text-paradigm-ink-soft"><li className="flex gap-2"><Check className="h-4 w-4 text-paradigm-accent" aria-hidden="true" />{t.noWatermark}</li><li className="flex gap-2"><Check className="h-4 w-4 text-paradigm-accent" aria-hidden="true" />{t.identitySafe}</li></ul><Button className="w-full" variant={plan.id === "story" ? "default" : "outline"} disabled={busy || !checkoutEnabled} onClick={() => startCheckout(plan.id)}>{checkoutEnabled ? t.choosePlan.replace("{plan}", plan.name) : t.paidSoon}</Button></CardContent></Card>)}</div></div>}
    </section>
  )
}
