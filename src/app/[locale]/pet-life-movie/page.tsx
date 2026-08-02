import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, Film, Heart, LockKeyhole, PawPrint, ShieldCheck, Sparkles, Users } from "lucide-react"
import { assertLocale } from "@/lib/cms/filters"
import { pageAlternates } from "@/lib/page-metadata"
import PetMovieWizard from "@/components/pet-life-movie/PetMovieWizard"
import PetMovieCommercialDetails from "@/components/pet-life-movie/PetMovieCommercialDetails"
import { getPetMovieMarketReadiness } from "@/lib/pet-life-movie/readiness"
import { PET_MOVIE_DELIVERY_BUSINESS_DAYS, PET_MOVIE_PLANS } from "@/lib/pet-life-movie/commercial"

type SupportedLocale = "ja" | "en" | "es" | "pt"

const copy = {
  ja: { title: "写真を、家族の物語に。", description: "犬・猫の写真5〜20枚から、大切な記憶を事実のまま短編映画に。登録不要で無料プレビュー。", badge: "登録不要 · 無料プレビュー", cta: "無料でつくる", sub: "写真は非公開。勝手な思い出をAIが作ることはありません。", steps: ["写真と本当にあった思い出を追加", "事実だけでストーリーボードを作成", "無料プレビューを見てから購入"], quality: "その子らしさを、最優先に。", qualityBody: "毛並みや顔立ちの一致度が基準を下回る生成映像は使わず、自然なズームとパララックスへ自動で戻します。", together: "みんなで思い出を持ち寄れる", togetherBody: "限定共有リンクで家族や友人と鑑賞。招待リンクから同じプロジェクトへ写真と思い出を追加できます。", oss: "透明なOSSパイプライン", safety: ["会話するペット表現なし", "音声複製なし", "事実の字幕のみ"], pipeline: ["FFmpeg・非公開レンダリング", "事実のみのストーリーボード", "人によるドラフト確認", "人による最終品質確認"], privateLine: "非公開 · 限定共有 · いつでも削除" },
  en: { title: "Turn photos into a family story.", description: "Create a private short film from 5–20 dog or cat photos and memories that really happened. No account needed for a free preview.", badge: "No account · Free preview", cta: "Create for free", sub: "Photos stay private. AI never invents memories about your pet.", steps: ["Add photos and real memories", "Build a factual storyboard", "Watch the preview before paying"], quality: "Their identity comes first.", qualityBody: "If generated motion cannot preserve facial features and fur patterns, the pipeline automatically falls back to gentle zoom and parallax.", together: "A story the family can share", togetherBody: "Watch through an unlisted link. Invite family and friends to add photos and memories to the same project.", oss: "Transparent OSS pipeline", safety: ["No talking pets", "No voice cloning", "Factual captions only"], pipeline: ["FFmpeg · private rendering", "Factual storyboard · no invention", "Human draft review", "Human final quality approval"], privateLine: "Private · Unlisted · Delete anytime" },
  es: { title: "Convierte fotos en una historia familiar.", description: "Crea una película privada con 5–20 fotos de tu perro o gato y recuerdos reales. Vista previa gratis sin cuenta.", badge: "Sin cuenta · Vista previa gratis", cta: "Crear gratis", sub: "Tus fotos son privadas. La IA nunca inventa recuerdos.", steps: ["Añade fotos y recuerdos reales", "Crea un guion basado en hechos", "Mira la vista previa antes de pagar"], quality: "Su identidad es lo primero.", qualityBody: "Si el movimiento generado no conserva su rostro y pelaje, usamos zoom y paralaje suaves automáticamente.", together: "Una historia para compartir en familia", togetherBody: "Compártela mediante un enlace privado e invita a familiares y amigos a añadir fotos y recuerdos al mismo proyecto.", oss: "Pipeline OSS transparente", safety: ["Sin mascotas parlantes", "Sin clonación de voz", "Solo textos factuales"], pipeline: ["FFmpeg · render privado", "Guion factual", "Revisión humana del borrador", "Aprobación humana final"], privateLine: "Privado · No listado · Elimina cuando quieras" },
  pt: { title: "Transforme fotos em uma história de família.", description: "Crie um filme privado com 5–20 fotos do seu cão ou gato e memórias reais. Prévia grátis sem conta.", badge: "Sem conta · Prévia grátis", cta: "Criar grátis", sub: "Suas fotos são privadas. A IA nunca inventa memórias.", steps: ["Adicione fotos e memórias reais", "Crie um roteiro baseado em fatos", "Veja a prévia antes de pagar"], quality: "A identidade do seu pet vem primeiro.", qualityBody: "Se o movimento gerado não preservar rosto e pelagem, voltamos automaticamente para zoom e paralaxe suaves.", together: "Uma história para toda a família", togetherBody: "Compartilhe por um link privado e convide familiares e amigos para adicionar fotos e memórias ao mesmo projeto.", oss: "Pipeline OSS transparente", safety: ["Sem pets falantes", "Sem clonagem de voz", "Somente legendas factuais"], pipeline: ["FFmpeg · render privado", "Roteiro factual", "Revisão humana do rascunho", "Aprovação humana final"], privateLine: "Privado · Não listado · Exclua quando quiser" },
} as const

