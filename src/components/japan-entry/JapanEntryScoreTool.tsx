"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"
import { ArrowRight, CheckCircle2, ExternalLink, Info, Loader2, ShieldCheck } from "lucide-react"
import { Link } from "@/i18n/routing"
import {
  JAPAN_ENTRY_TARGET_COUNTRIES,
  type JapanEntryScoreResult,
  type JapanEntryTargetCountry,
  type ReadinessAnswer,
} from "@/lib/sales/japan-entry-score"

type LocaleVariant = "en" | "ja"
type ToolStatus = "idle" | "loading" | "success" | "error"

type FormState = {
  domain: string
  targetCountry: JapanEntryTargetCountry
  japaneseLanguage: ReadinessAnswer
  japanPayments: ReadinessAnswer
  japanFulfillment: ReadinessAnswer
  japanSupport: ReadinessAnswer
  decisionReady: ReadinessAnswer
}

type Props = { locale: LocaleVariant }

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""

const COPY: Record<LocaleVariant, {
  eyebrow: string
  title: string
  lead: string
  formTitle: string
  domainLabel: string
  domainPlaceholder: string
  marketLabel: string
  questions: Array<{ key: keyof Omit<FormState, "domain" | "targetCountry">; label: string }>
  answers: Record<ReadinessAnswer, string>
  submit: string
  submitting: string
  privacy: string
  resultEyebrow: string
  scoreLabel: string
  coverage: string
  observed: string
  unknowns: string
  actions: string
  evidence: string
  actualUnknown: string
  apply: string
  retry: string
  bands: Record<NonNullable<JapanEntryScoreResult["band"]>, string>
  errors: { generic: string; unavailable: string }
}> = {
  en: {
    eyebrow: "Free public-signal utility",
    title: "See how ready your business looks for Japan.",
    lead: "Enter your website and a few operating facts. We combine public market signals with your answers to show where a Japan entry path is visible—and what still needs proof.",
    formTitle: "Run your Japan Entry Signal Check",
    domainLabel: "Company website",
    domainPlaceholder: "https://example.com",
    marketLabel: "Primary market today",
    questions: [
      { key: "japaneseLanguage", label: "Do you already have Japanese-language buyer content?" },
      { key: "japanPayments", label: "Can customers use a Japan-suitable payment route?" },
      { key: "japanFulfillment", label: "Can you explain Japan shipping, delivery, or service fulfilment?" },
      { key: "japanSupport", label: "Can a Japanese buyer reach support or sales?" },
      { key: "decisionReady", label: "Can one empowered decision-maker move this month?" },
    ],
    answers: { yes: "Yes", no: "Not yet", unknown: "Not sure" },
    submit: "Calculate my Japan Entry Signal",
    submitting: "Checking public signals…",
    privacy: "No account required. We store a short-lived, hashed run record for service reliability; private traffic and revenue are never inferred.",
    resultEyebrow: "Your signal check",
    scoreLabel: "Japan Entry Signal Score",
    coverage: "Evidence coverage",
    observed: "What we observed",
    unknowns: "What remains unknown",
    actions: "Highest-leverage next steps",
    evidence: "Evidence sources",
    actualUnknown: "Actual monthly visits and revenue are not publicly observable.",
    apply: "Apply for a 21-day Japan Entry plan — $12K",
    retry: "Run another check",
    bands: {
      "no-data": "No usable signals yet",
      "limited-evidence": "Limited evidence",
      "signals-not-visible": "Signals not yet visible",
      foundation: "Foundational signals",
      promising: "Promising signals",
      "strong-signals": "Strong signals — execution still required",
    },
    errors: { generic: "The check could not be completed. Please try again.", unavailable: "The scoring service is temporarily unavailable." },
  },
  ja: {
    eyebrow: "無料の公開シグナル診断",
    title: "日本進出に向けて、現在どこまで準備が見えているかを確認します。",
    lead: "Webサイトといくつかの運用情報を入力してください。公開市場シグナルと回答内容を組み合わせ、日本向け導線の強みと未確認項目を可視化します。",
    formTitle: "Japan Entry Signal Checkを実行",
    domainLabel: "会社のWebサイト",
    domainPlaceholder: "https://example.com",
    marketLabel: "現在の主な市場",
    questions: [
      { key: "japaneseLanguage", label: "日本語の購入者向けコンテンツがありますか？" },
      { key: "japanPayments", label: "日本向けに利用できる決済手段がありますか？" },
      { key: "japanFulfillment", label: "日本への配送・提供方法を説明できますか？" },
      { key: "japanSupport", label: "日本語購入者が問い合わせできる窓口がありますか？" },
      { key: "decisionReady", label: "今月中に決裁できる責任者がいますか？" },
    ],
    answers: { yes: "はい", no: "まだ", unknown: "不明" },
    submit: "日本進出シグナルを計算する",
    submitting: "公開シグナルを確認中…",
    privacy: "アカウント登録は不要です。運用安定性のため短期保存のハッシュ化した実行記録のみ保存し、非公開のアクセス数・売上は推定しません。",
    resultEyebrow: "診断結果",
    scoreLabel: "Japan Entry Signal Score",
    coverage: "根拠充足率",
    observed: "確認できたこと",
    unknowns: "まだ分からないこと",
    actions: "優先すべき次の一手",
    evidence: "根拠ソース",
    actualUnknown: "実際の月間訪問数・売上は公開情報から確認できません。",
    apply: "14営業日のJapan Entry計画に申込む — $12K",
    retry: "もう一度診断する",
    bands: {
      "no-data": "有効なシグナルなし",
      "limited-evidence": "根拠が限定的",
      "signals-not-visible": "準備シグナルが未確認",
      foundation: "基礎シグナルあり",
      promising: "有望なシグナル",
      "strong-signals": "強いシグナル（実行確認は必要）",
    },
    errors: { generic: "診断を完了できませんでした。もう一度お試しください。", unavailable: "診断サービスが一時的に利用できません。" },
  },
}

