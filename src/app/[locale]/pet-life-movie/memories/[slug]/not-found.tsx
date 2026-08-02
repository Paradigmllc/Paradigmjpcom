import Link from "next/link"

export default function PetMovieNotFound() {
  return <main className="grid min-h-[70vh] place-items-center bg-paradigm-paper px-5"><div className="text-center"><h1 className="font-display text-4xl">This private memory is unavailable.</h1><p className="my-5 text-sm text-paradigm-ink-soft">The link may have expired or sharing may have been turned off.</p><Link href="/en/pet-life-movie" className="text-sm font-semibold text-paradigm-accent underline">Create a Pet Life Movie</Link></div></main>
}

