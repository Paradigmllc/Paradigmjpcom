import type { Metadata } from "next"
import Link from "next/link"
import PageHero from "@/components/PageHero"

export const metadata: Metadata = {
  title: "会社概要",
  description: "Paradigm合同会社の会社概要。デジタル技術で中小企業の成長を支援するパートナーです。",
}

export default function AboutPage() {
  return (
    <>
      <PageHero badge="About" title="会社概要" desc="テクノロジーで、ビジネスの常識を変える。" />

      {/* Mission */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-2">Mission</p>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">デジタルで、事業を加速する。</h2>
            <p className="text-text-muted leading-relaxed max-w-2xl mx-auto">
              私たちParadigm合同会社は、Web制作・MEO対策・SEO/GEO対策・AI導入支援を通じて、
              中小企業のデジタルトランスフォーメーションを包括的にサポートします。<br /><br />
              最新のAI技術とデジタルマーケティングの知見を組み合わせ、
              お客様のビジネスが持続的に成長できる基盤を構築します。
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="relative py-20 px-6 bg-gray-50 section-dots overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-accent text-sm font-semibold tracking-widest uppercase mb-2">Values</p>
            <h2 className="text-3xl font-bold text-primary">大切にしている価値観</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: "🚀", title: "成果にコミットする", desc: "「納品して終わり」ではなく、数字で成果が出るまで伴走します。KPIを共有し、データに基づく改善を継続します。" },
              { icon: "🤝", title: "ワンストップで安心", desc: "Web制作・集客・AIを一貫して提供。複数業者への発注コストと管理の手間をなくします。" },
              { icon: "💡", title: "最新技術を、わかりやすく", desc: "AI・GEO等の最先端技術も、お客様にわかりやすくお伝えし、無理のない形で導入を支援します。" },
            ].map(v => (
              <div key={v.title} className="text-center p-8">
                <span className="text-5xl block mb-4">{v.icon}</span>
                <h3 className="text-lg font-bold text-primary mb-3">{v.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-primary text-center mb-12">基本情報</h2>
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <tbody>
                {[
                  ["会社名", "Paradigm合同会社（パラダイム）"],
                  ["設立", "2025年"],
                  ["代表", "代表社員"],
                  ["所在地", "日本"],
                  ["事業内容", "Web制作 / MEO対策 / SEO・GEO対策 / AI導入支援"],
                  ["メール", "contact@paradigmjp.com"],
                  ["Webサイト", "https://paradigmjp.com"],
                ].map(([label, value], i) => (
                  <tr key={label} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-primary w-1/3">{label}</th>
                    <td className="py-4 px-6 text-sm text-text-muted">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-accent to-indigo-600 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">一緒にデジタルを活用しませんか？</h2>
        <p className="text-white/80 mb-8">御社のデジタル課題、お気軽にご相談ください。</p>
        <Link href="/contact" className="inline-flex bg-white text-accent px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg">
          無料相談を予約する
        </Link>
      </section>
    </>
  )
}
