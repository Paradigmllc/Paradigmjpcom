"use client"

import type { Dispatch, SetStateAction } from "react"
import { useLocale } from "next-intl"
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
          $15,000 fixed setup
        </p>
        <p className="text-[13px] leading-[1.7] text-paradigm-ink-soft">
          Selected launch partners receive the standard $2,000/month managed-operation layer for 90 days at no additional monthly fee: $2,000/month × 3 months = $6,000 of value. Month 4 onward is $2,000/month under the signed terms. Apply only if your
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
  const locale = useLocale()
  const isJa = locale === "ja"
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
          $15,000 approval timeline <span className="text-pink-500">*</span>
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
      <div className="md:col-span-2">
        <label
          htmlFor="paymentMethod"
          className="block paradigm-eyebrow text-paradigm-ink-soft mb-2"
        >
          {isJa ? "希望する支払方法" : "Preferred payment method"} <span className="text-pink-500">*</span>
        </label>
        <select
          id="paymentMethod"
          required
          value={form.paymentMethod}
          onChange={(event) => updateContactForm(setForm, "paymentMethod", event.target.value)}
          className={FIELD_BASE}
        >
          <option value="">{isJa ? "選択してください" : "Select one"}</option>
          <option value="wise">Wise</option>
          <option value="bank-transfer">{isJa ? "銀行振込（請求書）" : "Bank transfer (invoice)"}</option>
          <option value="usdc">USDC（{isJa ? "ネットワークは請求書で確認" : "network confirmed on invoice"}）</option>
          <option value="credit-card">{isJa ? "クレジットカード（Stripe請求書／決済リンク）" : "Credit card (Stripe invoice or payment link)"}</option>
        </select>
        <p className="mt-2 text-[11px] leading-[1.6] text-paradigm-ink-mute">
          {isJa
            ? "適合確認後に請求書または決済案内を発行します。公開フォームに口座情報やウォレットアドレスを入力しないでください。"
            : "Payment instructions are issued after fit review. Never enter bank details or a wallet address in this public form."}
        </p>
      </div>
    </div>
  )
}

export function JapanEntryAcknowledgement({
  form,
  setForm,
}: JapanEntryFieldsProps) {
  const locale = useLocale()
  const isJa = locale === "ja"
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
        {isJa
          ? "Japan Entryのセットアップ15,000ドルは着手前払いで、必要条件が揃った開始日から14営業日以内に合意した納品物を納品できない場合、セットアップ費用全額が返金される条件を確認しました。顧客側の追加変更・保留期間は起算日程に含まれません。"
          : "I understand that the $15,000 Japan Entry setup fee is paid before kickoff and is fully refundable if Paradigm does not deliver the agreed setup within 14 business days from the Start Date. Client-requested changes or holds are recorded separately from the delivery clock."}
      </span>
    </label>
  )
}
