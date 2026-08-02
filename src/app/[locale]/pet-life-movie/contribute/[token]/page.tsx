import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PawPrint } from "lucide-react"
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
  return <main className="grid min-h-dvh place-items-center bg-paradigm-paper px-5 py-28"><div className="w-full max-w-xl rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-7 shadow-xl md:p-10"><div className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-paradigm-accent"><PawPrint className="h-4 w-4" aria-hidden="true" />{inviteLabel}</div><PetMovieContributionForm token={token} locale={locale} petName={authorized.project.pet_name} maxFiles={maxFiles} /></div></main>
}

