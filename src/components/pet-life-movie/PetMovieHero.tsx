"use client"

import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowDown, Check, Heart, LockKeyhole, Play, Sparkles, Users } from "lucide-react"

type Locale = "ja" | "en" | "es" | "pt"

const copy = {
  ja: {
    eyebrow: "PET LIFE MOVIE · PRIVATE BY DESIGN",
    title: "写真を、\n家族の物語に。",
    description: "5〜20枚の写真と、本当にあった思い出から。あの子らしさを守った、家族だけの短編映画をつくります。",
    cta: "無料プレビューをつくる",
    secondary: "できあがりを見る",
    promises: ["カード登録不要", "思い出を創作しない", "いつでも削除"],
    preview: "完成イメージ",
    scene: "SCENE 03 · いつもの窓辺",
    caption: "何気ない毎日が、いちばん大切な物語になる。",
    family: "家族も参加できる",
    reviewed: "人が最終確認",
  },
  en: {
    eyebrow: "PET LIFE MOVIE · PRIVATE BY DESIGN",
    title: "Turn photos into\na family story.",
    description: "From 5–20 photos and memories that really happened, create a private short film that protects everything unmistakably theirs.",
    cta: "Create a free preview",
    secondary: "See the experience",
    promises: ["No card required", "No invented memories", "Delete anytime"],
    preview: "Experience preview",
    scene: "SCENE 03 · By the window",
    caption: "The everyday moments become the story worth keeping.",
    family: "Family can contribute",
    reviewed: "Human final review",
  },
  es: {
    eyebrow: "PET LIFE MOVIE · PRIVADO POR DISEÑO",
    title: "Convierte fotos en\nuna historia familiar.",
    description: "Con 5–20 fotos y recuerdos reales, crea una película privada que conserva todo lo que hacía único a tu compañero.",
    cta: "Crear una vista previa gratis",
    secondary: "Ver la experiencia",
    promises: ["Sin tarjeta", "Sin recuerdos inventados", "Borra cuando quieras"],
    preview: "Vista de la experiencia",
    scene: "ESCENA 03 · Junto a la ventana",
    caption: "Los momentos cotidianos se convierten en la historia que quieres guardar.",
    family: "La familia puede participar",
    reviewed: "Revisión humana final",
  },
  pt: {
    eyebrow: "PET LIFE MOVIE · PRIVADO POR DESIGN",
    title: "Transforme fotos em\numa história de família.",
    description: "Com 5–20 fotos e memórias reais, crie um filme privado que preserva tudo o que tornava seu companheiro único.",
    cta: "Criar uma prévia grátis",
    secondary: "Ver a experiência",
    promises: ["Sem cartão", "Sem memórias inventadas", "Exclua quando quiser"],
    preview: "Prévia da experiência",
    scene: "CENA 03 · Perto da janela",
    caption: "Os momentos de todo dia viram a história que merece ser guardada.",
    family: "A família pode participar",
    reviewed: "Revisão humana final",
  },
} as const

export default function PetMovieHero({ locale }: { locale: Locale }) {
  const t = copy[locale]
  const reducedMotion = useReducedMotion()

  return (
    <section className="relative isolate overflow-hidden px-5 pb-20 pt-24 sm:px-8 sm:pb-28 sm:pt-32 lg:pt-36">
      <div className="paradigm-mesh absolute inset-0 -z-30 opacity-45" aria-hidden="true" />
      <div className="absolute -right-24 top-20 -z-20 h-80 w-80 rounded-full bg-amber-200/35 blur-3xl sm:h-[32rem] sm:w-[32rem]" aria-hidden="true" />
      <div className="absolute -left-28 bottom-0 -z-20 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" aria-hidden="true" />

      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-paradigm-line bg-white/75 px-4 py-2 text-[10px] font-bold tracking-[0.17em] text-paradigm-ink-soft shadow-sm backdrop-blur-xl sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 text-paradigm-accent" aria-hidden="true" />
            {t.eyebrow}
          </div>
          <h1 className={`whitespace-pre-line font-display leading-[.92] tracking-[-0.065em] text-paradigm-ink ${locale === "ja" ? "text-[clamp(3.2rem,5.4vw,5rem)]" : "text-[clamp(3.2rem,7vw,6.3rem)]"}`}>
            {t.title}
          </h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-paradigm-ink-soft sm:text-lg sm:leading-9">
            {t.description}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="#create"
              data-pet-movie-event="hero_cta"
              className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-paradigm-ink px-7 text-sm font-semibold text-paradigm-paper shadow-[0_18px_50px_rgba(15,17,21,.2)] transition hover:-translate-y-0.5 hover:bg-paradigm-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paradigm-accent focus-visible:ring-offset-4"
            >
              <Play className="h-4 w-4 fill-current" aria-hidden="true" />
              {t.cta}
            </a>
            <a
              href="#experience"
              data-pet-movie-event="experience_cta"
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold text-paradigm-ink transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paradigm-accent"
            >
              {t.secondary}<ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-paradigm-ink-mute">
            {t.promises.map((promise) => (
              <li key={promise} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />{promise}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[650px]"
        >
          <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-gradient-to-br from-amber-200/50 via-white/20 to-violet-300/40 blur-2xl" aria-hidden="true" />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.25rem] border border-white/70 bg-[#d8c7ad] shadow-[0_35px_100px_rgba(34,24,19,.28)] sm:rounded-[3rem]">
            <Image
              src="/pet-life-movie/hero-family-v1.webp"
              alt={locale === "ja" ? "穏やかな部屋で寄り添う犬と猫" : "A dog and cat resting together in a warm family home"}
              fill
              priority
              sizes="(max-width: 1024px) 92vw, 52vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/10" aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-9">
              <div className="mb-4 inline-flex rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.16em] backdrop-blur-xl">
                {t.preview}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-white/65">{t.scene}</p>
              <p className="mt-3 max-w-lg font-display text-2xl leading-tight tracking-[-.025em] sm:text-4xl">{t.caption}</p>
              <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/25"><div className="h-full w-[62%] rounded-full bg-white" /></div>
            </div>
            <div className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/20 text-white backdrop-blur-xl sm:right-7 sm:top-7">
              <Heart className="h-5 w-5 fill-white" aria-hidden="true" />
            </div>
          </div>

          <motion.div
            animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-3 top-12 hidden items-center gap-3 rounded-2xl border border-white/75 bg-white/90 p-3 pr-5 text-xs font-semibold text-paradigm-ink shadow-xl backdrop-blur-xl sm:flex"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><Users className="h-4 w-4" aria-hidden="true" /></span>
            {t.family}
          </motion.div>
          <motion.div
            animate={reducedMotion ? undefined : { y: [0, 7, 0] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            className="absolute -right-3 bottom-16 hidden items-center gap-3 rounded-2xl border border-white/75 bg-white/90 p-3 pr-5 text-xs font-semibold text-paradigm-ink shadow-xl backdrop-blur-xl sm:flex"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><LockKeyhole className="h-4 w-4" aria-hidden="true" /></span>
            {t.reviewed}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
