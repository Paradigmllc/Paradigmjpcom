"use client"

import { Link } from "@/i18n/routing"
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Globe2,
  LineChart,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

type LocaleVariant = "ja" | "en"

type HomeCopy = {
  badge: string
  h1: string
  lead: string
  primary: string
  secondary: string
  proof: string[]
  visualTitle: string
  visualSubtitle: string
  pipeline: Array<{ label: string; value: string; tone: string }>
  servicesTitle: string
  servicesLead: string
  services: Array<{ title: string; body: string; icon: "globe" | "search" | "chart" | "sparkles" }>
  systemTitle: string
  systemLead: string
  system: Array<{ title: string; body: string }>
  outcomesTitle: string
  outcomes: Array<{ value: string; label: string }>
  ctaTitle: string
  ctaBody: string
}

const COPY: Record<LocaleVariant, HomeCopy> = {
  ja: {
    badge: "Revenue OS for service businesses",
    h1: "問い合わせが増えるだけでなく、受注まで進むWeb基盤をつくる。",
    lead: "Paradigmは、Web制作・SEO/GEO・MEO・AI導入をばらばらに提供しません。診断、改善、営業導線、CRM連携までをひとつの収益システムとして設計します。",
    primary: "Japan Entry 適合審査 — $13K",
    secondary: "サービスを見る",
    proof: ["診断から改善提案まで一気通貫", "中小企業・店舗向けの実装設計", "Revenue OSで商談化を可視化"],
    visualTitle: "Revenue OS",
    visualSubtitle: "リード獲得から提案・追客までを一画面で管理",
    pipeline: [
      { label: "診断済み", value: "128", tone: "bg-blue-50 text-blue-700 border-blue-100" },
      { label: "送信準備OK", value: "34", tone: "bg-emerald-50 text-emerald-700 border-emerald-100" },
      { label: "要確認", value: "9", tone: "bg-amber-50 text-amber-700 border-amber-100" },
    ],
    servicesTitle: "必要なのは、きれいなサイトではなく売上に接続する仕組みです。",
    servicesLead: "見た目、検索、地域集客、AI活用を分断せず、問い合わせ後の営業活動まで含めて設計します。",
    services: [
      { title: "Web制作", body: "高速表示、CV導線、CMS、分析設計まで含めた事業サイトを構築します。", icon: "globe" },
      { title: "SEO / GEO", body: "Google検索とAI検索の両方で見つかる情報設計・記事・構造化データを整えます。", icon: "search" },
      { title: "MEO / 店舗集客", body: "Googleビジネスプロフィール、口コミ、地域ページを運用し来店につなげます。", icon: "chart" },
      { title: "AI導入", body: "問い合わせ対応、営業資料、レポート作成など反復業務を安全に自動化します。", icon: "sparkles" },
    ],
    systemTitle: "制作して終わりにしないための運用設計。",
    systemLead: "公開後に何が起きているかを可視化し、改善と営業アクションを継続できる状態を作ります。",
    system: [
      { title: "診断", body: "速度、SEO、導線、フォーム、競合、地域検索の弱点を洗い出します。" },
      { title: "改善", body: "優先度順にページ・コピー・構造化データ・CV導線を改修します。" },
      { title: "商談化", body: "レポート、提案資料、フォーム営業、CRM連携で次の接点を作ります。" },
    ],
    outcomesTitle: "判断しやすい成果指標に絞って運用します。",
    outcomes: [
      { value: "CVR", label: "問い合わせ率" },
      { value: "SEO/GEO", label: "検索・AI検索露出" },
      { value: "MEO", label: "地域検索と来店導線" },
      { value: "CRM", label: "商談化と追客状況" },
    ],
    ctaTitle: "日本市場への展開を、実行できる計画に変えます。",
    ctaBody: "セットアップ費用は13,000ドル固定。月額運用は最初の6か月無料です。意思決定者と必要条件が揃う企業だけを審査します。",
  },
  en: {
    badge: "Revenue OS for Japan growth",
    h1: "Build a web presence that turns interest into qualified sales conversations.",
    lead: "Paradigm connects web, SEO/GEO, local search, and AI operations into one revenue system: audit, improve, route leads, and keep follow-up visible.",
    primary: "Apply for a Japan Partnership — $13K",
    secondary: "View services",
    proof: ["Audit-to-action workflow", "Built for SMB and local-service growth", "Pipeline visibility through Revenue OS"],
    visualTitle: "Revenue OS",
    visualSubtitle: "Lead acquisition, proposals, and follow-up in one operating view",
    pipeline: [
      { label: "Audited", value: "128", tone: "bg-blue-50 text-blue-700 border-blue-100" },
      { label: "Ready", value: "34", tone: "bg-emerald-50 text-emerald-700 border-emerald-100" },
      { label: "Review", value: "9", tone: "bg-amber-50 text-amber-700 border-amber-100" },
    ],
    servicesTitle: "You do not need another pretty site. You need a system connected to revenue.",
    servicesLead: "We design the public site, search footprint, local discovery, and sales follow-up as one operating model.",
    services: [
      { title: "Web development", body: "Fast business websites with conversion flows, CMS, analytics, and maintainable implementation.", icon: "globe" },
      { title: "SEO / GEO", body: "Content architecture and structured data for Google search and AI-answer visibility.", icon: "search" },
      { title: "Local search", body: "Google Business Profile, reviews, and local landing pages that support real visits.", icon: "chart" },
      { title: "AI operations", body: "Safe automation for inquiries, sales assets, reporting, and repetitive back-office work.", icon: "sparkles" },
    ],
    systemTitle: "Designed for the work after launch.",
    systemLead: "We make performance visible so the site can keep improving and the sales team knows what to do next.",
    system: [
      { title: "Audit", body: "Find weak points in speed, SEO, forms, conversion paths, competition, and local search." },
      { title: "Improve", body: "Fix pages, copy, structured data, and conversion routes in priority order." },
      { title: "Convert", body: "Create reports, proposals, outreach tasks, and CRM handoff for the next touch." },
    ],
    outcomesTitle: "We optimize the metrics that make decisions easier.",
    outcomes: [
      { value: "CVR", label: "Inquiry rate" },
      { value: "SEO/GEO", label: "Search visibility" },
      { value: "Local", label: "Map and visit paths" },
      { value: "CRM", label: "Pipeline follow-up" },
    ],
    ctaTitle: "Turn Japan entry into an execution-ready plan.",
    ctaBody: "Setup is fixed at $13,000. Selected launch partners receive $2,000/month × 6 months = $12,000 of managed-operation value included at no additional monthly fee. Apply only if an empowered decision-maker can move now.",
  },
}

