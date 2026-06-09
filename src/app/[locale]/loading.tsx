/**
 * /[locale]/loading.tsx — minimal spinner (no text, animation only).
 *
 * 役割: route group Suspense fallback。全 locale 共通で文字列なし。
 *       concentric ring spinner — paradigm-accent 色の回転リングのみ。
 * 2026-06-09: 12-locale messages 化から「文字列完全廃止・アニメーションのみ」に変更。
 */

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-paradigm-paper">
      <div className="relative w-10 h-10">
        {/* Outer track */}
        <div className="absolute inset-0 rounded-full border-2 border-paradigm-line/40" />
        {/* Spinning arc */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-paradigm-accent animate-spin" />
        {/* Inner dot */}
        <div className="absolute inset-[8px] rounded-full bg-gradient-to-br from-paradigm-accent/20 to-paradigm-glow/10 backdrop-blur-sm" />
      </div>
    </div>
  )
}
