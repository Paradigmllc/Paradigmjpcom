import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { Heart, LockKeyhole, PawPrint } from "lucide-react"
import PetMovieContributionForm from "@/components/pet-life-movie/PetMovieContributionForm"
import { authorizePetMovieContributor, listPetMovieAssets } from "@/lib/pet-life-movie/data"

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Private family invitation | Pet Life Movie", description: "Add rights-cleared family photos and real memories to a private Pet Life Movie.", robots: { index: false, follow: false } }
}

export default async function PetMovieContributionPage({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { locale: rawLocale, token } = await params
  const locale = rawLocale === "ja" || rawLocale === "es" || rawLocale === "pt" ? rawLocale : "en"
  const authorized = await authorizePetMovieContributor(token)
  if (!authorized) notFound()
  const assets = await listPetMovieAssets(authorized.project.id)
  const maxFiles = Math.max(0, 20 - assets.length)
  const inviteLabel = locale === "ja" ? "家族限定の招待" : locale === "es" ? "Invitación familiar privada" : locale === "pt" ? "Convite privado da família" : "Private family invitation"
  const aside = locale === "ja"
    ? { title: "あなたしか知らない、あの子の一場面を。", body: "短い言葉と一枚の写真が、家族みんなの物語をもっと豊かにします。追加内容は限定共有ページだけに反映されます。", private: "この招待を受け取った人だけが追加できます" }
    : locale === "es"
      ? { title: "Añade ese momento que solo tú recuerdas.", body: "Unas palabras y una foto pueden enriquecer la historia de toda la familia. Tu aportación solo aparecerá en la página privada.", private: "Solo las personas invitadas pueden colaborar" }
      : locale === "pt"
        ? { title: "Adicione aquele momento que só você lembra.", body: "Poucas palavras e uma foto tornam a história da família ainda mais rica. Sua contribuição aparece apenas na página privada.", private: "Somente pessoas convidadas podem colaborar" }
        : { title: "Add the moment only you remember.", body: "A few words and one photo can make the whole family story richer. Your contribution appears only on the private page.", private: "Only invited people can contribute" }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-paradigm-paper px-5 py-24 sm:px-8 sm:py-32">
      <div className="paradigm-mesh absolute inset-0 opacity-35" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl overflow-hidden rounded-[2.25rem] border border-paradigm-line bg-paradigm-paper-card shadow-[0_35px_100px_rgba(15,17,21,.14)] lg:grid-cols-[.85fr_1.15fr]">
        <aside className="relative min-h-[430px] overflow-hidden p-8 text-white sm:p-10 lg:min-h-full">
          <Image src="/pet-life-movie/hero-family-v1.webp" alt="" fill priority sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#17131c] via-[#17131c]/45 to-black/15" />
          <div className="relative flex h-full min-h-[360px] flex-col justify-between">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-2 text-[10px] font-bold uppercase tracking-[.16em] backdrop-blur-xl"><PawPrint className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />{inviteLabel}</div>
            <div><Heart className="mb-5 h-7 w-7 fill-rose-300 text-rose-300" aria-hidden="true" /><h1 className="font-display text-4xl leading-tight tracking-[-.04em]">{aside.title}</h1><p className="mt-4 text-sm leading-7 text-white/70">{aside.body}</p><p className="mt-6 flex items-center gap-2 text-xs font-semibold text-white/80"><LockKeyhole className="h-4 w-4 text-emerald-300" aria-hidden="true" />{aside.private}</p></div>
          </div>
        </aside>
        <section className="p-7 sm:p-10 lg:p-12"><PetMovieContributionForm token={token} locale={locale} petName={authorized.project.pet_name} maxFiles={maxFiles} /></section>
      </div>
    </main>
  )
}

