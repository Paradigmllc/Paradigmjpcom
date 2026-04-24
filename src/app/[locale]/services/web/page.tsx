import type { Metadata } from "next"
import Link from "next/link"
import PageHero from "@/components/PageHero"
import { SERVICES, PRICING } from "@/lib/data"

export const metadata: Metadata = {
  title: "Web制作",
  description: "Next.js/WordPressによる高速・SEO最適化されたWebサイト制作。デザインからコーディング、公開後の運用まで一貫してサポートします。",
}

export default function WebServicePage() {
  const service = SERVICES.find(s => s.id === "web")!
  const pricing = PRICING.web

  return (
    <>
      <PageHero badge="Web制作" title={service.title} desc={service.tagline} icon={service.icon} accent="indigo" />

      {/* Description */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-text-muted leading-relaxed mb-12 text-center">{service.desc}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {service.features.map(f => (
              <div key={f} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-accent text-lg">&#10003;</span>
                <span className="text-sm font-medium text-primary">{f}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-accent font-bold text-lg">{service.results}</p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">料金プラン</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricing.plans.map(p => (
              <div key={p.name} className={`rounded-2xl p-8 border ${p.popular ? "border-accent bg-white shadow-xl shadow-accent/10 ring-2 ring-accent" : "border-gray-200 bg-white"}`}>
                {p.popular && <p className="text-accent text-xs font-bold uppercase tracking-wider mb-2">人気No.1</p>}
                <h3 className="text-xl font-bold text-primary">{p.name}</h3>
                <p className="text-sm text-text-muted mt-1 mb-4">{p.desc}</p>
                <p className="text-3xl font-bold text-primary mb-1">&yen;{p.price}<span className="text-base font-normal text-text-muted">{p.period}</span></p>
                <ul className="mt-6 space-y-2">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                      <span className="text-accent mt-0.5">&#10003;</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href="/contact" className={`block mt-8 text-center py-3 rounded-xl font-semibold text-sm transition-colors ${p.popular ? "bg-accent text-white hover:bg-accent/90" : "bg-gray-100 text-primary hover:bg-gray-200"}`}>
                  相談する
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-text-muted">{pricing.monthly}</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-accent to-indigo-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Web制作のご相談はこちら</h2>
        <p className="text-white/80 mb-8">初回30分の無料オンライン相談を受け付けています。</p>
        <Link href="/contact" className="inline-flex bg-white text-accent px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
          無料相談を予約する
        </Link>
      </section>
    </>
  )
}
