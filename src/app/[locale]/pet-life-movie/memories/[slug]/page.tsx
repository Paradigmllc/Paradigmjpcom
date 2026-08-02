import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Download, Film, Heart, PawPrint, Sparkles } from "lucide-react"
import PetMoviePreview from "@/components/pet-life-movie/PetMoviePreview"
import PetMovieOwnerControls from "@/components/pet-life-movie/PetMovieOwnerControls"
import PetMovieProductionStatus from "@/components/pet-life-movie/PetMovieProductionStatus"
import { loadSharedPetMovie } from "@/lib/pet-life-movie/share"

interface Props {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<{ payment?: string }>
}

const copy = {
  ja: { private: "家族限定の思い出", scenes: "シーン", factual: "事実の字幕のみ", identity: "本人らしさを保護", paid: "お支払いを確認しました。制作と人による品質確認を開始します。", confirming: "決済完了を安全に確認しています。確認後、このページへ制作状況を反映します。", cancelled: "決済はキャンセルされました。無料プレビューはこのまま保存されています。", rendering: "本編を制作しています。", preview: "これは無料の限定プレビューです。", own: "あなたにも物語がありますか？", ownBody: "犬・猫の写真から、登録不要で限定プレビューを作成できます。", create: "無料でつくる" },
  en: { private: "Private family memory", scenes: "scenes", factual: "Factual captions only", identity: "Identity protected", paid: "Payment confirmed. Production and human quality review are starting.", confirming: "Checkout completed. We are securely confirming payment and will update production status here.", cancelled: "Checkout was cancelled. Your free preview remains safe here.", rendering: "The full film is in production.", preview: "This is the free private preview.", own: "Have a story like this?", ownBody: "Create a private preview from your own dog or cat photos. No account needed.", create: "Create yours" },
  es: { private: "Recuerdo familiar privado", scenes: "escenas", factual: "Solo textos factuales", identity: "Identidad protegida", paid: "Pago confirmado. Comenzamos la producción y revisión humana.", confirming: "Estamos confirmando el pago de forma segura y actualizaremos aquí el estado.", cancelled: "El pago se canceló. Tu vista previa sigue guardada.", rendering: "La película está en producción.", preview: "Esta es la vista previa privada gratuita.", own: "¿Tienes una historia así?", ownBody: "Crea una vista previa privada con fotos de tu perro o gato, sin cuenta.", create: "Crear la tuya" },
  pt: { private: "Memória privada da família", scenes: "cenas", factual: "Somente legendas factuais", identity: "Identidade protegida", paid: "Pagamento confirmado. A produção e a revisão humana estão começando.", confirming: "Estamos confirmando o pagamento com segurança e atualizaremos o status aqui.", cancelled: "O pagamento foi cancelado. Sua prévia continua segura.", rendering: "O filme completo está em produção.", preview: "Esta é a prévia privada gratuita.", own: "Você tem uma história assim?", ownBody: "Crie uma prévia privada com fotos do seu cão ou gato, sem conta.", create: "Criar a sua" },
} as const

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const shared = await loadSharedPetMovie(slug)
  if (!shared) return { title: "Pet Life Movie" }
  return {
    title: `${shared.project.pet_name} | Pet Life Movie`,
    description: shared.project.storyboard?.title ?? "A private Pet Life Movie memory",
    robots: { index: false, follow: false },
  }
}

export default async function SharedPetMoviePage({ params, searchParams }: Props) {
  const [{ locale, slug }, query] = await Promise.all([params, searchParams])
  const supportedLocale = locale === "ja" || locale === "es" || locale === "pt" ? locale : "en"
  const t = copy[supportedLocale]
  const shared = await loadSharedPetMovie(slug)
  if (!shared?.project.storyboard) notFound()
  const { project, assetUrls, deliverables } = shared
  const storyboard = project.storyboard
  if (!storyboard) notFound()
  const paymentMessage = query.payment === "success"
    ? project.payment_status === "paid"
      ? t.paid
      : t.confirming
    : query.payment === "cancelled"
      ? t.cancelled
      : null
  return (
    <main className="min-h-dvh bg-[#0d0b12] px-5 pb-20 pt-28 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        {paymentMessage && <div aria-live="polite" className="mx-auto mb-8 max-w-2xl rounded-2xl border border-violet-400/30 bg-violet-400/10 p-4 text-center text-sm text-violet-100">{paymentMessage}</div>}
        <div className="grid items-center gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <PetMoviePreview storyboard={storyboard} assetUrls={assetUrls} watermark={project.status !== "delivered"} className="mx-auto w-full max-w-[390px]" />
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/70"><PawPrint className="h-4 w-4 text-violet-400" aria-hidden="true" />{t.private}</div>
            <h1 className="font-display text-5xl leading-tight md:text-7xl">{storyboard.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/65">{storyboard.closing}</p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs text-white/60"><span className="rounded-full border border-white/10 px-3 py-2">{storyboard.scenes.length} {t.scenes}</span><span className="rounded-full border border-white/10 px-3 py-2">{t.factual}</span><span className="rounded-full border border-white/10 px-3 py-2">{t.identity}</span></div>
            {project.status === "delivered" && deliverables.length > 0 ? (
              <div className="mt-9 flex flex-wrap gap-3">{deliverables.map((item) => <a key={item.name} href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"><Download className="h-4 w-4" aria-hidden="true" />{item.name}</a>)}</div>
            ) : (
              project.payment_status === "paid" ? <PetMovieProductionStatus locale={supportedLocale} projectStatus={project.status} jobStatus={shared.job?.status ?? null} progress={shared.job?.progress ?? 0} /> : <div className="mt-9 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"><Film className="h-5 w-5 text-violet-400" aria-hidden="true" />{t.preview}</div>
            )}
            <PetMovieOwnerControls projectId={project.id} locale={locale} expiresAt={project.expires_at} />
          </div>
        </div>
        <div className="mt-20 flex flex-col items-center rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center"><Heart className="mb-5 h-8 w-8 text-rose-400" aria-hidden="true" /><h2 className="font-display text-3xl">{t.own}</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/60">{t.ownBody}</p><Link href={`/${supportedLocale}/pet-life-movie#create`} className="mt-7 inline-flex items-center gap-2 rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-400"><Sparkles className="h-4 w-4" aria-hidden="true" />{t.create}</Link></div>
      </div>
    </main>
  )
}
