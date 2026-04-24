"use client"

import { useState } from "react"
import Link from "next/link"

export function ContactForm() {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "", budget: "" })
  const [services, setServices] = useState<string[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [msg, setMsg] = useState("")

  const toggleService = (s: string) => setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

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
      <div className="text-center py-16">
        <div className="text-5xl mb-4">&#10003;</div>
        <h3 className="text-2xl font-bold text-primary mb-3">送信完了</h3>
        <p className="text-text-muted">{msg}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-2">お名前 <span className="text-red-500">*</span></label>
          <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm" placeholder="山田 太郎" />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-2">会社名</label>
          <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm" placeholder="株式会社○○" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-2">メールアドレス <span className="text-red-500">*</span></label>
        <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm" placeholder="info@example.com" />
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-2">電話番号</label>
        <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm" placeholder="090-1234-5678" />
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-2">ご興味のあるサービス</label>
        <div className="grid grid-cols-2 gap-3">
          {["Web制作", "MEO対策", "SEO/GEO対策", "AI導入支援"].map(s => (
            <label key={s} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${services.includes(s) ? "border-accent bg-accent/5" : "border-gray-200 hover:border-accent/30"}`}>
              <input type="checkbox" checked={services.includes(s)} onChange={() => toggleService(s)} className="rounded border-gray-300 text-accent focus:ring-accent" />
              <span className="text-sm text-text-muted">{s}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-2">ご相談内容 <span className="text-red-500">*</span></label>
        <textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm resize-none" placeholder="御社の課題やご要望をお聞かせください。" />
      </div>

      <div>
        <label className="block text-sm font-medium text-primary mb-2">ご予算</label>
        <select value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all text-sm text-text-muted">
          <option value="">選択してください</option>
          <option value="~30万円">~30万円</option>
          <option value="30~50万円">30~50万円</option>
          <option value="50~100万円">50~100万円</option>
          <option value="100万円以上">100万円以上</option>
          <option value="未定">未定・相談したい</option>
        </select>
      </div>

      {status === "error" && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{msg}</div>
      )}

      <button type="submit" disabled={status === "loading"} className="w-full py-4 bg-accent text-white rounded-xl font-bold text-lg hover:bg-accent/90 transition-colors shadow-lg shadow-accent/25 disabled:opacity-50 disabled:cursor-not-allowed">
        {status === "loading" ? "送信中..." : "送信する"}
      </button>
      <p className="text-xs text-text-muted text-center">
        送信いただいた内容は<Link href="/privacy" className="underline hover:text-accent">プライバシーポリシー</Link>に基づき適切に管理いたします。
      </p>
    </form>
  )
}
