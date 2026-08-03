"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useForm, useWatch } from "react-hook-form"
import { ArrowLeft, ArrowRight, Camera, Cat, Check, Copy, Dog, ExternalLink, ImagePlus, KeyRound, Loader2, PawPrint, ShieldCheck, Sparkles, Trash2, Upload, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createPetMovieProjectSchema, type CreatePetMovieProjectInput } from "@/lib/pet-life-movie/schema"
import type { PetMoviePlan, PetMovieStoryboard } from "@/lib/pet-life-movie/types"
import { validatePetMovieFiles } from "@/lib/pet-life-movie/client-files"
import { PET_MOVIE_PLANS } from "@/lib/pet-life-movie/commercial"
import { trackPetMarketingEvent } from "@/lib/pet-life-movie/marketing/client"
import PetMoviePreview from "./PetMoviePreview"
import { PET_MOVIE_TIER_DISCLOSURE } from "./tier-copy"

type Locale = "ja" | "en" | "es" | "pt"

const text = {
  ja: { title: "無料プレビューをつくる", pet: "ペットのお名前", together: "一緒に過ごした時間", memories: "本当にあった思い出", photos: "写真を5〜20枚選ぶ", consent: "写真を使用する権利があり、AIによる動画補助に同意します", create: "無料プレビューを生成", working: "大切に仕上げています", share: "限定共有リンクをコピー", copied: "リンクをコピーしました", previewReady: "プレビューが完成しました", plans: "透かしなしの本編をつくる", required: "写真を5枚以上選んでください", failed: "プレビューを作成できませんでした", progress: "進行状況", species: "種類", dog: "犬", cat: "猫", story: "物語", life: "生涯の物語", birthday: "誕生日", adoption: "家族になった日", growth: "成長記録", memorial: "メモリアル", previewPlaceholder: "ここにプレビューが表示されます", previewDetail: "480p・9:16・初期設定は非公開", invite: "家族を招待", noWatermark: "透かしなし", identitySafe: "本人らしさを守るフォールバック", choosePlan: "{plan}を選ぶ", paidSoon: "有料レンダリング準備中", invalid: "未入力または確認が必要な項目があります", terms: "一回払い・5営業日以内の納品・取消し／返金条件を確認し、Pet Life Movie提供条件に同意します", resume: "前回のプロジェクトを開く", resumeHint: "このブラウザだけに保存された管理情報から再開できます。", selected: "枚選択済み" },
  en: { title: "Create your free preview", pet: "Pet name", together: "Time together", memories: "Memories that really happened", photos: "Choose 5–20 photos", consent: "I have the right to use these photos and consent to AI-assisted video creation", create: "Create free preview", working: "Treating every memory with care", share: "Copy private share link", copied: "Link copied", previewReady: "Your preview is ready", plans: "Create the full film without watermark", required: "Please choose at least 5 photos", failed: "We could not create the preview", progress: "Progress", species: "Species", dog: "Dog", cat: "Cat", story: "Story", life: "Life story", birthday: "Birthday", adoption: "Adoption", growth: "Growing up", memorial: "Memorial", previewPlaceholder: "Your preview appears here", previewDetail: "480p · 9:16 · private by default", invite: "Invite family", noWatermark: "No watermark", identitySafe: "Identity-safe fallback", choosePlan: "Choose {plan}", paidSoon: "Paid render coming soon", invalid: "Complete the required fields and confirmations", terms: "I agree to the one-time purchase, five-business-day delivery, cancellation/refund policy, and Pet Life Movie terms", resume: "Open my previous project", resumeHint: "Resume from management information saved only in this browser.", selected: "photos selected" },
  es: { title: "Crea tu vista previa gratis", pet: "Nombre de tu mascota", together: "Tiempo juntos", memories: "Recuerdos que ocurrieron de verdad", photos: "Elige entre 5 y 20 fotos", consent: "Tengo derecho a usar estas fotos y acepto la creación de vídeo asistida por IA", create: "Crear vista previa gratis", working: "Cuidando cada recuerdo", share: "Copiar enlace privado", copied: "Enlace copiado", previewReady: "Tu vista previa está lista", plans: "Crear la película sin marca de agua", required: "Elige al menos 5 fotos", failed: "No pudimos crear la vista previa", progress: "Progreso", species: "Especie", dog: "Perro", cat: "Gato", story: "Historia", life: "Historia de vida", birthday: "Cumpleaños", adoption: "Adopción", growth: "Crecimiento", memorial: "Memorial", previewPlaceholder: "Tu vista previa aparecerá aquí", previewDetail: "480p · 9:16 · privada por defecto", invite: "Invitar a la familia", noWatermark: "Sin marca de agua", identitySafe: "Alternativa que protege la identidad", choosePlan: "Elegir {plan}", paidSoon: "Renderizado de pago próximamente", invalid: "Completa los campos y confirmaciones obligatorios", terms: "Acepto el pago único, la entrega en cinco días laborables, la política de cancelación/reembolso y las condiciones de Pet Life Movie", resume: "Abrir mi proyecto anterior", resumeHint: "Continúa con la información de gestión guardada solo en este navegador.", selected: "fotos seleccionadas" },
  pt: { title: "Crie sua prévia grátis", pet: "Nome do pet", together: "Tempo juntos", memories: "Memórias que realmente aconteceram", photos: "Escolha de 5 a 20 fotos", consent: "Tenho direito de usar estas fotos e concordo com a criação de vídeo assistida por IA", create: "Criar prévia grátis", working: "Cuidando de cada memória", share: "Copiar link privado", copied: "Link copiado", previewReady: "Sua prévia está pronta", plans: "Criar o filme sem marca d'água", required: "Escolha pelo menos 5 fotos", failed: "Não foi possível criar a prévia", progress: "Progresso", species: "Espécie", dog: "Cachorro", cat: "Gato", story: "História", life: "História de vida", birthday: "Aniversário", adoption: "Adoção", growth: "Crescimento", memorial: "Memorial", previewPlaceholder: "Sua prévia aparecerá aqui", previewDetail: "480p · 9:16 · privada por padrão", invite: "Convidar a família", noWatermark: "Sem marca d'água", identitySafe: "Alternativa que protege a identidade", choosePlan: "Escolher {plan}", paidSoon: "Renderização paga em breve", invalid: "Preencha os campos e confirmações obrigatórios", terms: "Concordo com o pagamento único, entrega em cinco dias úteis, política de cancelamento/reembolso e termos do Pet Life Movie", resume: "Abrir meu projeto anterior", resumeHint: "Continue usando as informações de gestão salvas somente neste navegador.", selected: "fotos selecionadas" },
} as const