interface Props { params: Promise<{ locale: string }> }

function productLocale(locale: string): SupportedLocale {
  return locale === "ja" || locale === "es" || locale === "pt" ? locale : "en"
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = assertLocale(rawLocale)
  const t = copy[productLocale(locale)]
  return {
    title: `Pet Life Movie | ${t.title}`,
    description: t.description,
    alternates: pageAlternates(locale, "/pet-life-movie"),
    openGraph: { title: `Pet Life Movie | ${t.title}`, description: t.description, type: "website" },
  }
}

export default async function PetLifeMoviePage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = assertLocale(rawLocale)
  const supportedLocale = productLocale(locale)
  const t = copy[supportedLocale]
  const readiness = getPetMovieMarketReadiness()
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Pet Life Movie",
    description: t.description,
    provider: { "@type": "Organization", name: "Paradigm LLC", url: "https://paradigmjp.com" },
    areaServed: "Worldwide",
    termsOfService: `https://paradigmjp.com/${supportedLocale}/pet-life-movie/terms`,
    offers: PET_MOVIE_PLANS.map((plan) => ({ "@type": "Offer", name: plan.name, price: plan.priceUsd, priceCurrency: "USD", availability: "https://schema.org/InStock", deliveryLeadTime: { "@type": "QuantitativeValue", value: PET_MOVIE_DELIVERY_BUSINESS_DAYS, unitCode: "DAY" } })),
  }
  return (
    <main className="bg-paradigm-paper text-paradigm-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="relative isolate overflow-hidden px-5 pb-20 pt-28 md:px-8 md:pb-28 md:pt-36">
        <div className="paradigm-mesh absolute inset-0 -z-20 opacity-40" />
        <div className="absolute left-1/2 top-24 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-paradigm-accent/15 blur-3xl" />
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-paradigm-line bg-paradigm-paper-card/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] shadow-sm backdrop-blur">
            <PawPrint className="h-4 w-4 text-paradigm-accent" aria-hidden="true" />{t.badge}
          </div>
          <h1 className="font-display text-5xl leading-[.98] tracking-[-0.05em] sm:text-6xl md:text-8xl">{t.title}</h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-paradigm-ink-soft md:text-lg">{t.description}</p>
          <div className="mt-9 flex flex-col items-center gap-4">
            <Link href="#create" className="inline-flex items-center gap-2 rounded-full bg-paradigm-ink px-7 py-4 text-sm font-semibold text-paradigm-paper shadow-xl transition hover:-translate-y-0.5 hover:bg-paradigm-accent">
              <Sparkles className="h-4 w-4" aria-hidden="true" />{t.cta}
            </Link>
            <p className="flex items-center gap-2 text-xs text-paradigm-ink-mute"><LockKeyhole className="h-4 w-4" aria-hidden="true" />{t.sub}</p>
          </div>
        </div>
      </section>

      <section className="border-y border-paradigm-line bg-paradigm-paper-card py-12">
        <div className="mx-auto grid max-w-5xl gap-7 px-5 md:grid-cols-3 md:px-8">
          {t.steps.map((step, index) => <div key={step} className="flex gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paradigm-accent/10 font-display text-paradigm-accent">{index + 1}</span><p className="pt-1 text-sm font-medium leading-6">{step}</p></div>)}
        </div>
      </section>

      <PetMovieCommercialDetails locale={supportedLocale} />

      <PetMovieWizard
        locale={supportedLocale}
        checkoutEnabled={readiness.checkoutEnabled}
      />

      <section className="py-20 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 md:grid-cols-2 md:px-8">
          <article className="rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-8 shadow-sm md:p-10"><ShieldCheck className="mb-6 h-9 w-9 text-paradigm-accent" aria-hidden="true" /><h2 className="font-display text-3xl">{t.quality}</h2><p className="mt-4 leading-7 text-paradigm-ink-soft">{t.qualityBody}</p><div className="mt-7 flex flex-wrap gap-2 text-xs">{t.safety.map((item) => <span key={item} className="rounded-full bg-paradigm-paper-deep px-3 py-2">{item}</span>)}</div></article>
          <article className="rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-8 shadow-sm md:p-10"><Users className="mb-6 h-9 w-9 text-paradigm-accent" aria-hidden="true" /><h2 className="font-display text-3xl">{t.together}</h2><p className="mt-4 leading-7 text-paradigm-ink-soft">{t.togetherBody}</p><div className="mt-7 flex items-center gap-2 text-sm font-medium"><Heart className="h-4 w-4 text-rose-500" aria-hidden="true" />{t.privateLine}</div></article>
        </div>
      </section>

      <section className="bg-[#111018] py-20 text-white md:py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8"><div className="mb-10 flex items-center gap-3"><Film className="h-7 w-7 text-violet-400" aria-hidden="true" /><h2 className="font-display text-3xl">{t.oss}</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{t.pipeline.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400" aria-hidden="true" />{item}</div>)}</div></div>
      </section>
    </main>
  )
}
