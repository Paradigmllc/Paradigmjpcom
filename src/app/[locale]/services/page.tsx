import type { Metadata } from "next"
import Link from "next/link"
import PageHero from "@/components/PageHero"
import { SERVICES } from "@/lib/data"

export const metadata: Metadata = {
  title: "サービス一覧",
  description: "Web制作・MEO対策・SEO/GEO対策・AI導入支援。Paradigm合同会社が提供する4つのデジタル支援サービスをご紹介します。",
}

const COLOR_MAP: Record<string, string> = {
  indigo: "from-indigo-500 to-indigo-600",
  emerald: "from-emerald-500 to-emerald-600",
  amber: "from-amber-500 to-amber-600",
  purple: "from-purple-500 to-purple-600",
}

export default function ServicesPage() {
  return (
    <>
      <PageHero badge="Services" title="サービス一覧" desc="デジタル技術で事業を加速する、4つのソリューション。" accent="indigo" />

      {/* Services Grid */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto space-y-20">
          {SERVICES.map((s, i) => (
            <div key={s.id} className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12`}>
              {/* Visual */}
              <div className="flex-1 w-full">
                <div className={`relative rounded-3xl bg-gradient-to-br ${COLOR_MAP[s.color]} p-12 text-white aspect-[4/3] flex items-center justify-center`}>
                  <div className="text-center">
                    <span className="text-7xl block mb-4">{s.icon}</span>
                    <p className="text-2xl font-bold">{s.tagline}</p>
                    <p className="mt-4 text-sm font-semibold bg-white/20 inline-block px-4 py-2 rounded-full">{s.results}</p>
                  </div>
                </div>
              </div>
              {/* Text */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-primary mb-4">{s.title}</h2>
                <p className="text-text-muted leading-relaxed mb-6">{s.desc}</p>
                <ul className="space-y-2 mb-8">
                  {s.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="text-accent mt-0.5">&#10003;</span>
                      <span className="text-text-muted">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-3">
                  <Link href={`/services/${s.id}`} className="px-6 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition-colors text-sm">
                    詳しく見る
                  </Link>
                  <Link href="/contact" className="px-6 py-3 border border-gray-200 text-text-muted rounded-xl font-semibold hover:border-accent hover:text-accent transition-colors text-sm">
                    相談する
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-accent to-indigo-600">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">どのサービスが最適かわからない？</h2>
          <p className="text-lg text-white/80 mb-8">無料相談で御社に最適なプランをご提案します。</p>
          <Link href="/contact" className="inline-flex bg-white text-accent px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
            無料相談を予約する
          </Link>
        </div>
      </section>
    </>
  )
}
