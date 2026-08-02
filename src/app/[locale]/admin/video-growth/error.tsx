"use client"

export default function VideoGrowthError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-lg font-black text-rose-700">!</span>
        <h1 className="mt-5 text-xl font-bold text-zinc-950">動画直販キャンペーンOSの読み込みに失敗しました</h1>
        <p className="mt-3 text-sm leading-relaxed text-rose-700">{error.message || "予期せぬエラーが発生しました"}</p>
        <button type="button" onClick={reset} className="mt-6 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800">再試行</button>
      </section>
    </main>
  )
}
