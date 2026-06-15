"use client"

export default function PricingError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-dvh bg-[#fbfaf7] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
          <span className="text-rose-600 text-lg font-bold">!</span>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-zinc-900">料金ページの読み込みに失敗しました</h2>
        <p className="mt-2 text-sm text-zinc-500">{error.message || "予期せぬエラーが発生しました"}</p>
        <button onClick={reset} className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-semibold text-white hover:bg-zinc-800">
          再試行
        </button>
      </div>
    </div>
  )
}
