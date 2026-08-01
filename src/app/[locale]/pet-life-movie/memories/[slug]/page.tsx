import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Download, Film, Heart, PawPrint, Sparkles } from "lucide-react"
import PetMoviePreview from "@/components/pet-life-movie/PetMoviePreview"
import { loadSharedPetMovie } from "@/lib/pet-life-movie/share"

interface Props {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<{ payment?: string }>
}

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
  const shared = await loadSharedPetMovie(slug)
  if (!shared?.project.storyboard) notFound()
  const { project, assetUrls } = shared
  const storyboard = project.storyboard
  if (!storyboard) notFound()
  const paymentMessage = query.payment === "success"
    ? "Payment received. Your full film is now entering the identity-safe render queue."
    : query.payment === "cancelled"
      ? "Checkout was cancelled. Your preview is still safe here."
      : null
  return (
    <main className="min-h-screen bg-[#0d0b12] px-5 pb-20 pt-28 text-white md:px-8">
      <div className="mx-auto max-w-6xl">
        {paymentMessage && <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-violet-400/30 bg-violet-400/10 p-4 text-center text-sm text-violet-100">{paymentMessage}</div>}
        <div className="grid items-center gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <PetMoviePreview storyboard={storyboard} assetUrls={assetUrls} watermark={project.status !== "delivered"} className="mx-auto w-full max-w-[390px]" />
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/70"><PawPrint className="h-4 w-4 text-violet-400" aria-hidden="true" />Private memory</div>
            <h1 className="font-display text-5xl leading-tight md:text-7xl">{storyboard.title}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/65">{storyboard.closing}</p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs text-white/60"><span className="rounded-full border border-white/10 px-3 py-2">{storyboard.scenes.length} scenes</span><span className="rounded-full border border-white/10 px-3 py-2">Factual captions only</span><span className="rounded-full border border-white/10 px-3 py-2">Identity protected</span></div>
            {project.status === "delivered" && project.delivery_url ? (
              <a href={project.delivery_url} target="_blank" rel="noopener noreferrer" className="mt-9 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"><Download className="h-4 w-4" aria-hidden="true" />Download full film</a>
            ) : (
              <div className="mt-9 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"><Film className="h-5 w-5 text-violet-400" aria-hidden="true" />{project.payment_status === "paid" ? "The full film is rendering." : "This is the free private preview."}</div>
            )}
          </div>
        </div>
        <div className="mt-20 flex flex-col items-center rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center"><Heart className="mb-5 h-8 w-8 text-rose-400" aria-hidden="true" /><h2 className="font-display text-3xl">Have a story like this?</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/60">Create a private preview from your own dog or cat photos. No account needed.</p><Link href={`/${locale}/pet-life-movie#create`} className="mt-7 inline-flex items-center gap-2 rounded-full bg-violet-500 px-6 py-3 text-sm font-semibold text-white hover:bg-violet-400"><Sparkles className="h-4 w-4" aria-hidden="true" />Create yours</Link></div>
      </div>
    </main>
  )
}
