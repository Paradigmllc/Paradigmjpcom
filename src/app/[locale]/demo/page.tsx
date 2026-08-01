import Link from "next/link"

export const dynamic = "force-dynamic"

interface DemoIndexPageProps {
  params: Promise<{ locale: string }>
}

const industries = [
  {
    id: "restaurant",
    accent: "#c2410c",
    labelJa: "飲食店",
    labelEn: "Restaurant",
    descJa: "予約導線、メニュー、口コミを来店判断の順番で整理。",
    descEn: "Reservation flow, menus, and reviews arranged around visit intent.",
  },
  {
    id: "construction",
    accent: "#92400e",
    labelJa: "建設業",
    labelEn: "Construction",
    descJa: "施工実績、保証、見積相談まで信頼形成を一体化。",
    descEn: "Project proof, warranty clarity, and quote inquiry in one flow.",
  },
  {
    id: "dental",
    accent: "#0369a1",
    labelJa: "歯科医院",
    labelEn: "Dental Clinic",
    descJa: "初診予約、診療内容、院内の安心感を患者目線で設計。",
    descEn: "First-visit booking, treatments, and clinic trust cues for patients.",
  },
  {
    id: "beauty_salon",
    accent: "#be185d",
    labelJa: "美容サロン",
    labelEn: "Beauty Salon",
    descJa: "世界観、スタイルギャラリー、指名予約を自然につなぐ。",
    descEn: "Brand world, style gallery, and staff booking connected cleanly.",
  },
  {
    id: "retail",
    accent: "#047857",
    labelJa: "小売店",
    labelEn: "Retail",
    descJa: "商品選び、購入前の不安、再購入導線まで含めて構成。",
    descEn: "Product choice, purchase proof, and repeat flow in one structure.",
  },
  {
    id: "accounting",
    accent: "#0f766e",
    labelJa: "会計事務所",
    labelEn: "Accounting Office",
    descJa: "専門性、料金目安、相談前ヒアリングで商談品質を上げる。",
    descEn: "Expertise, fee clarity, and intake context for better consultations.",
  },
  {
    id: "cleaning",
    accent: "#1d4ed8",
    labelJa: "清掃業",
    labelEn: "Cleaning Service",
    descJa: "対応エリア、作業事例、緊急相談を迷わず見せる。",
    descEn: "Coverage, work proof, and urgent inquiry paths made obvious.",
  },
  {
    id: "consulting",
    accent: "#7c3aed",
    labelJa: "コンサルティング",
    labelEn: "Consulting",
    descJa: "支援範囲、実績、初回相談の論点を明確化。",
    descEn: "Scope, proof, and first-meeting context clarified upfront.",
  },
] as const

export default async function DemoIndexPage({ params }: DemoIndexPageProps) {
  const { locale } = await params
  const isJa = locale !== "en"

  return (
    <main className="min-h-dvh bg-[#f8fafc] text-slate-950">
      <header className="border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex min-h-16 max-w-[1180px] items-center justify-between gap-4 px-4">
          <Link href={`/${locale}/demo`} className="flex items-center gap-3 font-black tracking-tight" aria-label="Paradigm Demo">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-950 text-sm text-white">P</span>
            <span>Paradigm Demo</span>
          </Link>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700" href="/ja/demo">
              JA
            </Link>
            <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700" href="/en/demo">
              EN
            </Link>
            <a
              className="hidden rounded-md border border-slate-950 bg-white px-3 py-2 text-slate-950 sm:inline-flex"
              href="https://paradigmjp.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Paradigm
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1180px] px-4 py-14 sm:py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-black uppercase tracking-normal text-slate-500">
            {isJa ? "業種別フルサイトデモ" : "Industry Full-Site Demos"}
          </p>
          <h1 className="text-4xl font-black leading-tight tracking-normal text-slate-950 sm:text-5xl">
            {isJa ? "本番サイトとして回遊できる、業種別デモ。" : "Demo websites you can navigate like production sites."}
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
            {isJa
              ? "トップページだけの見本ではなく、サービス、料金、事例、FAQ、会社情報、お問い合わせ、法務ページまで揃えた改善後サイトです。"
              : "These are not single-page previews. Each demo includes services, pricing, cases, FAQ, about, contact, and legal pages."}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {industries.map((industry, index) => (
            <Link
              key={industry.id}
              href={`/demo/sample-${industry.id}`}
              className="group flex min-h-52 flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              style={{ borderTopColor: industry.accent, borderTopWidth: 4 }}
              aria-label={isJa ? `${industry.labelJa}デモを見る` : `View ${industry.labelEn} demo`}
            >
              <span className="text-xs font-black text-slate-400">{String(index + 1).padStart(2, "0")}</span>
              <span>
                <strong className="block text-xl font-black text-slate-950">
                  {isJa ? industry.labelJa : industry.labelEn}
                </strong>
                <span className="mt-3 block text-sm leading-6 text-slate-600">
                  {isJa ? industry.descJa : industry.descEn}
                </span>
              </span>
              <span className="text-sm font-black text-slate-950 group-hover:underline">
                {isJa ? "サイトを見る" : "View site"}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
