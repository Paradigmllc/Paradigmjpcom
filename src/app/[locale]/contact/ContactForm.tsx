"use client"

/**
 * ContactForm — Aesop voice form.
 *
 * P18-D-3 followup rewrite. Drops accent-violet focus rings + rounded-xl
 * inputs + bg-accent submit in favour of hairline borders + paradigm-ink
 * focus underline + paradigm-eyebrow labels + outline submit button.
 *
 * AE-PHP-1: 130 lines.
 */

import { useState } from "react"
import { Link } from "@/i18n/routing"

const FIELD_BASE =
  "w-full px-0 py-3 bg-transparent border-b border-paradigm-line focus:border-paradigm-ink outline-none transition-colors text-[15px] text-paradigm-ink placeholder:text-paradigm-ink-mute"

export function ContactForm() {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "", budget: "" })
  const [services, setServices] = useState<string[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [msg, setMsg] = useState("")

  const toggleService = (s: string) =>
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, services }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus("success")
        setMsg(data.message)
        setForm({ name: "", company: "", email: "", phone: "", message: "", budget: "" })
        setServices([])
      } else {
        setStatus("error")
        setMsg(data.error || "送信に失敗しました")
      }
    } catch {
      setStatus("error")
      setMsg("ネットワークエラーが発生しました")
    }
  }

  if (status === "success") {
    return (
      <div className="border-t border-paradigm-line pt-12">
        <p className="paradigm-eyebrow mb-5">Sent</p>
        <h3 className="font-display text-[28px] md:text-[36px] leading-[1.2] text-paradigm-ink mb-5">
          送信完了
        </h3>
        <p className="text-[14px] md:text-[15px] text-paradigm-ink-soft leading-[1.85] max-w-lg">
          {msg}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div>
          <label className="paradigm-eyebrow block mb-3">
            お名前 <span className="text-paradigm-accent">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={FIELD_BASE}
            placeholder="山田 太郎"
          />
        </div>
        <div>
          <label className="paradigm-eyebrow block mb-3">会社名</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            className={FIELD_BASE}
            placeholder="株式会社○○"
          />
        </div>
      </div>

      <div>
        <label className="paradigm-eyebrow block mb-3">
          メールアドレス <span className="text-paradigm-accent">*</span>
        </label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className={FIELD_BASE}
          placeholder="info@example.com"
        />
      </div>

      <div>
        <label className="paradigm-eyebrow block mb-3">電話番号</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className={FIELD_BASE}
          placeholder="090-1234-5678"
        />
      </div>

      <div>
        <label className="paradigm-eyebrow block mb-4">ご興味のあるサービス</label>
        <div className="grid grid-cols-2 gap-px bg-paradigm-line">
          {["Web制作", "MEO対策", "SEO/GEO対策", "AI導入支援"].map((s) => {
            const checked = services.includes(s)
            return (
              <label
                key={s}
                className={`bg-paradigm-paper flex items-center gap-3 p-5 cursor-pointer transition-colors ${
                  checked ? "text-paradigm-ink" : "text-paradigm-ink-soft hover:text-paradigm-ink"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleService(s)}
                  className="h-4 w-4 accent-paradigm-ink border-paradigm-line"
                />
                <span className="text-[14px]">{s}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div>
        <label className="paradigm-eyebrow block mb-3">
          ご相談内容 <span className="text-paradigm-accent">*</span>
        </label>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className={`${FIELD_BASE} resize-none`}
          placeholder="御社の課題やご要望をお聞かせください。"
        />
      </div>

      <div>
        <label className="paradigm-eyebrow block mb-3">ご予算</label>
        <select
          value={form.budget}
          onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
          className={FIELD_BASE}
        >
          <option value="">選択してください</option>
          <option value="~30万円">~30万円</option>
          <option value="30~50万円">30~50万円</option>
          <option value="50~100万円">50~100万円</option>
          <option value="100万円以上">100万円以上</option>
          <option value="未定">未定・相談したい</option>
        </select>
      </div>

      {status === "error" && (
        <div className="border-t border-paradigm-accent/40 pt-4">
          <p className="paradigm-eyebrow text-paradigm-accent">{msg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-4 bg-paradigm-ink text-paradigm-paper text-[12px] tracking-[0.18em] uppercase hover:bg-paradigm-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "送信中..." : "送信する"}
      </button>
      <p className="text-[12px] text-paradigm-ink-mute text-center leading-[1.7]">
        送信いただいた内容は
        <Link href="/privacy" className="underline decoration-paradigm-line hover:decoration-paradigm-ink hover:text-paradigm-ink-soft transition-colors mx-0.5">
          プライバシーポリシー
        </Link>
        に基づき適切に管理いたします。
      </p>
    </form>
  )
}
