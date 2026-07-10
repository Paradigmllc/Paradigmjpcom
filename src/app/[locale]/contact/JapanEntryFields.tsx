"use client"

import type { Dispatch, SetStateAction } from "react"
import type { ContactFormState } from "./ContactFormFields"

const FIELD_BASE =
  "w-full px-0 py-3 bg-transparent border-b border-paradigm-line focus:border-paradigm-accent outline-none transition-colors text-[15px] text-paradigm-ink placeholder:text-paradigm-ink-mute"

interface JapanEntryFieldsProps {
  form: ContactFormState
  setForm: Dispatch<SetStateAction<ContactFormState>>
}

function updateContactForm<Key extends keyof ContactFormState>(
  setForm: Dispatch<SetStateAction<ContactFormState>>,
  key: Key,
  value: ContactFormState[Key],
) {
  setForm((current) => ({ ...current, [key]: value }))
}

export function JapanEntryCompanyFields({
  form,
  setForm,
}: JapanEntryFieldsProps) {
  return (
    <>
      <div className="rounded-2xl border border-paradigm-accent/30 bg-paradigm-accent/5 p-5 sm:p-6">
        <p className="paradigm-eyebrow text-paradigm-accent mb-2">
          Japan Entry Application
        </p>
        <p className="font-display text-[22px] leading-tight text-paradigm-ink mb-2">
          $12,000 fixed setup
        </p>
        <p className="text-[13px] leading-[1.7] text-paradigm-ink-soft">
          $0/month for the first six months, then $995/month. Apply only if your
          company can make a final decision within seven days and assign one
          launch owner.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="companyWebsite"
            className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
          >
            Company website <span className="text-pink-500">*</span>
          </label>
          <input
            id="companyWebsite"
            type="url"
            required
            autoComplete="url"
            inputMode="url"
            value={form.companyWebsite}
            onChange={(event) =>
              updateContactForm(setForm, "companyWebsite", event.target.value)
            }
            className={FIELD_BASE}
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label
            htmlFor="companyCountry"
            className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
          >
            Headquarters country <span className="text-pink-500">*</span>
          </label>
          <input
            id="companyCountry"
            type="text"
            required
            autoComplete="country-name"
            value={form.companyCountry}
            onChange={(event) =>
              updateContactForm(setForm, "companyCountry", event.target.value)
            }
            className={FIELD_BASE}
            placeholder="United States, United Kingdom, Australia..."
          />
        </div>
      </div>
    </>
  )
}

export function JapanEntryDecisionFields({
  form,
  setForm,
}: JapanEntryFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label
          htmlFor="decisionAuthority"
          className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
        >
          Final decision authority <span className="text-pink-500">*</span>
        </label>
        <select
          id="decisionAuthority"
          required
          value={form.decisionAuthority}
          onChange={(event) =>
            updateContactForm(setForm, "decisionAuthority", event.target.value)
          }
          className={FIELD_BASE}
        >
          <option value="">Select one</option>
          <option value="final-decision-maker">
            I am the final decision-maker
          </option>
          <option value="direct-access">
            I can secure final approval directly
          </option>
          <option value="not-final">I need several internal approvals</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="approvalTimeline"
          className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
        >
          $12,000 approval timeline <span className="text-pink-500">*</span>
        </label>
        <select
          id="approvalTimeline"
          required
          value={form.approvalTimeline}
          onChange={(event) =>
            updateContactForm(setForm, "approvalTimeline", event.target.value)
          }
          className={FIELD_BASE}
        >
          <option value="">Select one</option>
          <option value="within-7-days">Within seven days</option>
          <option value="within-30-days">Within 30 days</option>
          <option value="procurement-required">
            Procurement or board approval required
          </option>
          <option value="not-ready">Not ready to approve</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <label
          htmlFor="desiredLaunch"
          className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
        >
          Desired Japan launch <span className="text-pink-500">*</span>
        </label>
        <select
          id="desiredLaunch"
          required
          value={form.desiredLaunch}
          onChange={(event) =>
            updateContactForm(setForm, "desiredLaunch", event.target.value)
          }
          className={FIELD_BASE}
        >
          <option value="">Select one</option>
          <option value="this-month">Start this month</option>
          <option value="within-30-days">Start within 30 days</option>
          <option value="within-60-days">Start within 60 days</option>
          <option value="later">Later or exploratory</option>
        </select>
      </div>
    </div>
  )
}

export function JapanEntryAcknowledgement({
  form,
  setForm,
}: JapanEntryFieldsProps) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-paradigm-line p-4 text-[13px] leading-[1.65] text-paradigm-ink-soft cursor-pointer">
      <input
        type="checkbox"
        required
        checked={form.setupFeeAcknowledged}
        onChange={(event) =>
          updateContactForm(
            setForm,
            "setupFeeAcknowledged",
            event.target.checked,
          )
        }
        className="mt-1 accent-paradigm-accent"
      />
      <span>
        I understand that the Japan Entry setup fee is fixed at $12,000 and is
        paid before the 21-business-day launch sequence begins.
      </span>
    </label>
  )
}
