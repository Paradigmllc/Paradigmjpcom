/**
 * /[locale]/works — 制作実績一覧 (PayloadCMS Works collection 連動)
 *
 * 役割:   制作実績一覧 (PayloadCMS Works collection 連動)
 * 入力:   params.locale
 * 出力:   PageHero + before/after grid + RichCtaBand
 *
 * AE-PHP-4 準拠 (各 page.tsx に役割/入力/出力 を明示)。
 */
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import { pageAlternates } from "@/lib/page-metadata"
import { buildPageSchema } from "@/lib/seo/schemas"
import { Link } from "@/i18n/routing"
import PageHero from "@/components/PageHero"
import RichCtaBand from "@/components/aesop/RichCtaBand"
import FadeIn from "@/components/aesop/FadeIn"
import { filterByLocale, assertLocale, localeFindOptions } from "@/lib/cms/filters"
import { withPayloadReadFallback } from "@/lib/payload-availability"
import { WORKS_EN } from "@/lib/data"
import JapanEntryVisualProof from "@/components/japan-entry/JapanEntryVisualProof"
import Image from "next/image"
import {
  JAPANESE_WORK_PUBLICATION_TAG,
} from "@/lib/public-content-safety"

export const revalidate = 300

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "worksPage" })
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: pageAlternates(locale, "/works"),
  }
}

type WorkDoc = {
  id: string | number
  title?: string
  industry?: string
  description?: string
  metrics?: string
  tags?: Array<{ tag?: string }>
}

const JAPANESE_GENERAL_WORKS: WorkDoc[] = [
  { id: "ja-web", title: "企業サイトの再設計", industry: "Web制作", description: "事業内容と問い合わせ導線を整理し、更新しやすいCMSとレスポンシブUIへ再構成します。", metrics: "要件・計測・引き継ぎを記録", tags: [{ tag: "Web制作" }, { tag: "CMS" }] },
  { id: "ja-local", title: "地域ビジネスの発見導線", industry: "MEO", description: "Googleビジネスプロフィール、店舗情報、投稿方針、口コミ対応の運用基準を整えます。", metrics: "公開情報と運用手順を整理", tags: [{ tag: "MEO" }, { tag: "運用" }] },
  { id: "ja-ai", title: "AI活用の業務設計", industry: "AI導入", description: "対象業務、人の確認工程、ログ、評価指標を先に定義し、無理なく運用できる自動化を実装します。", metrics: "確認境界と評価方法を明示", tags: [{ tag: "AI" }, { tag: "業務改善" }] },
]

type ProcessStep = { step: string; title: string; desc: string }
type EvidenceCheck = { title: string; desc: string }
type CaseNote = { title: string; label: string; whatWeShow: string; acceptance: string; notClaimed: string }

const TILE_GRADIENTS = [
  "from-zinc-950 via-zinc-800 to-blue-700",
  "from-zinc-900 via-blue-800 to-emerald-700",
  "from-zinc-900 via-emerald-800 to-blue-700",
  "from-zinc-950 via-blue-800 to-amber-600",
]

const TILE_VISUALS = [
  "/japan-entry/package-scope.svg",
  "/japan-entry/signal-check.svg",
  "/japan-entry/application-handover.svg",
] as const

