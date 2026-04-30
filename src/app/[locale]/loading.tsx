/**
 * /[locale]/loading.tsx — Aesop-style suspense fallback
 *
 * 役割: route group 配下の Server Component が読み込み中のあいだ表示される
 *       luxury skeleton。next/navigation の Suspense boundary が使う。
 * 入力: なし (locale は親 [locale]/layout.tsx の context から間接的に伝播)
 * 出力: ページ全幅の minimal loader (コンテンツが描画されるまで一瞬で消える)
 *
 * H ルール (3 状態): ローディング状態 — 必須実装。
 */

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-paradigm-paper">
      <div className="paradigm-glass rounded-2xl px-8 py-6 paradigm-glow-md flex items-center gap-4">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-paradigm-line" />
          <div className="absolute inset-0 rounded-full border-2 border-paradigm-accent border-t-transparent animate-spin" />
        </div>
        <div className="flex flex-col">
          <span className="paradigm-eyebrow text-paradigm-accent">Loading</span>
          <span className="text-[13px] text-paradigm-ink-soft">少々お待ちください…</span>
        </div>
      </div>
    </div>
  )
}
