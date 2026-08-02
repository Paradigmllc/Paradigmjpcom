export default function ContentApiLoading() {
  return (
    <main className="min-h-screen bg-paradigm-paper px-6 pb-24 pt-40 md:px-10">
      <div className="mx-auto max-w-6xl animate-pulse" aria-busy="true" aria-label="Loading Content API catalog">
        <div className="h-4 w-52 rounded bg-paradigm-line" />
        <div className="mt-8 h-16 max-w-4xl rounded-2xl bg-paradigm-line" />
        <div className="mt-4 h-16 max-w-3xl rounded-2xl bg-paradigm-line" />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-64 rounded-3xl bg-paradigm-line" />)}
        </div>
      </div>
    </main>
  )
}