const experienceText = {
  ja: {
    eyebrow: "YOUR STORY",
    intro: "3つのステップで、最初の1本を。",
    introBody: "入力した内容は自動保存されません。プレビュー作成後、管理用リンクをこのブラウザに安全に保存します。",
    stepNames: ["あの子のこと", "思い出", "写真"],
    stepOneTitle: "まず、あの子のことを教えてください。",
    stepOneBody: "タイトルと物語の雰囲気を整えるために使います。",
    stepTwoTitle: "覚えている場面を、言葉に。",
    stepTwoBody: "上手な文章でなくて大丈夫。事実だけを短く書いてください。",
    memoryPlaceholders: ["例：晴れた日は、窓辺で昼寝をするのが好きでした", "例：帰宅すると、いつも玄関まで迎えに来てくれました", "例：家族になった日のこと"],
    stepThreeTitle: "物語にしたい写真を選びます。",
    stepThreeBody: "表情や季節が異なる写真を混ぜると、より豊かな物語になります。",
    addPhotos: "写真を追加する",
    photoHint: "JPEG・PNG・WebP・HEIC / 1枚20MBまで",
    remaining: "あと{count}枚追加できます",
    back: "戻る",
    next: "次へ",
    startOver: "写真を選び直す",
    previewEyebrow: "PRIVATE PREVIEW",
    previewTitle: "ここから、家族の物語が始まります。",
    previewBody: "写真を選ぶと、このフレームがあの子だけの映画に変わります。",
    progressStages: ["準備しています", "写真を安全に送信しています", "思い出を構成しています", "プレビューを仕上げています"],
    completed: "無料プレビューが完成しました",
    completedBody: "共有、家族からの写真追加、本編の注文へ進めます。",
    recommended: "いちばん選ばれています",
    oneTime: "一回払い",
    delivery: "人の確認後に限定納品",
  },
  en: {
    eyebrow: "YOUR STORY",
    intro: "Your first film in three gentle steps.",
    introBody: "Entries are not autosaved. Once your preview is created, its private management link is safely kept in this browser.",
    stepNames: ["About them", "Memories", "Photos"],
    stepOneTitle: "First, tell us about them.",
    stepOneBody: "This shapes the title and emotional rhythm of the story.",
    stepTwoTitle: "Put the moments you remember into words.",
    stepTwoBody: "No polished writing needed. A few short, factual details are perfect.",
    memoryPlaceholders: ["e.g. Sunny afternoons were always spent by the window", "e.g. They met us at the door every evening", "e.g. The day they became family"],
    stepThreeTitle: "Choose the photos that belong in the story.",
    stepThreeBody: "A mix of expressions and seasons gives the film a richer arc.",
    addPhotos: "Add photos",
    photoHint: "JPEG, PNG, WebP or HEIC / up to 20MB each",
    remaining: "You can add {count} more",
    back: "Back",
    next: "Continue",
    startOver: "Choose different photos",
    previewEyebrow: "PRIVATE PREVIEW",
    previewTitle: "This is where your family story begins.",
    previewBody: "Choose your photos and this frame becomes a film made only for them.",
    progressStages: ["Preparing your story", "Uploading photos securely", "Shaping the memories", "Finishing the preview"],
    completed: "Your free preview is ready",
    completedBody: "Share it, invite family to contribute, or continue to the full film.",
    recommended: "Most loved",
    oneTime: "One-time payment",
    delivery: "Privately delivered after human review",
  },
  es: {
    eyebrow: "TU HISTORIA",
    intro: "Tu primera película en tres sencillos pasos.",
    introBody: "Los datos no se guardan automáticamente. Al crear la vista previa, el enlace privado se guarda en este navegador.",
    stepNames: ["Sobre tu mascota", "Recuerdos", "Fotos"],
    stepOneTitle: "Primero, cuéntanos sobre tu compañero.",
    stepOneBody: "Esto define el título y el ritmo emocional de la historia.",
    stepTwoTitle: "Pon en palabras los momentos que recuerdas.",
    stepTwoBody: "No hace falta escribir perfecto. Bastan detalles breves y reales.",
    memoryPlaceholders: ["p. ej. Le encantaba dormir junto a la ventana", "p. ej. Siempre nos esperaba en la puerta", "p. ej. El día que llegó a la familia"],
    stepThreeTitle: "Elige las fotos que cuentan la historia.",
    stepThreeBody: "Mezclar expresiones y épocas crea una película más rica.",
    addPhotos: "Añadir fotos",
    photoHint: "JPEG, PNG, WebP o HEIC / hasta 20MB cada una",
    remaining: "Puedes añadir {count} más",
    back: "Atrás",
    next: "Continuar",
    startOver: "Elegir otras fotos",
    previewEyebrow: "VISTA PREVIA PRIVADA",
    previewTitle: "Aquí comienza vuestra historia familiar.",
    previewBody: "Elige las fotos y este marco se convertirá en una película solo para tu compañero.",
    progressStages: ["Preparando la historia", "Subiendo las fotos de forma segura", "Dando forma a los recuerdos", "Terminando la vista previa"],
    completed: "Tu vista previa está lista",
    completedBody: "Compártela, invita a la familia o continúa con la película completa.",
    recommended: "La más elegida",
    oneTime: "Pago único",
    delivery: "Entrega privada tras revisión humana",
  },
  pt: {
    eyebrow: "SUA HISTÓRIA",
    intro: "Seu primeiro filme em três passos leves.",
    introBody: "Os dados não são salvos automaticamente. Ao criar a prévia, o link privado fica guardado neste navegador.",
    stepNames: ["Sobre o pet", "Memórias", "Fotos"],
    stepOneTitle: "Primeiro, conte um pouco sobre seu companheiro.",
    stepOneBody: "Isso define o título e o ritmo emocional da história.",
    stepTwoTitle: "Coloque em palavras os momentos que você lembra.",
    stepTwoBody: "Não precisa escrever perfeitamente. Detalhes breves e reais bastam.",
    memoryPlaceholders: ["ex. Adorava dormir perto da janela", "ex. Sempre nos esperava na porta", "ex. O dia em que entrou para a família"],
    stepThreeTitle: "Escolha as fotos que contam a história.",
    stepThreeBody: "Misturar expressões e épocas deixa o filme mais rico.",
    addPhotos: "Adicionar fotos",
    photoHint: "JPEG, PNG, WebP ou HEIC / até 20MB cada",
    remaining: "Você pode adicionar mais {count}",
    back: "Voltar",
    next: "Continuar",
    startOver: "Escolher outras fotos",
    previewEyebrow: "PRÉVIA PRIVADA",
    previewTitle: "É aqui que a história da família começa.",
    previewBody: "Escolha as fotos e este quadro se transforma em um filme feito só para seu companheiro.",
    progressStages: ["Preparando a história", "Enviando as fotos com segurança", "Organizando as memórias", "Finalizando a prévia"],
    completed: "Sua prévia está pronta",
    completedBody: "Compartilhe, convide a família ou continue para o filme completo.",
    recommended: "Mais escolhido",
    oneTime: "Pagamento único",
    delivery: "Entrega privada após revisão humana",
  },
} as const

