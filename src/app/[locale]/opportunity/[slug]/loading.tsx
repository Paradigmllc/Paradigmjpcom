export default function OpportunityLoading() {
  return (
    <main className="min-h-dvh animate-pulse bg-zinc-50 px-5 py-20" aria-busy="true" aria-label="Loading opportunity brief">
      <div className="mx-auto max-w-6xl">
        <div className="h-4 w-48 rounded bg-zinc-200" />
        <div className="mt-6 h-14 max-w-3xl rounded bg-zinc-300" />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-28 rounded-xl bg-zinc-200" />)}
        </div>
      </div>
    </main>
  )
}
