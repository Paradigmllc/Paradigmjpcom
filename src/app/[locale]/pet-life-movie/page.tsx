import type { Metadata } from "next"
import { CheckCircle2, Film, Heart, ShieldCheck, Users } from "lucide-react"
import { assertLocale } from "@/lib/cms/filters"
import { pageAlternates } from "@/lib/page-metadata"
import PetMovieHero from "@/components/pet-life-movie/PetMovieHero"
import PetMovieWizard from "@/components/pet-life-movie/PetMovieWizard"
import PetMovieCommercialDetails from "@/components/pet-life-movie/PetMovieCommercialDetails"
import PetMovieAttribution from "@/components/pet-life-movie/PetMovieAttribution"
import { getPetMovieMarketReadiness } from "@/lib/pet-life-movie/readiness"
import { PET_MOVIE_DELIVERY_BUSINESS_DAYS, PET_MOVIE_PLANS } from "@/lib/pet-life-movie/commercial"

type SupportedLocale = "ja" | "en" | "es" | "pt"

const copy = {
  ja: { title: "写真を、家族の物語に。", description: "犬・猫の写真5〜20枚から、大切な記憶を事実のまま短編映画に。登録不要で無料プレビュー。", stepsTitle: "思い出を預けて、映画になるまで。", stepsLead: "難しい編集はありません。家族が知っている事実を、作品へ丁寧につなぎます。", steps: [["01", "思い出を集める", "写真と本当にあった出来事を追加。家族も限定リンクから参加できます。"], ["02", "物語を確かめる", "入力された事実だけで構成したストーリーボードと無料プレビューを確認。"], ["03", "人が仕上げる", "注文後は制作担当がドラフトと最終品質を確認して、限定ページへ納品します。"]], quality: "その子らしさを、最優先に。", qualityBody: "毛並みや顔立ちの一致度が基準を下回る生成映像は使わず、自然なズームとパララックスへ自動で戻します。", together: "みんなで思い出を持ち寄れる", togetherBody: "限定共有リンクで家族や友人と鑑賞。招待リンクから同じプロジェクトへ写真と思い出を追加できます。", oss: "見えない工程まで、誠実に。", safety: ["会話するペット表現なし", "音声複製なし", "事実の字幕のみ"], pipeline: ["FFmpeg・非公開レンダリング", "事実のみのストーリーボード", "人によるドラフト確認", "人による最終品質確認"], privateLine: "非公開 · 限定共有 · いつでも削除" },
  en: { title: "Turn photos into a family story.", description: "Create a private short film from 5–20 dog or cat photos and memories that really happened. No account needed for a free preview.", stepsTitle: "From shared memories to a finished film.", stepsLead: "No editing skills required. The facts your family knows are carefully shaped into the story.", steps: [["01", "Gather the memories", "Add photos and real moments. Family can contribute through a private invitation."], ["02", "Review the story", "Check a factual storyboard and free preview built only from what you supplied."], ["03", "Finished by people", "After ordering, a producer reviews the draft and final quality before private delivery."]], quality: "Their identity comes first.", qualityBody: "If generated motion cannot preserve facial features and fur patterns, the pipeline automatically falls back to gentle zoom and parallax.", together: "A story the family can share", togetherBody: "Watch through an unlisted link. Invite family and friends to add photos and memories to the same project.", oss: "Care you can see, even backstage.", safety: ["No talking pets", "No voice cloning", "Factual captions only"], pipeline: ["FFmpeg · private rendering", "Factual storyboard · no invention", "Human draft review", "Human final quality approval"], privateLine: "Private · Unlisted · Delete anytime" },
  es: { title: "Convierte fotos en una historia familiar.", description: "Crea una película privada con 5–20 fotos de tu perro o gato y recuerdos reales. Vista previa gratis sin cuenta.", stepsTitle: "De los recuerdos compartidos a una película.", stepsLead: "No necesitas editar. Convertimos con cuidado los hechos que conoce tu familia en una historia.", steps: [["01", "Reúne los recuerdos", "Añade fotos y momentos reales. La familia puede participar con una invitación privada."], ["02", "Revisa la historia", "Comprueba un guion factual y una vista previa creada solo con tus datos."], ["03", "Acabado por personas", "Tras el pedido, una persona revisa el borrador y la calidad final antes de la entrega privada."]], quality: "Su identidad es lo primero.", qualityBody: "Si el movimiento generado no conserva su rostro y pelaje, usamos zoom y paralaje suaves automáticamente.", together: "Una historia para compartir en familia", togetherBody: "Compártela mediante un enlace privado e invita a familiares y amigos a añadir fotos y recuerdos al mismo proyecto.", oss: "Cuidado visible, incluso entre bastidores.", safety: ["Sin mascotas parlantes", "Sin clonación de voz", "Solo textos factuales"], pipeline: ["FFmpeg · render privado", "Guion factual", "Revisión humana del borrador", "Aprobación humana final"], privateLine: "Privado · No listado · Elimina cuando quieras" },
  pt: { title: "Transforme fotos em uma história de família.", description: "Crie um filme privado com 5–20 fotos do seu cão ou gato e memórias reais. Prévia grátis sem conta.", stepsTitle: "Das memórias compartilhadas ao filme.", stepsLead: "Você não precisa editar. Os fatos que sua família conhece viram uma história com todo cuidado.", steps: [["01", "Reúna as memórias", "Adicione fotos e momentos reais. A família participa por um convite privado."], ["02", "Confira a história", "Veja um roteiro factual e uma prévia criados somente com o que você forneceu."], ["03", "Finalizado por pessoas", "Após o pedido, uma pessoa revisa o rascunho e a qualidade final antes da entrega privada."]], quality: "A identidade do seu pet vem primeiro.", qualityBody: "Se o movimento gerado não preservar rosto e pelagem, voltamos automaticamente para zoom e paralaxe suaves.", together: "Uma história para toda a família", togetherBody: "Compartilhe por um link privado e convide familiares e amigos para adicionar fotos e memórias ao mesmo projeto.", oss: "Cuidado visível, até nos bastidores.", safety: ["Sem pets falantes", "Sem clonagem de voz", "Somente legendas factuais"], pipeline: ["FFmpeg · render privado", "Roteiro factual", "Revisão humana do rascunho", "Aprovação humana final"], privateLine: "Privado · Não listado · Exclua quando quiser" },
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
      <PetMovieAttribution locale={supportedLocale} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PetMovieHero locale={supportedLocale} />

      <section id="experience" className="border-y border-paradigm-line bg-paradigm-paper-card py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-paradigm-accent">How it works</p><h2 className="mt-4 font-display text-4xl leading-tight tracking-[-.04em] sm:text-5xl">{t.stepsTitle}</h2><p className="mt-5 leading-7 text-paradigm-ink-soft">{t.stepsLead}</p></div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">{t.steps.map(([number, title, body]) => <article key={number} className="group relative overflow-hidden rounded-[1.75rem] border border-paradigm-line bg-paradigm-paper p-7 transition duration-300 hover:-translate-y-1 hover:border-paradigm-accent/40 hover:shadow-xl"><span className="font-display text-5xl text-paradigm-accent/80 transition group-hover:text-paradigm-accent">{number}</span><h3 className="mt-8 font-display text-2xl">{title}</h3><p className="mt-3 text-sm leading-7 text-paradigm-ink-soft">{body}</p></article>)}</div>
        </div>
      </section>

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

      <PetMovieCommercialDetails locale={supportedLocale} />

      <section className="bg-[#111018] py-20 text-white md:py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8"><div className="mb-10 flex items-center gap-3"><Film className="h-7 w-7 text-violet-400" aria-hidden="true" /><h2 className="font-display text-3xl">{t.oss}</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{t.pipeline.map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"><CheckCircle2 className="h-4 w-4 shrink-0 text-violet-400" aria-hidden="true" />{item}</div>)}</div></div>
      </section>
    </main>
  )
}
