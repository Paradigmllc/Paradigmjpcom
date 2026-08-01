export default function JapanOpportunitiesLoading() {
  return (
    <main className="min-h-screen bg-paradigm-paper px-6 pb-24 pt-36 md:px-10 md:pt-44" aria-busy="true" aria-label="Loading Japan opportunities">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="mx-auto h-3 w-44 rounded bg-paradigm-line" />
        <div className="mx-auto mt-8 h-16 max-w-3xl rounded-2xl bg-paradigm-line/70" />
        <div className="mx-auto mt-4 h-16 max-w-2xl rounded-2xl bg-paradigm-line/70" />
        <div className="mt-20 grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-96 rounded-3xl border border-paradigm-line bg-paradigm-paper-card" />)}
        </div>
      </div>
    </main>
  )
}
