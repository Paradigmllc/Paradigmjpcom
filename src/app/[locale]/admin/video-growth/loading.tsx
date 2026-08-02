export default function VideoGrowthLoading() {
  return (
    <main className="min-h-dvh bg-zinc-50 p-6 sm:p-10" aria-label="動画直販キャンペーンOSを読み込み中">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-48 rounded-2xl bg-zinc-200" />
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-28 rounded-2xl bg-zinc-200" />)}
        </div>
        <div className="h-96 rounded-2xl bg-zinc-200" />
      </div>
    </main>
  )
}