const ICONS = {
  globe: Globe2,
  search: Search,
  chart: LineChart,
  sparkles: Sparkles,
} as const

export default function RevenueHomePage({ locale }: { locale: LocaleVariant }) {
  const copy = COPY[locale]

  return (
    <main className="bg-white text-zinc-950">
      <section className="border-b border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-28">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
              {copy.badge}
            </p>
            <h1 className="max-w-4xl text-[34px] font-semibold leading-[1.12] tracking-normal text-zinc-950 sm:text-5xl lg:text-[56px]">
              {copy.h1}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-600 sm:text-lg">
              {copy.lead}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                {copy.primary}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/services"
                className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-950"
              >
                {copy.secondary}
              </Link>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-zinc-600 sm:grid-cols-3">
              {copy.proof.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl shadow-zinc-200/70">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-950">{copy.visualTitle}</p>
                  <p className="mt-1 text-xs text-zinc-500">{copy.visualSubtitle}</p>
                </div>
                <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Live</div>
              </div>
              <div className="grid grid-cols-3 border-b border-zinc-200">
                {copy.pipeline.map((item) => (
                  <div key={item.label} className="border-r border-zinc-200 p-4 last:border-r-0">
                    <p className="text-xs text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-normal text-zinc-950">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3 p-5">
                {copy.pipeline.map((item, index) => (
                  <div key={`${item.label}-row`} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-semibold text-zinc-600">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{item.label}</p>
                      <p className="text-xs text-zinc-500">{locale === "ja" ? "次の営業アクションを表示" : "Next sales action visible"}</p>
                    </div>
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${item.tone}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-blue-700">Services</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-zinc-950 sm:text-4xl">
              {copy.servicesTitle}
            </h2>
            <p className="mt-4 text-base leading-8 text-zinc-600">{copy.servicesLead}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {copy.services.map((service) => {
              const Icon = ICONS[service.icon]
              return (
                <article key={service.title} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <Icon className="h-5 w-5 text-blue-700" aria-hidden />
                  <h3 className="mt-5 text-lg font-semibold tracking-normal text-zinc-950">{service.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-600">{service.body}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-200 bg-zinc-50 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Operating Model</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-zinc-950 sm:text-4xl">
              {copy.systemTitle}
            </h2>
            <p className="mt-4 text-base leading-8 text-zinc-600">{copy.systemLead}</p>
          </div>
          <div className="space-y-3">
            {copy.system.map((item, index) => (
              <div key={item.title} className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:grid-cols-[48px_1fr]">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-normal text-zinc-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-600">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-amber-700">Measurement</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-zinc-950 sm:text-4xl">
                {copy.outcomesTitle}
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {copy.outcomes.map((outcome) => (
                <div key={outcome.value} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <BarChart3 className="h-4 w-4 text-zinc-500" aria-hidden />
                  <p className="mt-4 text-xl font-semibold tracking-normal text-zinc-950">{outcome.value}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{outcome.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 rounded-lg bg-zinc-950 p-6 text-white sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <ClipboardList className="h-6 w-6 text-emerald-400" aria-hidden />
                <h2 className="mt-5 text-2xl font-semibold leading-tight tracking-normal sm:text-3xl">{copy.ctaTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300">{copy.ctaBody}</p>
              </div>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-100"
              >
                {copy.primary}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