const photoRequirement = { ja: "最低{min}枚・推奨{ideal}枚で短いショットを構成", en: "{min}+ photos required; {ideal} recommended for tighter shots", es: "Mínimo {min} fotos; {ideal} recomendadas para planos más ágiles", pt: "Mínimo de {min} fotos; {ideal} recomendadas para cenas mais dinâmicas" } as const
const addPhotosRequired = { ja: "あと{count}枚追加", en: "Add {count} more photos", es: "Añade {count} fotos", pt: "Adicione mais {count} fotos" } as const

async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const body = await response.json() as { error?: string } & T
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`)
  return body
}

export default function PetMovieWizard({ locale, checkoutEnabled }: { locale: Locale; checkoutEnabled: boolean }) {
  const t = text[locale]
  const x = experienceText[locale]
  const reducedMotion = useReducedMotion()
  const [step, setStep] = useState(1)
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
  const selectedSpecies = useWatch({ control: form.control, name: "species" })

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
      trackPetMarketingEvent("project_created", locale)
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
      trackPetMarketingEvent("preview_created", locale)
      toast.success(t.previewReady)
    } catch (error) {
      console.error("[pet-life-movie] preview creation failed", error)
      toast.error(error instanceof Error ? error.message : t.failed)
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = form.handleSubmit(submitPreview, () => toast.error(t.invalid))

  async function continueTo(nextStep: 2 | 3) {
    const valid = nextStep === 2
      ? await form.trigger(["petName", "species", "occasion", "timeTogether"], { shouldFocus: true })
      : await form.trigger("memories", { shouldFocus: true })
    if (!valid) {
      toast.error(t.invalid)
      return
    }
    if (nextStep === 2) trackPetMarketingEvent("wizard_start", locale)
    setStep(nextStep)
  }

  function selectFiles(selected: File[]) {
    const nextFiles = [...files, ...selected].slice(0, 20)
    const error = validatePetMovieFiles(nextFiles, 0)
    if (error) {
      toast.error(error)
      return
    }
    setFiles(nextFiles)
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))
  }

  const progressStage = x.progressStages[progress < 18 ? 0 : progress < 68 ? 1 : progress < 84 ? 2 : 3]

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
      trackPetMarketingEvent("checkout_started", locale)
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
    <section id="create" className="relative overflow-hidden bg-paradigm-paper-deep py-20 sm:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-paradigm-accent/30 to-transparent" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-paradigm-accent">{x.eyebrow}</p>
          <h2 className="mt-4 font-display text-4xl tracking-[-.04em] sm:text-5xl">{x.intro}</h2>
          <p className="mt-4 text-sm leading-7 text-paradigm-ink-soft">{x.introBody}</p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14">
          <div className="overflow-hidden rounded-[2rem] border border-paradigm-line bg-paradigm-paper-card shadow-[0_24px_80px_rgba(15,17,21,.1)] sm:rounded-[2.5rem]">
            <div className="border-b border-paradigm-line bg-paradigm-paper/70 px-5 py-5 sm:px-8">
              <ol className="grid grid-cols-3 gap-2" aria-label={t.progress}>
                {x.stepNames.map((name, index) => {
                  const number = index + 1
                  const active = step === number
                  const complete = step > number || Boolean(preview)
                  return (
                    <li key={name}>
                      <button type="button" disabled={busy || number > step || Boolean(preview)} onClick={() => setStep(number)} className="group flex w-full items-center gap-2 text-left disabled:cursor-default">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition ${complete ? "bg-emerald-600 text-white" : active ? "bg-paradigm-ink text-paradigm-paper" : "bg-paradigm-paper-deep text-paradigm-ink-mute"}`}>{complete ? <Check className="h-4 w-4" aria-hidden="true" /> : number}</span>
                        <span className={`hidden text-xs font-semibold sm:block ${active ? "text-paradigm-ink" : "text-paradigm-ink-mute"}`}>{name}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>

            <div className="p-5 sm:p-8">
              {recentUrl && !preview && (
                <a href={recentUrl} className="mb-7 flex items-center justify-between rounded-2xl border border-paradigm-accent/25 bg-paradigm-accent/5 p-4 text-sm transition hover:border-paradigm-accent/50">
                  <span><strong className="block">{t.resume}</strong><span className="mt-1 block text-xs leading-5 text-paradigm-ink-mute">{t.resumeHint}</span></span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              )}

              <form onSubmit={onSubmit}>
                <AnimatePresence mode="wait" initial={false}>
                  {step === 1 && (
                    <motion.div key="about" initial={reducedMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={reducedMotion ? undefined : { opacity: 0, x: -18 }} transition={{ duration: 0.24 }}>
                      <h3 className="font-display text-2xl tracking-[-.02em] sm:text-3xl">{x.stepOneTitle}</h3>
                      <p className="mt-2 text-sm leading-6 text-paradigm-ink-soft">{x.stepOneBody}</p>
                      <div className="mt-8 space-y-6">
                        <div className="space-y-2"><Label htmlFor="petName">{t.pet}</Label><Input id="petName" autoFocus className="h-12 rounded-xl text-base" {...form.register("petName")} aria-invalid={Boolean(form.formState.errors.petName)} />{form.formState.errors.petName && <p role="alert" className="text-xs text-red-700">{t.invalid}</p>}</div>
                        <fieldset><legend className="mb-3 text-sm font-medium">{t.species}</legend><div className="grid grid-cols-2 gap-3">{(["dog", "cat"] as const).map((species) => { const selected = selectedSpecies === species; const Icon = species === "dog" ? Dog : Cat; return <button key={species} type="button" aria-pressed={selected} onClick={() => form.setValue("species", species, { shouldValidate: true })} className={`flex min-h-20 items-center justify-center gap-3 rounded-2xl border text-sm font-semibold transition ${selected ? "border-paradigm-accent bg-paradigm-accent/8 text-paradigm-accent shadow-sm" : "border-paradigm-line bg-paradigm-paper hover:border-paradigm-accent/40"}`}><Icon className="h-5 w-5" aria-hidden="true" />{species === "dog" ? t.dog : t.cat}</button> })}</div></fieldset>
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div className="space-y-2"><Label htmlFor="occasion">{t.story}</Label><select id="occasion" {...form.register("occasion")} className="h-12 w-full rounded-xl border border-paradigm-line bg-paradigm-paper px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paradigm-accent"><option value="life">{t.life}</option><option value="birthday">{t.birthday}</option><option value="adoption">{t.adoption}</option><option value="growth">{t.growth}</option><option value="memorial">{t.memorial}</option></select></div>
                          <div className="space-y-2"><Label htmlFor="timeTogether">{t.together}</Label><Input id="timeTogether" className="h-12 rounded-xl" {...form.register("timeTogether")} placeholder={locale === "ja" ? "例：12年間" : "e.g. 12 years"} /></div>
                        </div>
                        <Button type="button" size="lg" onClick={() => void continueTo(2)} className="h-13 w-full rounded-full bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent">{x.next}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="memories" initial={reducedMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={reducedMotion ? undefined : { opacity: 0, x: -18 }} transition={{ duration: 0.24 }}>
                      <h3 className="font-display text-2xl tracking-[-.02em] sm:text-3xl">{x.stepTwoTitle}</h3>
                      <p className="mt-2 text-sm leading-6 text-paradigm-ink-soft">{x.stepTwoBody}</p>
                      <fieldset className="mt-8 space-y-4"><legend className="sr-only">{t.memories}</legend>{[0, 1, 2].map((index) => <div key={index} className="relative"><span className="absolute left-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-paradigm-accent/10 text-[10px] font-bold text-paradigm-accent">{index + 1}</span><Textarea {...form.register(`memories.${index}`)} aria-label={`${t.memories} ${index + 1}`} placeholder={x.memoryPlaceholders[index]} className="min-h-28 rounded-2xl border-paradigm-line bg-paradigm-paper pl-13 pt-4 leading-6" /></div>)}</fieldset>
                      {form.formState.errors.memories && <p role="alert" className="mt-3 text-xs text-red-700">{t.invalid}</p>}
                      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row"><Button type="button" variant="ghost" size="lg" onClick={() => setStep(1)} className="rounded-full sm:w-1/3"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{x.back}</Button><Button type="button" size="lg" onClick={() => void continueTo(3)} className="rounded-full bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent sm:w-2/3">{x.next}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div key="photos" initial={reducedMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={reducedMotion ? undefined : { opacity: 0, x: -18 }} transition={{ duration: 0.24 }}>
                      <h3 className="font-display text-2xl tracking-[-.02em] sm:text-3xl">{x.stepThreeTitle}</h3>
                      <p className="mt-2 text-sm leading-6 text-paradigm-ink-soft">{x.stepThreeBody}</p>
                      <div className="mt-8">
                        <Label htmlFor="photos" className="group flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-paradigm-accent/45 bg-gradient-to-b from-paradigm-accent/8 to-paradigm-paper p-6 text-center transition hover:border-paradigm-accent hover:shadow-lg"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-paradigm-ink text-paradigm-paper shadow-lg transition group-hover:-translate-y-1"><ImagePlus className="h-6 w-6" aria-hidden="true" /></span><strong className="mt-4 text-sm">{x.addPhotos}</strong><span className="mt-1 text-xs text-paradigm-ink-mute">{x.photoHint}</span></Label>
                        <input id="photos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" onChange={(event) => { selectFiles(Array.from(event.target.files ?? [])); event.target.value = "" }} />
                        <div className="mt-3 flex items-center justify-between text-xs text-paradigm-ink-mute"><span aria-live="polite">{files.length} / 20 {t.selected}</span><span>{x.remaining.replace("{count}", String(20 - files.length))}</span></div>
                        {localUrls.length > 0 && <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">{localUrls.map((url, index) => <div key={url} className="group relative aspect-square overflow-hidden rounded-xl bg-paradigm-paper"><Image src={url} alt={`${files[index].name} preview`} fill sizes="120px" className="object-cover" unoptimized /><button type="button" onClick={() => removeFile(index)} aria-label={`${files[index].name} ${x.startOver}`} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-white opacity-100 backdrop-blur sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:focus-visible:opacity-100"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button></div>)}</div>}
                      </div>
                      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-paradigm-line bg-paradigm-paper p-4 text-xs leading-6 text-paradigm-ink-soft"><input type="checkbox" {...form.register("consentConfirmed")} className="mt-1 h-4 w-4 accent-violet-600" /><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /><span>{t.consent}</span></label>
                      {form.formState.errors.consentConfirmed && <p role="alert" className="mt-2 text-xs text-red-700">{t.invalid}</p>}
                      {busy && <div aria-live="polite" className="mt-6 rounded-2xl bg-paradigm-ink p-5 text-paradigm-paper"><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-semibold"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{progressStage}</span><span>{progress}%</span></div><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-amber-300 transition-[width] duration-500" style={{ width: `${progress}%` }} /></div></div>}
                      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row"><Button type="button" variant="ghost" size="lg" disabled={busy} onClick={() => setStep(2)} className="rounded-full sm:w-1/3"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{x.back}</Button><Button type="submit" size="lg" disabled={busy} className="rounded-full bg-paradigm-ink text-paradigm-paper shadow-lg hover:bg-paradigm-accent sm:w-2/3">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}{t.create}</Button></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 lg:sticky lg:top-28">
            {preview ? (
              <PetMoviePreview storyboard={preview.storyboard} assetUrls={preview.assetUrls} className="w-full max-w-[390px]" />
            ) : (
              <div className="relative aspect-[9/16] w-full max-w-[390px] overflow-hidden rounded-[2.5rem] border-[6px] border-white bg-[#17131c] shadow-[0_30px_90px_rgba(15,17,21,.25)]">
                <Image src="/pet-life-movie/hero-family-v1.webp" alt="" fill sizes="390px" className="scale-110 object-cover opacity-60 blur-[1px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111018] via-[#111018]/20 to-black/15" />
                <div className="absolute left-5 right-5 top-5 flex items-center justify-between text-[9px] font-bold tracking-[.16em] text-white/70"><span>{x.previewEyebrow}</span><span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />PRIVATE</span></div>
                <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9"><Camera className="mb-5 h-7 w-7 text-violet-300" aria-hidden="true" /><p className="font-display text-3xl leading-tight tracking-[-.03em]">{x.previewTitle}</p><p className="mt-3 text-sm leading-6 text-white/65">{x.previewBody}</p><div className="mt-7 flex gap-1.5">{[0, 1, 2, 3].map((item) => <span key={item} className={`h-1 flex-1 rounded-full ${item === step - 1 ? "bg-white" : "bg-white/20"}`} />)}</div></div>
              </div>
            )}
            {preview && <div className="w-full max-w-md text-center"><div className="mb-5"><p className="font-display text-2xl">{x.completed}</p><p className="mt-2 text-sm leading-6 text-paradigm-ink-soft">{x.completedBody}</p></div><div className="flex flex-wrap justify-center gap-2"><Button variant="outline" className="rounded-full" onClick={copyShareLink}><Copy className="h-4 w-4" aria-hidden="true" />{t.share}</Button><Button variant="outline" className="rounded-full" onClick={createInvite}><UserPlus className="h-4 w-4" aria-hidden="true" />{t.invite}</Button><Button variant="ghost" className="rounded-full" onClick={copyManageLink}><KeyRound className="h-4 w-4" aria-hidden="true" />{locale === "ja" ? "管理用リンク" : "Management link"}</Button></div></div>}
            {inviteUrl && <div className="w-full max-w-md rounded-2xl border border-paradigm-line bg-paradigm-paper-card p-4 text-center shadow-sm"><p className="break-all text-xs text-paradigm-ink-mute">{inviteUrl}</p><a href={`https://line.me/R/msg/text/?${encodeURIComponent(inviteUrl)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-full bg-[#06C755] px-5 py-2 text-xs font-semibold text-white">LINE</a></div>}
          </div>
        </div>
      </div>

      {preview && (
        <div className="mx-auto mt-24 max-w-6xl px-5 sm:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-paradigm-accent">FULL FILM</p><h3 className="mt-4 font-display text-4xl tracking-[-.04em]">{t.plans}</h3></div>
          <div className="mb-6 grid gap-3 rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-5 text-sm leading-6 text-paradigm-ink-soft md:grid-cols-2 md:p-6">
            <p><span className="font-semibold text-paradigm-ink">Free preview</span><br />{PET_MOVIE_TIER_DISCLOSURE[locale].preview}</p>
            <p><span className="font-semibold text-paradigm-ink">Paid film</span><br />{PET_MOVIE_TIER_DISCLOSURE[locale].paid}</p>
          </div>
          <div className="mx-auto mb-9 max-w-xl rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-6 shadow-sm"><div className="space-y-3"><Label htmlFor="checkoutEmail">{locale === "ja" ? "納品先メールアドレス" : "Delivery email"}</Label><Input id="checkoutEmail" type="email" autoComplete="email" required className="h-12 rounded-xl" value={checkoutEmail} onChange={(event) => setCheckoutEmail(event.target.value)} placeholder="you@example.com" /><p className="text-xs leading-5 text-paradigm-ink-mute">{locale === "ja" ? "注文確認と、品質確認済み動画の完成通知にのみ使用します。" : "Used for your receipt, order confirmation, and reviewed-film delivery."}</p><label className="flex items-start gap-3 rounded-xl bg-paradigm-paper-deep p-4 text-xs leading-5 text-paradigm-ink-soft"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1" /><span>{t.terms} <a className="font-semibold underline" href={`/${locale}/pet-life-movie/terms`} target="_blank" rel="noopener noreferrer">Terms</a></span></label></div></div>
          <div className="grid gap-5 md:grid-cols-3">{PET_MOVIE_PLANS.map((plan) => { const recommended = plan.id === "story"; const missingPhotos = Math.max(0, plan.minimumPhotos - preview.storyboard.scenes.length); return <Card key={plan.id} className={`relative overflow-hidden rounded-[1.75rem] bg-paradigm-paper-card ${recommended ? "border-paradigm-accent shadow-[0_20px_60px_rgba(111,70,245,.18)]" : "border-paradigm-line"}`}>{recommended && <div className="bg-paradigm-accent px-4 py-2 text-center text-[10px] font-bold uppercase tracking-[.16em] text-white">{x.recommended}</div>}<CardContent className="p-7"><div className="mb-6 flex items-start justify-between gap-4"><div><p className="font-display text-2xl">{plan.name}</p><p className="mt-1 text-xs text-paradigm-ink-mute">{plan.durationSeconds} sec · {plan.formats.join(" + ")}</p></div><span className="text-3xl font-bold tracking-tight">${plan.priceUsd}</span></div><ul className="mb-7 space-y-3 text-sm text-paradigm-ink-soft"><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{photoRequirement[locale].replace("{min}", String(plan.minimumPhotos)).replace("{ideal}", String(plan.idealPhotos))}</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{t.noWatermark}</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{t.identitySafe}</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{x.oneTime}</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{x.delivery}</li></ul><Button className={`h-12 w-full rounded-full ${recommended ? "bg-paradigm-ink text-paradigm-paper hover:bg-paradigm-accent" : ""}`} variant={recommended ? "default" : "outline"} disabled={busy || !checkoutEnabled || missingPhotos > 0} onClick={() => startCheckout(plan.id)}>{checkoutEnabled ? (missingPhotos > 0 ? addPhotosRequired[locale].replace("{count}", String(missingPhotos)) : t.choosePlan.replace("{plan}", plan.name)) : t.paidSoon}</Button></CardContent></Card> })}</div>
        </div>
      )}
    </section>
  )
}