export default async function WorksPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = assertLocale(rawLocale)            // 実 locale（UI + CMS 12-locale 配信）
  const t = await getTranslations({ locale, namespace: "worksPage" })
  const STEPS = t.raw("process") as ProcessStep[]
  const japanEntryLocale = locale !== "ja"
  const evidenceChecks = japanEntryLocale ? (t.raw("evidenceChecks") as EvidenceCheck[]) : []
  const caseNotes = japanEntryLocale ? (t.raw("caseNotes") as CaseNote[]) : []

  let works = japanEntryLocale
    ? (t.raw("proofItems") as Array<Omit<WorkDoc, "id" | "tags"> & { tags: string[] }>).map((work, index) => ({
        ...work,
        id: `verified-proof-${index}`,
        tags: work.tags.map((tag) => ({ tag })),
      }))
    : locale === "ja"
      ? JAPANESE_GENERAL_WORKS
      : await withPayloadReadFallback<WorkDoc[]>("works.payload.find", async () => {
      const [{ getPayload }, { default: config }] = await Promise.all([
        import("payload"),
        import("@payload-config"),
      ])
      const payload = await getPayload({ config })
      const res = await payload.find({
        collection: "works",
        where: filterByLocale(locale, { isPublished: { equals: true } }),
        sort: "sortOrder",
        limit: 100,
        depth: 1,
        ...localeFindOptions(locale),
      })
      const docs = (res.docs as unknown as WorkDoc[]) ?? []
      return docs
        }, [])
  if (works.length === 0 && locale !== "ja" && locale !== "en") {
    works = WORKS_EN.map((work, index) => ({
      id: `fallback-${index}`,
      title: work.title,
      industry: work.industry,
      description: work.desc,
      metrics: work.metrics,
      tags: work.tags.map((tag) => ({ tag })),
    }))
  }

  return (
    <>
      <PageHero
        badge={t("heroBadge")}
        title={t("heroTitle")}
        highlight={t("heroHighlight")}
        desc={t("heroDesc")}
      />

      <section className="relative bg-paradigm-paper paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-30" />
        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
          {works.length === 0 ? (
            <FadeIn className="text-center max-w-xl mx-auto paradigm-glass rounded-lg p-8 paradigm-glow-md">
              <p className="text-[14px] text-paradigm-ink-soft leading-[1.85] mb-7">
                {t("emptyMessage")}
              </p>
              <Link
                href={japanEntryLocale ? "/contact?intent=japan-entry" : "/contact"}
                {...(japanEntryLocale ? { "data-umami-event": "japan-entry-apply", "data-umami-event-source": "works-empty" } : {})}
                className="inline-flex items-center gap-2 bg-paradigm-ink text-paradigm-paper px-7 py-3.5 rounded-lg text-[12px] tracking-[0.14em] uppercase font-semibold hover:bg-paradigm-accent transition-colors"
              >
                {t("emptyCta")}
              </Link>
            </FadeIn>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {works.map((w, i) => {
                const tags = (w.tags ?? [])
                  .map((t) => t.tag)
                  .filter((tag): tag is string => typeof tag === "string" && tag !== JAPANESE_WORK_PUBLICATION_TAG)
                const gradient = TILE_GRADIENTS[i % TILE_GRADIENTS.length]
                return (
                  <FadeIn key={String(w.id)} delay={i * 0.05}>
                    <article className="group paradigm-glass rounded-lg overflow-hidden paradigm-glow-sm hover:paradigm-glow-lg  transition-all duration-500 h-full flex flex-col">
                      <div className={`relative aspect-[4/3] bg-gradient-to-br ${gradient} p-5 md:p-6 flex flex-col justify-between text-paradigm-paper`}>
                        <div className="absolute inset-0 paradigm-mesh opacity-30" />
                        {japanEntryLocale && (
                          <Image
                            src={TILE_VISUALS[i % TILE_VISUALS.length]}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                            className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-screen transition duration-500 group-hover:scale-105 group-hover:opacity-45"
                            aria-hidden
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <p className="relative z-10 paradigm-eyebrow text-paradigm-paper/85">{w.industry ?? "—"}</p>
                        <div className="relative z-10">
                          <h3 className="font-display text-[18px] md:text-[22px] leading-[1.15] mb-2 paradigm-glow-text">{w.title ?? ""}</h3>
                          {w.metrics && (
                            <p className="paradigm-eyebrow paradigm-glass rounded-full inline-block px-2.5 py-1 text-paradigm-paper text-[10px]">
                              {w.metrics}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="p-5 md:p-6 flex-1 flex flex-col">
                        {w.description && (
                          <p className="text-[13px] text-paradigm-ink-soft leading-[1.7] line-clamp-3 mb-4 flex-1">
                            {w.description}
                          </p>
                        )}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-auto">
                            {tags.slice(0, 4).map((t) => (
                              <span key={t} className="paradigm-eyebrow text-paradigm-ink-mute text-[10px]">#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  </FadeIn>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {japanEntryLocale && <JapanEntryVisualProof locale={locale as "en" | "ja"} />}

      {caseNotes.length > 0 && (
        <section className="relative overflow-hidden bg-paradigm-paper-deep paradigm-section" aria-labelledby="case-notes-heading">
          <div className="paradigm-mesh opacity-20" />
          <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-8">
            <FadeIn className="mb-8 max-w-3xl">
              <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{locale === "ja" ? "公開提供資料" : "Public delivery dossiers"}</p>
              <h2 id="case-notes-heading" className="font-display text-[24px] leading-[1.15] text-paradigm-ink md:text-[38px]">
                {locale === "ja" ? "過去事例を捏造せず、確認できる完成形を見せる。" : "Show the finished system without inventing a case study."}
              </h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-paradigm-ink-soft">
                {locale === "ja" ? "顧客名・一次データを公開できる許諾がない案件は、実装、検収、運用境界、未確認事項を資料として公開します。" : "When client names or first-party outcomes are not authorized for publication, we show the implementation, acceptance checks, operating boundary, and unknowns instead."}
              </p>
            </FadeIn>
            <div className="grid gap-4 lg:grid-cols-3">
              {caseNotes.map((note, index) => (
                <FadeIn key={note.title} delay={index * 0.06}>
                  <article className="h-full rounded-2xl border border-paradigm-line bg-paradigm-paper p-6 paradigm-glow-sm">
                    <p className="paradigm-eyebrow text-[10px] text-paradigm-accent">{note.label}</p>
                    <h3 className="mt-3 font-display text-[19px] leading-[1.2] text-paradigm-ink">{note.title}</h3>
                    <dl className="mt-5 space-y-4 text-[12px] leading-[1.75] text-paradigm-ink-soft">
                      <div><dt className="font-semibold text-paradigm-ink">{locale === "ja" ? "確認できること" : "What you can inspect"}</dt><dd className="mt-1">{note.whatWeShow}</dd></div>
                      <div><dt className="font-semibold text-paradigm-ink">{locale === "ja" ? "検収の見方" : "Acceptance check"}</dt><dd className="mt-1">{note.acceptance}</dd></div>
                      <div><dt className="font-semibold text-paradigm-ink">{locale === "ja" ? "主張しないこと" : "What is not claimed"}</dt><dd className="mt-1">{note.notClaimed}</dd></div>
                    </dl>
                  </article>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Process */}
      <section className="relative bg-paradigm-paper-deep paradigm-section overflow-hidden">
        <div className="paradigm-mesh opacity-40" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-8">
          <FadeIn className="mb-8 max-w-2xl">
            <p className="paradigm-eyebrow text-paradigm-accent mb-3">{t("processEyebrow")}</p>
            <h2 className="font-display text-[24px] md:text-[36px] leading-[1.15]  text-paradigm-ink">
              <span className="bg-gradient-to-br from-paradigm-ink via-paradigm-ink to-paradigm-accent bg-clip-text text-transparent">
                {t("processTitle")}
              </span>
            </h2>
          </FadeIn>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <FadeIn key={s.step} delay={i * 0.08} as="li" className="paradigm-glass rounded-lg p-5 grid grid-cols-1 md:grid-cols-[60px_1fr] gap-3 paradigm-glow-sm hover:paradigm-glow-md transition-all duration-500">
                  <span className="font-display text-[24px] md:text-[28px] leading-none bg-gradient-to-br from-paradigm-accent to-paradigm-ink bg-clip-text text-transparent">{s.step}</span>
                  <div>
                    <h3 className="font-display text-[16px] md:text-[18px] leading-[1.2] text-paradigm-ink mb-1 ">{s.title}</h3>
                    <p className="text-[12px] md:text-[13px] text-paradigm-ink-soft leading-[1.7]">{s.desc}</p>
                  </div>
              </FadeIn>
            ))}
          </ol>
        </div>
      </section>

      {japanEntryLocale && evidenceChecks.length > 0 && (
        <section className="relative overflow-hidden bg-paradigm-paper paradigm-section" aria-labelledby="evidence-policy-heading">
          <div className="paradigm-mesh opacity-20" />
          <div className="relative z-10 mx-auto max-w-5xl px-6 md:px-8">
            <FadeIn className="mb-8 max-w-3xl">
              <p className="paradigm-eyebrow mb-3 text-paradigm-accent">{t("evidenceEyebrow")}</p>
              <h2 id="evidence-policy-heading" className="font-display text-[24px] leading-[1.15] text-paradigm-ink md:text-[38px]">{t("evidenceTitle")}</h2>
              <p className="mt-4 text-[14px] leading-[1.8] text-paradigm-ink-soft">{t("evidenceDesc")}</p>
            </FadeIn>
            <div className="grid gap-4 md:grid-cols-2">
              {evidenceChecks.map((check, index) => (
                <FadeIn key={check.title} delay={index * 0.05}>
                  <article className="h-full rounded-lg border border-paradigm-line bg-paradigm-paper-deep p-6 paradigm-glow-sm">
                    <span className="font-display text-[22px] text-paradigm-accent">{String(index + 1).padStart(2, "0")}</span>
                    <h3 className="mt-3 font-display text-[18px] leading-[1.2] text-paradigm-ink">{check.title}</h3>
                    <p className="mt-3 text-[13px] leading-[1.8] text-paradigm-ink-soft">{check.desc}</p>
                  </article>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      <RichCtaBand
        eyebrow={t("ctaEyebrow")}
        title={t("ctaTitle")}
        highlight={t("ctaHighlight")}
        desc={t("ctaDesc")}
        buttonLabel={t("ctaButton")}
        buttonHref={japanEntryLocale ? "/contact?intent=japan-entry" : "/contact"}
        analyticsSource="works-final-cta"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildPageSchema({
              type: "CollectionPage",
              title: t("heroTitle"),
              description: t("heroDesc"),
              url: `https://paradigmjp.com/${locale}/works`,
              locale,
            })
          ),
        }}
      />
    </>
  )
}
