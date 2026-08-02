"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { validatePetMovieFiles } from "@/lib/pet-life-movie/client-files"

type Locale = "ja" | "en" | "es" | "pt"
interface UploadSlot { assetId: string; uploadUrl: string; contentType: string }

const copy = {
  ja: { title: "写真と思い出を追加", body: (pet: string) => `${pet}との本当にあった思い出を、家族の物語へ追加します。`, choose: "写真を選ぶ", memory: "本当にあった思い出", memoryPlaceholder: "例：毎朝いっしょに公園を歩いた", consent: "これらの写真を提供する権利があり、家族の限定共有動画で使用することに同意します", add: "物語に追加", uploading: "安全にアップロード中", selected: "枚選択済み", complete: "追加しました", completeBody: "家族の写真と思い出を使って、限定プレビューを更新しました。", watch: "更新したプレビューを見る", invalid: "写真、思い出、権利確認をすべて入力してください" },
  en: { title: "Add photos and memories", body: (pet: string) => `Add a memory that really happened with ${pet} to the private family story.`, choose: "Choose photos", memory: "A memory that really happened", memoryPlaceholder: "For example: our morning walks through the park", consent: "I have the right to provide these photos and consent to their use in this private family film", add: "Add to the story", uploading: "Uploading securely", selected: "photos selected", complete: "Added to the story", completeBody: "The private preview was rebuilt with the family's photos and memories.", watch: "Watch the updated preview", invalid: "Add photos, a real memory, and the rights confirmation" },
  es: { title: "Añade fotos y recuerdos", body: (pet: string) => `Añade a la historia privada un recuerdo real con ${pet}.`, choose: "Elegir fotos", memory: "Un recuerdo real", memoryPlaceholder: "Por ejemplo: nuestros paseos por el parque", consent: "Tengo derecho a proporcionar estas fotos y acepto su uso en esta película familiar privada", add: "Añadir a la historia", uploading: "Subiendo de forma segura", selected: "fotos seleccionadas", complete: "Añadido a la historia", completeBody: "La vista previa privada se actualizó con las fotos y recuerdos de la familia.", watch: "Ver la vista previa actualizada", invalid: "Añade fotos, un recuerdo real y confirma los derechos" },
  pt: { title: "Adicione fotos e memórias", body: (pet: string) => `Adicione à história privada uma memória real com ${pet}.`, choose: "Escolher fotos", memory: "Uma memória real", memoryPlaceholder: "Por exemplo: nossos passeios no parque", consent: "Tenho direito de fornecer estas fotos e concordo com seu uso neste filme privado da família", add: "Adicionar à história", uploading: "Enviando com segurança", selected: "fotos selecionadas", complete: "Adicionado à história", completeBody: "A prévia privada foi atualizada com fotos e memórias da família.", watch: "Ver a prévia atualizada", invalid: "Adicione fotos, uma memória real e confirme os direitos" },
} as const

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`)
  return body
}

export default function PetMovieContributionForm({ token, locale, petName, maxFiles }: { token: string; locale: Locale; petName: string; maxFiles: number }) {
  const t = copy[locale]
  const [files, setFiles] = useState<File[]>([])
  const [memory, setMemory] = useState("")
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [completeUrl, setCompleteUrl] = useState<string | null>(null)

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

  if (completeUrl) return <div className="text-center"><CheckCircle2 className="mx-auto mb-5 h-12 w-12 text-emerald-600" aria-hidden="true" /><h2 className="font-display text-3xl">{t.complete}</h2><p className="my-4 text-sm text-paradigm-ink-soft">{t.completeBody}</p><a href={completeUrl} className="text-sm font-semibold text-paradigm-accent underline">{t.watch}</a></div>

  return <div className="space-y-6"><div><h2 className="font-display text-3xl">{t.title}</h2><p className="mt-2 text-sm leading-6 text-paradigm-ink-soft">{t.body(petName)}</p></div><div><Label htmlFor="contribution-photos" className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-paradigm-accent/50 bg-paradigm-accent/5 p-8"><Upload className="h-5 w-5" aria-hidden="true" />{t.choose}（1–{maxFiles}）</Label><input id="contribution-photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={(event) => { const selected = Array.from(event.target.files ?? []); const error = validatePetMovieFiles(selected, 0, maxFiles); if (error) { toast.error(error); event.target.value = ""; setFiles([]); return } setFiles(selected) }} /></div>{files.length > 0 && <p className="text-sm font-medium" aria-live="polite">{files.length} {t.selected}</p>}<div className="space-y-2"><Label htmlFor="contribution-memory">{t.memory}</Label><Textarea id="contribution-memory" value={memory} maxLength={300} onChange={(event) => setMemory(event.target.value)} placeholder={t.memoryPlaceholder} className="min-h-28" /><p className="text-right text-xs text-paradigm-ink-mute">{memory.length}/300</p></div><label className="flex items-start gap-3 text-xs leading-6 text-paradigm-ink-soft"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />{t.consent}</label>{busy && <div className="space-y-2" aria-live="polite"><div className="flex justify-between text-xs"><span>{t.uploading}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-paradigm-line"><div className="h-full bg-paradigm-accent transition-all" style={{ width: `${progress}%` }} /></div></div>}<Button size="lg" className="w-full" disabled={busy || maxFiles < 1} onClick={upload}>{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}{t.add}</Button></div>
}
