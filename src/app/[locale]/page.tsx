export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      <section className="relative min-h-[80vh] sm:min-h-[90vh] flex items-center bg-paradigm-ink overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 paradigm-mesh-vivid opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-br from-paradigm-ink/75 via-paradigm-ink/60 to-transparent" />
        </div>
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-12 pt-32 pb-20 text-center">
          <div className="inline-flex items-center gap-2.5 bg-paradigm-surface/10 backdrop-blur-sm border border-paradigm-line/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-gradient-to-r from-paradigm-accent to-paradigm-glow animate-pulse" />
            <span className="paradigm-eyebrow text-paradigm-paper/80 text-[10px]">中小企業のデジタルパートナー</span>
          </div>
          <h1 style={{ fontSize: "clamp(2.2rem, 6.5vw, 4.5rem)" }} className="font-display leading-[1.1] tracking-[-0.04em] text-paradigm-paper mb-6">
            <span className="bg-gradient-to-r from-paradigm-paper via-paradigm-glow to-paradigm-tech bg-clip-text text-transparent">
              Web制作×AIで、ビジネスの成長を加速する
            </span>
          </h1>
          <p className="text-[15px] md:text-[17px] text-paradigm-paper/70 max-w-2xl mx-auto mb-10 leading-[1.85] font-light">
            戦略設計から公開後の集客・運用まで。Paradigmが一気通貫で支援します。無料相談で最適なプランをご提案します。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/ja/contact" className="inline-flex items-center gap-2 bg-paradigm-glow/20 backdrop-blur-sm border border-paradigm-glow/40 text-paradigm-paper hover:bg-paradigm-glow/30 px-8 py-4 text-[12px] tracking-[0.18em] uppercase transition-all rounded-xl">
              無料相談を予約する
            </a>
            <a href="/ja/services" className="inline-flex items-center gap-2 border border-paradigm-paper/15 text-paradigm-paper/70 hover:bg-paradigm-paper/8 px-8 py-4 text-[12px] tracking-[0.18em] uppercase transition-colors rounded-xl">
              サービスを見る
            </a>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-paradigm-paper to-transparent pointer-events-none" />
      </section>
    </div>
  )
}
