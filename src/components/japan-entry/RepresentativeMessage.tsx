import { Quote, ShieldCheck } from "lucide-react"

type Props = {
  eyebrow: string
  title: string
  message: string
  principles: string[]
  signatureLabel: string
  signatureName: string
  role: string
}

export default function RepresentativeMessage({
  eyebrow,
  title,
  message,
  principles,
  signatureLabel,
  signatureName,
  role,
}: Props) {
  return (
    <section className="relative overflow-hidden bg-zinc-950 px-6 py-16 text-white sm:px-8 sm:py-20 lg:px-12" aria-labelledby="representative-message-title">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(37,99,235,0.26),transparent_34%),radial-gradient(circle_at_12%_88%,rgba(16,185,129,0.16),transparent_32%)]" />
      <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">
            <Quote className="h-4 w-4" aria-hidden />
            {eyebrow}
          </p>
          <h2 id="representative-message-title" className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{title}</h2>
          <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300">{message}</p>
          <div className="mt-8 flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-zinc-950" aria-hidden>
              <span className="text-xl font-semibold tracking-[-0.08em]">P.</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{signatureName}</p>
              <p className="mt-1 text-xs text-zinc-400">{role}</p>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm sm:p-8">
          <div className="mb-7 overflow-hidden rounded-xl border border-white/10 bg-zinc-950/60 p-4">
            <svg viewBox="0 0 360 150" role="img" aria-labelledby="operator-map-title" className="h-auto w-full">
              <title id="operator-map-title">A delivery map from buyer path to handover</title>
              <defs>
                <linearGradient id="operator-map-line" x1="0" x2="1">
                  <stop offset="0" stopColor="#34d399" />
                  <stop offset="1" stopColor="#60a5fa" />
                </linearGradient>
              </defs>
              <path d="M52 75 H130 M180 75 H258" stroke="url(#operator-map-line)" strokeWidth="3" strokeLinecap="round" />
              {[{ x: 28, label: "Buyer" }, { x: 130, label: "Scope" }, { x: 180, label: "Build" }, { x: 282, label: "Handover" }].map((node) => (
                <g key={node.label}>
                  <rect x={node.x} y="52" width="52" height="46" rx="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" />
                  <circle cx={node.x + 26} cy="68" r="5" fill="#34d399" />
                  <text x={node.x + 26} y="88" textAnchor="middle" fill="rgba(255,255,255,0.78)" fontSize="9" fontFamily="sans-serif">{node.label}</text>
                </g>
              ))}
              <text x="180" y="25" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="10" fontFamily="sans-serif" letterSpacing="1.5">ONE ACCOUNTABLE PATH</text>
            </svg>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            {signatureLabel}
          </div>
          <ul className="mt-6 space-y-4">
            {principles.map((principle) => (
              <li key={principle} className="flex gap-3 text-sm leading-7 text-zinc-200">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" aria-hidden />
                <span>{principle}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  )
}
