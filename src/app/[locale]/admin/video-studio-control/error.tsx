"use client"

export default function VideoStudioControlError({ reset }: { error: Error; reset: () => void }) {
  return <main className="min-h-dvh bg-zinc-50 p-6"><div role="alert" className="mx-auto max-w-3xl rounded-xl border border-rose-200 bg-white p-6"><h1 className="font-bold text-rose-800">動画生成コントロールを表示できません</h1><button type="button" onClick={reset} className="mt-4 rounded-md border px-4 py-2 text-sm">再試行</button></div></main>
}
