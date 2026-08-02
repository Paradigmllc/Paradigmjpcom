"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { CheckCircle2, ImagePlus, Loader2, ShieldCheck, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { validatePetMovieFiles } from "@/lib/pet-life-movie/client-files"

type Locale = "ja" | "en" | "es" | "pt"
interface UploadSlot { assetId: string; uploadUrl: string; contentType: string }

const copy = {
  ja: { title: "写真と思い出を追加", body: (pet: string) => `${pet}との本当にあった思い出を、家族の物語へ追加します。`, choose: "写真を選ぶ", chooseHint: "表情が見える写真がおすすめです", memory: "本当にあった思い出", memoryPlaceholder: "例：毎朝いっしょに公園を歩いた", consent: "これらの写真を提供する権利があり、家族の限定共有動画で使用することに同意します", add: "物語に追加", uploading: "安全にアップロード中", selected: "枚選択済み", complete: "物語に追加しました", completeBody: "家族の写真と思い出を使って、限定プレビューを更新しました。", watch: "更新したプレビューを見る", invalid: "写真、思い出、権利確認をすべて入力してください", full: "この物語には20枚の写真が集まりました", secure: "写真は非公開ストレージへ直接送信されます" },
  en: { title: "Add photos and memories", body: (pet: string) => `Add a memory that really happened with ${pet} to the private family story.`, choose: "Choose photos", chooseHint: "Clear expressions work especially well", memory: "A memory that really happened", memoryPlaceholder: "For example: our morning walks through the park", consent: "I have the right to provide these photos and consent to their use in this private family film", add: "Add to the story", uploading: "Uploading securely", selected: "photos selected", complete: "Added to the story", completeBody: "The private preview was rebuilt with the family's photos and memories.", watch: "Watch the updated preview", invalid: "Add photos, a real memory, and the rights confirmation", full: "This story has reached its 20-photo limit", secure: "Photos upload directly to private storage" },
  es: { title: "Añade fotos y recuerdos", body: (pet: string) => `Añade a la historia privada un recuerdo real con ${pet}.`, choose: "Elegir fotos", chooseHint: "Las expresiones claras funcionan especialmente bien", memory: "Un recuerdo real", memoryPlaceholder: "Por ejemplo: nuestros paseos por el parque", consent: "Tengo derecho a proporcionar estas fotos y acepto su uso en esta película familiar privada", add: "Añadir a la historia", uploading: "Subiendo de forma segura", selected: "fotos seleccionadas", complete: "Añadido a la historia", completeBody: "La vista previa privada se actualizó con las fotos y recuerdos de la familia.", watch: "Ver la vista previa actualizada", invalid: "Añade fotos, un recuerdo real y confirma los derechos", full: "Esta historia ha alcanzado el límite de 20 fotos", secure: "Las fotos se suben directamente al almacenamiento privado" },
  pt: { title: "Adicione fotos e memórias", body: (pet: string) => `Adicione à história privada uma memória real com ${pet}.`, choose: "Escolher fotos", chooseHint: "Fotos com expressões nítidas funcionam melhor", memory: "Uma memória real", memoryPlaceholder: "Por exemplo: nossos passeios no parque", consent: "Tenho direito de fornecer estas fotos e concordo com seu uso neste filme privado da família", add: "Adicionar à história", uploading: "Enviando com segurança", selected: "fotos selecionadas", complete: "Adicionado à história", completeBody: "A prévia privada foi atualizada com fotos e memórias da família.", watch: "Ver a prévia atualizada", invalid: "Adicione fotos, uma memória real e confirme os direitos", full: "Esta história atingiu o limite de 20 fotos", secure: "As fotos são enviadas diretamente ao armazenamento privado" },
} as const

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`)
  return body
}

export default function PetMovieContributionForm({ token, locale, petName, maxFiles }: { token: string; locale: Locale; petName: string; maxFiles: number }) {
  const t = copy[locale]
  const [files, setFiles] = useState<File[]>([])
  const [localUrls, setLocalUrls] = useState<string[]>([])
  const [memory, setMemory] = useState("")
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [completeUrl, setCompleteUrl] = useState<string | null>(null)

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setLocalUrls(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  async function upload() {
    const fileError = validatePetMovieFiles(files, 1, maxFiles)
    if (fileError || !memory.trim() || !consent) {
      toast.error(fileError ?? t.invalid)
      return
    }
    setBusy(true)
    setProgress(5)
    try {
      const reservation = await parseResponse<{ uploads: UploadSlot[] }>(await fetch(`/api/pet-life-movie/contributions/${token}/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: files.map((file) => ({ name: file.name, type: file.type, size: file.size })), memories: [memory.trim()], consentConfirmed: consent }),
      }))
      setProgress(20)
      let completedUploads = 0
      await Promise.all(reservation.uploads.map(async (slot, index) => {
        const response = await fetch(slot.uploadUrl, { method: "PUT", headers: { "Content-Type": slot.contentType }, body: files[index] })
        if (!response.ok) throw new Error(`Photo ${index + 1} upload failed (${response.status})`)
        completedUploads += 1
        setProgress(20 + Math.round((completedUploads / files.length) * 60))
      }))
      const completed = await parseResponse<{ previewUrl: string }>(await fetch(`/api/pet-life-movie/contributions/${token}/uploads`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: reservation.uploads.map((slot) => slot.assetId) }),
      }))
      setProgress(100)
      setCompleteUrl(completed.previewUrl)
      toast.success(t.complete)
    } catch (error) {
      console.error("[pet-life-movie] contribution upload failed", error)
      toast.error(error instanceof Error ? error.message : t.invalid)
    } finally {
      setBusy(false)
    }
  }

  if (completeUrl) return <div className="flex min-h-[420px] flex-col items-center justify-center text-center"><span className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100"><CheckCircle2 className="h-10 w-10 text-emerald-700" aria-hidden="true" /></span><h2 className="mt-7 font-display text-3xl">{t.complete}</h2><p className="my-4 max-w-sm text-sm leading-7 text-paradigm-ink-soft">{t.completeBody}</p><a href={completeUrl} className="mt-2 inline-flex min-h-12 items-center rounded-full bg-paradigm-ink px-6 text-sm font-semibold text-paradigm-paper transition hover:bg-paradigm-accent">{t.watch}</a></div>

  return (
    <div>
      <div><h2 className="font-display text-3xl tracking-[-.03em] sm:text-4xl">{t.title}</h2><p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{t.body(petName)}</p></div>
      <div className="mt-8">
        {maxFiles > 0 ? <Label htmlFor="contribution-photos" className="group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-paradigm-accent/45 bg-paradigm-accent/5 p-6 text-center transition hover:border-paradigm-accent hover:bg-paradigm-accent/10"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-paradigm-ink text-paradigm-paper transition group-hover:-translate-y-1"><ImagePlus className="h-5 w-5" aria-hidden="true" /></span><strong className="mt-3 text-sm">{t.choose} · 1–{maxFiles}</strong><span className="mt-1 text-xs text-paradigm-ink-mute">{t.chooseHint}</span></Label> : <div className="rounded-2xl bg-paradigm-paper-deep p-5 text-center text-sm font-semibold">{t.full}</div>}
        <input id="contribution-photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" disabled={maxFiles < 1} onChange={(event) => { const selected = Array.from(event.target.files ?? []); const error = validatePetMovieFiles(selected, 0, maxFiles); if (error) { toast.error(error); event.target.value = ""; setFiles([]); return } setFiles(selected); event.target.value = "" }} />
        {files.length > 0 && <><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">{localUrls.map((url, index) => <div key={url} className="group relative aspect-square overflow-hidden rounded-xl"><Image src={url} alt={`${files[index].name} preview`} fill sizes="110px" className="object-cover" unoptimized /><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`${files[index].name} remove`} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-white"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button></div>)}</div><p className="mt-2 text-xs font-medium text-paradigm-ink-mute" aria-live="polite">{files.length} {t.selected}</p></>}
      </div>
      <div className="mt-7 space-y-2"><Label htmlFor="contribution-memory">{t.memory}</Label><Textarea id="contribution-memory" value={memory} maxLength={300} onChange={(event) => setMemory(event.target.value)} placeholder={t.memoryPlaceholder} className="min-h-32 rounded-2xl bg-paradigm-paper leading-6" /><p className="text-right text-xs text-paradigm-ink-mute">{memory.length}/300</p></div>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-paradigm-line bg-paradigm-paper p-4 text-xs leading-6 text-paradigm-ink-soft"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 accent-violet-600" /><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span>{t.consent}</span></label>
      <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-paradigm-ink-mute"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />{t.secure}</p>
      {busy && <div className="mt-5 rounded-2xl bg-paradigm-ink p-4 text-paradigm-paper" aria-live="polite"><div className="flex justify-between text-xs"><span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{t.uploading}</span><span>{progress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full bg-violet-400 transition-all" style={{ width: `${progress}%` }} /></div></div>}
      <Button size="lg" className="mt-6 h-12 w-full rounded-full bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent" disabled={busy || maxFiles < 1} onClick={upload}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}{t.add}</Button>
    </div>
  )
}
