"use client"

import type { Dispatch, SetStateAction } from "react"
import { Link } from "@/i18n/routing"
import {
  getVideoServicePlans,
  type VideoServiceLocale,
  type VideoServicePlanId,
} from "@/lib/video-service-content"
import type { ContactFormState } from "./ContactFormFields"

const FIELD_BASE =
  "w-full px-0 py-3 bg-transparent border-b border-paradigm-line focus:border-paradigm-accent outline-none transition-colors text-[15px] text-paradigm-ink placeholder:text-paradigm-ink-mute"

const DEMAND_OPTIONS = [
  { value: "1-4", ja: "月1〜4本", en: "1–4 videos / month" },
  { value: "5-10", ja: "月5〜10本", en: "5–10 videos / month" },
  { value: "11-20", ja: "月11〜20本", en: "11–20 videos / month" },
  { value: "21-plus", ja: "月21本以上", en: "21+ videos / month" },
] as const

const ASSET_OPTIONS = [
  {
    value: "ready",
    ja: "素材・ブランドガイドが揃っている",
    en: "Assets and brand guidance are ready",
  },
  {
    value: "partial",
    ja: "一部揃っている・整理支援が必要",
    en: "Partially ready; organization support needed",
  },
  {
    value: "concept-only",
    ja: "企画段階・素材制作から相談したい",
    en: "Concept stage; need production support",
  },
] as const

const START_OPTIONS = [
  { value: "within-7-days", ja: "7日以内", en: "Within 7 days" },
  { value: "within-30-days", ja: "30日以内", en: "Within 30 days" },
  { value: "later", ja: "時期を相談", en: "Discuss timing" },
] as const

interface Props {
  locale: VideoServiceLocale
  form: ContactFormState
  setForm: Dispatch<SetStateAction<ContactFormState>>
}

export default function VideoServiceFields({ locale, form, setForm }: Props) {
  const isJa = locale === "ja"
  const plans = getVideoServicePlans(locale)
  const update = <Key extends keyof ContactFormState>(
    key: Key,
    value: ContactFormState[Key],
  ) => setForm((current) => ({ ...current, [key]: value }))

  return (
    <div className="space-y-7 border-y border-paradigm-line py-7">
      <div>
        <label
          htmlFor="videoCompanyWebsite"
          className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
        >
          {isJa ? "会社・サービスURL" : "Company or product URL"}{" "}
          <span className="text-pink-500">*</span>
        </label>
        <input
          id="videoCompanyWebsite"
          type="url"
          required
          inputMode="url"
          autoComplete="url"
          value={form.companyWebsite}
          onChange={(event) => update("companyWebsite", event.target.value)}
          className={FIELD_BASE}
          placeholder="https://example.com"
        />
      </div>

      <fieldset>
        <legend className="block paradigm-eyebrow text-paradigm-ink-soft mb-3">
          {isJa ? "希望プラン" : "Preferred plan"}{" "}
          <span className="text-pink-500">*</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {plans.map((plan) => (
            <label
              key={plan.id}
              className={`cursor-pointer border p-4 transition-colors ${
                form.videoPlan === plan.id
                  ? "border-paradigm-accent bg-paradigm-accent/8"
                  : "border-paradigm-line hover:border-paradigm-ink"
              }`}
            >
              <input
                type="radio"
                name="videoPlan"
                value={plan.id}
                required
                checked={form.videoPlan === plan.id}
                onChange={(event) =>
                  update("videoPlan", event.target.value as VideoServicePlanId)
                }
                className="sr-only"
              />
              <span className="block font-display text-[18px] text-paradigm-ink">
                {plan.name}
              </span>
              <span className="mt-1 block text-[12px] font-semibold text-paradigm-accent">
                {plan.price}{plan.cadence}
              </span>
              <span className="mt-2 block text-[11px] leading-[1.6] text-paradigm-ink-mute">
                {plan.capacity} · {plan.activeRequests}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="monthlyVideoDemand"
            className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
          >
            {isJa ? "想定する月間需要" : "Expected monthly demand"}{" "}
            <span className="text-pink-500">*</span>
          </label>
          <select
            id="monthlyVideoDemand"
            required
            value={form.monthlyVideoDemand}
            onChange={(event) => update("monthlyVideoDemand", event.target.value)}
            className={FIELD_BASE}
          >
            <option value="">{isJa ? "選択してください" : "Select one"}</option>
            {DEMAND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {isJa ? option.ja : option.en}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="videoPreferredStart"
            className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
          >
            {isJa ? "希望開始時期" : "Preferred start"}{" "}
            <span className="text-pink-500">*</span>
          </label>
          <select
            id="videoPreferredStart"
            required
            value={form.videoPreferredStart}
            onChange={(event) => update("videoPreferredStart", event.target.value)}
            className={FIELD_BASE}
          >
            <option value="">{isJa ? "選択してください" : "Select one"}</option>
            {START_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {isJa ? option.ja : option.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="block paradigm-eyebrow text-paradigm-ink-soft mb-3">
          {isJa ? "素材の準備状況" : "Asset readiness"}{" "}
          <span className="text-pink-500">*</span>
        </legend>
        <div className="space-y-2">
          {ASSET_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 border px-4 py-3 text-[12px] leading-[1.65] transition-colors ${
                form.videoAssetReadiness === option.value
                  ? "border-paradigm-accent bg-paradigm-accent/8 text-paradigm-ink"
                  : "border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink"
              }`}
            >
              <input
                type="radio"
                name="videoAssetReadiness"
                value={option.value}
                required
                checked={form.videoAssetReadiness === option.value}
                onChange={(event) =>
                  update("videoAssetReadiness", event.target.value)
                }
                className="mt-1 accent-paradigm-accent"
              />
              <span>{isJa ? option.ja : option.en}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 border border-paradigm-line bg-paradigm-paper-deep p-4 text-[12px] leading-[1.75] text-paradigm-ink-soft">
        <input
          type="checkbox"
          required
          checked={form.videoTermsAcknowledged}
          onChange={(event) =>
            update("videoTermsAcknowledged", event.target.checked)
          }
          className="mt-1 accent-paradigm-accent"
        />
        <span>
          {isJa
            ? "本サービスが事業者向けであり、月額前払い、依頼キューと同時進行枠、Ready後の着手条件、更新・解約条件が適用されることを確認し、"
            : "I confirm this is a business purchase and understand the prepaid monthly billing, request queue, active-slot limits, Ready-start condition, renewal, and cancellation terms. I have reviewed the "}
          <Link
            href="/video-as-a-service/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-paradigm-accent underline decoration-paradigm-accent/40 underline-offset-4"
          >
            {isJa ? "Video as a Service利用規約" : "Video as a Service Terms"}
          </Link>
          {isJa ? "を確認しました。" : "."}
        </span>
      </label>
    </div>
  )
}
