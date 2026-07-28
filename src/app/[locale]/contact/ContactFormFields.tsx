"use client"

import type { Dispatch, SetStateAction } from "react"
import {
  JapanEntryAcknowledgement,
  JapanEntryCompanyFields,
  JapanEntryDecisionFields,
} from "./JapanEntryFields"
import VideoServiceFields from "./VideoServiceFields"

const FIELD_BASE =
  "w-full px-0 py-3 bg-transparent border-b border-paradigm-line focus:border-paradigm-accent outline-none transition-colors text-[15px] text-paradigm-ink placeholder:text-paradigm-ink-mute"

export interface BudgetOption {
  v: string
  l: string
}

export interface ContactFormState {
  name: string
  company: string
  email: string
  phone: string
  message: string
  budget: string
  companyWebsite: string
  companyCountry: string
  decisionAuthority: string
  approvalTimeline: string
  desiredLaunch: string
  paymentMethod: string
  setupFeeAcknowledged: boolean
  videoPlan: string
  monthlyVideoDemand: string
  videoAssetReadiness: string
  videoPreferredStart: string
  videoTermsAcknowledged: boolean
}

export const EMPTY_CONTACT_FORM: ContactFormState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  message: "",
  budget: "",
  companyWebsite: "",
  companyCountry: "",
  decisionAuthority: "",
  approvalTimeline: "",
  desiredLaunch: "",
  paymentMethod: "",
  setupFeeAcknowledged: false,
  videoPlan: "",
  monthlyVideoDemand: "",
  videoAssetReadiness: "",
  videoPreferredStart: "",
  videoTermsAcknowledged: false,
}

interface ContactFormFieldsProps {
  isJapanEntry: boolean
  isVideoService: boolean
  locale: string
  form: ContactFormState
  setForm: Dispatch<SetStateAction<ContactFormState>>
  services: string[]
  setServices: Dispatch<SetStateAction<string[]>>
  servicesList: string[]
  budgetOptions: BudgetOption[]
  t: (key: string) => string
}

export function ContactFormFields({
  isJapanEntry,
  isVideoService,
  locale,
  form,
  setForm,
  services,
  setServices,
  servicesList,
  budgetOptions,
  t,
}: ContactFormFieldsProps) {
  const update = <Key extends keyof ContactFormState>(
    key: Key,
    value: ContactFormState[Key],
  ) => setForm((current) => ({ ...current, [key]: value }))
  const toggleService = (service: string) =>
    setServices((current) =>
      current.includes(service)
        ? current.filter((item) => item !== service)
        : [...current, service],
    )
  const videoLocale = locale === "ja" ? "ja" : "en"

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="contactName"
            className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
          >
            {t("name")} <span className="text-pink-500">{t("required")}</span>
          </label>
          <input
            id="contactName"
            type="text"
            required
            autoComplete="name"
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            className={FIELD_BASE}
            placeholder={t("namePh")}
          />
        </div>
        <div>
          <label
            htmlFor="contactCompany"
            className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
          >
            {t("company")} {" "}
            {(isJapanEntry || isVideoService) && (
              <span className="text-pink-500">{t("required")}</span>
            )}
          </label>
          <input
            id="contactCompany"
            type="text"
            required={isJapanEntry || isVideoService}
            autoComplete="organization"
            value={form.company}
            onChange={(event) => update("company", event.target.value)}
            className={FIELD_BASE}
            placeholder={t("companyPh")}
          />
        </div>
      </div>

      {isJapanEntry && (
        <JapanEntryCompanyFields form={form} setForm={setForm} />
      )}

      {isVideoService && (
        <VideoServiceFields
          locale={videoLocale}
          form={form}
          setForm={setForm}
        />
      )}

      <div>
        <label
          htmlFor="contactEmail"
          className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
        >
          {t("email")} <span className="text-pink-500">{t("required")}</span>
        </label>
        <input
          id="contactEmail"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          className={FIELD_BASE}
          placeholder={t("emailPh")}
        />
      </div>
      <div>
        <label
          htmlFor="contactPhone"
          className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
        >
          {t("phone")}
        </label>
        <input
          id="contactPhone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(event) => update("phone", event.target.value)}
          className={FIELD_BASE}
          placeholder={t("phonePh")}
        />
      </div>

      {!isJapanEntry && !isVideoService && (
        <fieldset>
          <legend className="block paradigm-eyebrow text-paradigm-ink-soft mb-3">
            {t("services")}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {servicesList.map((service) => (
              <label
                key={service}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-[12px] ${services.includes(service) ? "border-paradigm-accent bg-paradigm-accent/8 text-paradigm-ink" : "border-paradigm-line text-paradigm-ink-soft hover:border-paradigm-ink"}`}
              >
                <input
                  type="checkbox"
                  checked={services.includes(service)}
                  onChange={() => toggleService(service)}
                  className="accent-paradigm-accent"
                />
                <span>{service}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {isJapanEntry && (
        <JapanEntryDecisionFields form={form} setForm={setForm} />
      )}

      <div>
        <label
          htmlFor="contactMessage"
          className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
        >
          {isJapanEntry
            ? "What are you launching in Japan?"
            : isVideoService
              ? videoLocale === "ja"
                ? "最初に作りたい動画"
                : "What is the first video you need?"
              : t("message")} {" "}
          <span className="text-pink-500">{t("required")}</span>
        </label>
        <textarea
          id="contactMessage"
          required
          rows={5}
          value={form.message}
          onChange={(event) => update("message", event.target.value)}
          className={`${FIELD_BASE} resize-none`}
          placeholder={
            isJapanEntry
              ? "Product, current markets, Japanese demand signals, and why the launch matters now"
              : isVideoService
                ? videoLocale === "ja"
                  ? "目的、掲載先、希望尺、参考動画、素材の有無、希望時期を記載してください"
                  : "Objective, channel, target duration, references, available assets, and desired timing"
                : t("messagePh")
          }
        />
      </div>

      {!isJapanEntry && !isVideoService && (
        <div>
          <label
            htmlFor="contactBudget"
            className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
          >
            {t("budget")}
          </label>
          <select
            id="contactBudget"
            value={form.budget}
            onChange={(event) => update("budget", event.target.value)}
            className={FIELD_BASE}
          >
            {budgetOptions.map((option) => (
              <option key={option.v} value={option.v}>
                {option.l}
              </option>
            ))}
          </select>
        </div>
      )}

      {isJapanEntry && (
        <JapanEntryAcknowledgement form={form} setForm={setForm} />
      )}
    </>
  )
}
