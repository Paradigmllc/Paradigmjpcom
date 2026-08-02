export default function InvestorBriefLoading() {
  return (
    <main className="min-h-dvh bg-paradigm-paper px-6 pb-20 pt-36 md:px-10 md:pt-44" aria-busy="true" aria-label="Loading investor briefs">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-3 w-48 rounded bg-paradigm-line" />
        <div className="mt-6 h-16 max-w-3xl rounded-2xl bg-paradigm-line" />
        <div className="mt-5 h-5 max-w-2xl rounded bg-paradigm-line" />
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-72 rounded-3xl border border-paradigm-line bg-paradigm-paper-card" />)}
        </div>
      </div>
    </main>
  )
}
