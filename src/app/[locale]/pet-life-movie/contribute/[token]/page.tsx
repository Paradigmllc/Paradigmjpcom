import type { Metadata } from "next"
import { PawPrint } from "lucide-react"
import PetMovieContributionForm from "@/components/pet-life-movie/PetMovieContributionForm"

export const metadata: Metadata = {
  title: "Add family photos | Pet Life Movie",
  description: "Private family photo contribution for a Pet Life Movie.",
  robots: { index: false, follow: false },
}

export default async function PetMovieContributionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <main className="grid min-h-dvh place-items-center bg-paradigm-paper px-5 py-28"><div className="w-full max-w-xl rounded-3xl border border-paradigm-line bg-paradigm-paper-card p-7 shadow-xl md:p-10"><div className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-paradigm-accent"><PawPrint className="h-4 w-4" aria-hidden="true" />Private family invitation</div><PetMovieContributionForm token={token} /></div></main>
}

