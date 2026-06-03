import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "OpenMontage Studio | Paradigm",
  description: "Next-generation video production studio",
  robots: "noindex,nofollow",
}

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#090a0f] text-white selection:bg-cyan-500/30">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />
      </div>
      
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#090a0f]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center font-bold text-sm tracking-tighter">
              OM
            </div>
            <span className="font-semibold tracking-wide text-sm opacity-90">OpenMontage Studio</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-medium tracking-widest uppercase text-cyan-400 ml-2 border border-white/5">
              Production
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium opacity-60">
            <a href="#" className="hover:opacity-100 transition-opacity">Projects</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Assets</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Settings</a>
            <div className="w-8 h-8 rounded-full bg-white/10 ml-4 border border-white/20" />
          </nav>
        </div>
      </header>

      <main className="relative z-10 pt-24 pb-12 min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  )
}