const COUNTRY_LABELS: Record<JapanEntryTargetCountry, string> = {
  US: "United States",
  GB: "United Kingdom",
  AU: "Australia",
  CA: "Canada",
  NZ: "New Zealand",
  DE: "Germany",
  FR: "France",
}

const INITIAL_FORM: FormState = {
  domain: "",
  targetCountry: "US",
  japaneseLanguage: "unknown",
  japanPayments: "unknown",
  japanFulfillment: "unknown",
  japanSupport: "unknown",
  decisionReady: "unknown",
}

function bandTone(band: JapanEntryScoreResult["band"]): string {
  if (band === "strong-signals" || band === "promising") return "text-emerald-700 bg-emerald-50 border-emerald-200"
  if (band === "foundation") return "text-blue-700 bg-blue-50 border-blue-200"
  if (band === "limited-evidence") return "text-amber-700 bg-amber-50 border-amber-200"
  return "text-zinc-600 bg-zinc-50 border-zinc-200"
}

function fieldLabel(locale: LocaleVariant, answer: ReadinessAnswer): string {
  return COPY[locale].answers[answer]
}

export default function JapanEntryScoreTool({ locale }: Props) {
  const copy = COPY[locale]
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [status, setStatus] = useState<ToolStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<JapanEntryScoreResult | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetRef = useRef<string | null>(null)

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current || turnstileWidgetRef.current || !window.turnstile) return
    try {
      turnstileWidgetRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(null),
        "error-callback": () => {
          console.error("[JapanEntryScoreTool] Turnstile render failed")
          setTurnstileToken(null)
        },
        theme: "light",
      })
    } catch (renderError) {
      console.error("[JapanEntryScoreTool] Turnstile setup failed:", renderError)
      setTurnstileToken(null)
    }
  }, [])

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("loading")
    setError(null)
    try {
      const response = await fetch("/api/tools/japan-entry-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: form.domain,
          targetCountry: form.targetCountry,
          selfReported: {
            japaneseLanguage: form.japaneseLanguage,
            japanPayments: form.japanPayments,
            japanFulfillment: form.japanFulfillment,
            japanSupport: form.japanSupport,
            decisionReady: form.decisionReady,
          },
          honeypot: "",
          turnstileToken,
        }),
      })
      const body = await response.json() as { ok?: boolean; result?: JapanEntryScoreResult; error?: string }
      if (!response.ok || !body.ok || !body.result) {
        throw new Error(body.error || (response.status >= 500 ? copy.errors.unavailable : copy.errors.generic))
      }
      setResult(body.result)
      setStatus("success")
      window.setTimeout(() => document.getElementById("japan-entry-score-result")?.focus(), 50)
    } catch (submitError) {
      console.error("[JapanEntryScoreTool] submit failed:", submitError)
      setError(submitError instanceof Error ? submitError.message : copy.errors.generic)
      setStatus("error")
    }
  }

  const showResult = status === "success" && result !== null
  return (
    <div className="bg-white text-zinc-950">
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={() => {
            if (turnstileRef.current && window.turnstile && !turnstileWidgetRef.current) {
              window.turnstile.render(turnstileRef.current, {
                sitekey: TURNSTILE_SITE_KEY,
                callback: (token: string) => setTurnstileToken(token),
                "expired-callback": () => setTurnstileToken(null),
                "error-callback": () => {
                  console.error("[JapanEntryScoreTool] Turnstile load failed")
                  setTurnstileToken(null)
                },
                theme: "light",
              })
            }
          }}
          onError={(scriptError) => console.error("[JapanEntryScoreTool] Turnstile script failed:", scriptError)}
        />
      )}
      <section className="border-b border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {copy.eyebrow}
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">{copy.title}</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-600 sm:text-lg">{copy.lead}</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-xl sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">{copy.formTitle}</p>
            <p className="mt-4 text-sm leading-7 text-zinc-300">{locale === "ja" ? "公開情報と回答内容を分けて表示します。" : "Public evidence and your answers stay visibly separate."}</p>
            <div className="mt-8 flex items-start gap-3 text-sm text-zinc-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
              <span>{copy.privacy}</span>
            </div>
          </div>

          <form onSubmit={submit} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-zinc-900">{copy.domainLabel}</span>
                <input
                  required
                  type="url"
                  value={form.domain}
                  onChange={(event) => updateField("domain", event.target.value)}
                  placeholder={copy.domainPlaceholder}
                  className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  aria-label={copy.domainLabel}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-zinc-900">{copy.marketLabel}</span>
                <select
                  value={form.targetCountry}
                  onChange={(event) => updateField("targetCountry", event.target.value as JapanEntryTargetCountry)}
                  className="h-12 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  aria-label={copy.marketLabel}
                >
                  {JAPAN_ENTRY_TARGET_COUNTRIES.map((country) => <option key={country} value={country}>{COUNTRY_LABELS[country]}</option>)}
                </select>
              </label>
              {copy.questions.map((question) => (
                <label key={question.key} className="sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-zinc-900">{question.label}</span>
                  <select
                    value={form[question.key]}
                    onChange={(event) => updateField(question.key, event.target.value as ReadinessAnswer)}
                    className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    aria-label={question.label}
                  >
                    {(["yes", "no", "unknown"] as ReadinessAnswer[]).map((answer) => <option key={answer} value={answer}>{fieldLabel(locale, answer)}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-px w-px opacity-0" name="website" />
            {TURNSTILE_SITE_KEY && <div ref={turnstileRef} className="mt-6 min-h-[65px]" aria-label="Bot verification" />}
            {error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={status === "loading" || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden />{copy.submitting}</> : <>{copy.submit}<ArrowRight className="h-4 w-4" aria-hidden /></>}
            </button>
          </form>
        </div>
      </section>

      {showResult && result && (
        <section id="japan-entry-score-result" tabIndex={-1} className="border-t border-zinc-200 bg-zinc-50 px-5 py-16 outline-none sm:px-8 sm:py-20 lg:px-12">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{copy.resultEyebrow}</p>
            <div className="mt-6 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold text-zinc-500">{copy.scoreLabel}</p>
                <div className="mt-6 flex items-center gap-6">
                  <div
                    className="grid h-36 w-36 shrink-0 place-items-center rounded-full"
                    style={{ background: `conic-gradient(rgb(37 99 235) ${(result.score ?? 0) * 1}%, rgb(228 231 235) 0)` }}
                    aria-label={`${copy.scoreLabel}: ${result.score ?? "not measured"}`}
                  >
                    <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                      <span className="text-4xl font-semibold text-zinc-950">{result.score ?? "—"}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">/ 100</span>
                    </div>
                  </div>
                  <div>
                    <p className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${bandTone(result.band)}`}>{copy.bands[result.band]}</p>
                    <p className="mt-4 text-sm leading-6 text-zinc-600">{copy.coverage}: <strong className="text-zinc-950">{result.coverage}%</strong></p>
                    <p className="mt-2 text-xs leading-5 text-zinc-500">{copy.actualUnknown}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold text-zinc-500">{copy.observed}</p>
                <div className="mt-5 space-y-5">
                  {result.factors.map((factor) => (
                    <div key={factor.id}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="font-semibold text-zinc-900">{factor.label}</span>
                        <span className="font-semibold text-zinc-600">{factor.score === null ? "Not measured" : `${factor.score}/100`}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={factor.score ?? 0} aria-label={factor.label}>
                        <div className={`h-full rounded-full ${factor.source === "self-reported" ? "bg-emerald-500" : "bg-blue-600"}`} style={{ width: `${factor.score ?? 0}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{factor.detail} · {factor.source === "self-reported" ? "self-reported" : "public evidence"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <p className="text-sm font-semibold text-zinc-900">{copy.actions}</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
                  {result.recommendedActions.map((action) => <li key={action} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden /><span>{action}</span></li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <p className="text-sm font-semibold text-zinc-900">{copy.unknowns}</p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
                  {result.unknowns.slice(0, 5).map((unknown) => <li key={unknown} className="flex gap-2"><Info className="mt-1 h-4 w-4 shrink-0 text-amber-600" aria-hidden /><span>{unknown}</span></li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6">
                <p className="text-sm font-semibold text-zinc-900">{copy.evidence}</p>
                <div className="mt-4 space-y-3 text-sm">
                  {result.marketVisibility.evidence.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3 last:border-0 last:pb-0">
                      <div><p className="font-semibold text-zinc-800">{item.label}</p><p className="text-xs text-zinc-500">{item.value}</p></div>
                      {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-700" aria-label={`${item.label} source`}><ExternalLink className="h-4 w-4" aria-hidden /></a>}
                    </div>
                  ))}
                  {result.marketVisibility.evidence.length === 0 && <p className="text-sm text-zinc-500">Not observed yet.</p>}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col items-start justify-between gap-5 rounded-2xl bg-zinc-950 p-6 text-white sm:flex-row sm:items-center sm:p-8">
              <div><p className="text-lg font-semibold">{copy.apply}</p><p className="mt-2 text-sm text-zinc-300">{locale === "ja" ? "セットアップ12,000ドル固定。選定した契約先には最初の6か月の運用を追加月額なしで提供し、期間終了後の継続条件・月額は個別協議のうえ書面で合意します。" : "Fixed $12,000 setup. Selected launch partners receive six months of managed operation at no additional monthly charge; continuation pricing is agreed separately after the included period."}</p></div>
              <Link href={`/${locale}/contact?intent=japan-entry`} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300">{copy.apply}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </div>
            <button type="button" onClick={() => { setResult(null); setStatus("idle"); setError(null); window.scrollTo({ top: 0, behavior: "smooth" }) }} className="mt-5 text-sm font-semibold text-blue-700 hover:text-blue-900">{copy.retry}</button>
          </div>
        </section>
      )}
    </div>
  )
}
