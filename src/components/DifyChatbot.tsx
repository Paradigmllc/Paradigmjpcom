"use client"

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"

/**
 * DifyChatbot — locale-aware floating assistant
 *
 * AE-10 URL-state supremacy: locale は URL から派生した値 (layout.tsx 経由) を props で受ける。
 * このコンポーネントは locale を切替える UI を持たず、LocaleSwitcher が唯一の責任を持つ。
 * 全表示テキストは useTranslations("chatbot") 経由で messages/{ja,en}.json から読む。
 * /api/chat には locale を送信し、サーバ側で DIFY_APP_ID_JA / DIFY_APP_ID_EN を使い分ける。
 */
export default function DifyChatbot({ locale }: { locale: "ja" | "en" }) {
  const pathname = usePathname()
  const t = useTranslations("chatbot")

  const QUICK_QUESTIONS = useMemo(
    () => [
      { icon: "💰", label: t("quick.pricingLabel"), message: t("quick.pricingMessage") },
      { icon: "📋", label: t("quick.processLabel"), message: t("quick.processMessage") },
      { icon: "⏰", label: t("quick.timelineLabel"), message: t("quick.timelineMessage") },
      { icon: "📍", label: t("quick.meoLabel"), message: t("quick.meoMessage") },
      { icon: "🤖", label: t("quick.aiLabel"), message: t("quick.aiMessage") },
      { icon: "🔄", label: t("quick.supportLabel"), message: t("quick.supportMessage") },
    ],
    [t],
  )

  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: t("greeting") },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // locale 切替時に greeting をリセット（前言語のメッセージを残さない）
  useEffect(() => {
    setMessages([{ role: "bot", text: t("greeting") }])
    setConversationId(null)
  }, [locale, t])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  if (pathname.includes("/p/")) return null

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    setMessages(prev => [...prev, { role: "user", text }])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, locale }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: "bot", text: data.answer || t("errorReply") }])
      if (data.conversation_id) setConversationId(data.conversation_id)
    } catch {
      setMessages(prev => [...prev, { role: "bot", text: t("errorNetwork") }])
    }

    setLoading(false)
  }

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, locale])

  const fontFamily = locale === "ja" ? "'Noto Sans JP', sans-serif" : "'Inter', 'Noto Sans JP', sans-serif"

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 9999,
            width: 60, height: 60, borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", cursor: "pointer",
            boxShadow: "0 8px 32px rgba(99,102,241,.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform .2s, box-shadow .2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(99,102,241,.5)" }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(99,102,241,.4)" }}
          aria-label={t("openLabel")}
          title={t("openLabel")}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {open && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 380, maxWidth: "calc(100vw - 32px)",
          height: 580, maxHeight: "calc(100vh - 48px)",
          background: "#fff", borderRadius: 20, overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.06)",
          display: "flex", flexDirection: "column",
          fontFamily,
          animation: "chatSlideUp .25s ease",
        }}>
          <style>{`@keyframes chatSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>

          <div style={{
            padding: "14px 18px",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(255,255,255,.2)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              }}>💬</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t("title")}</div>
                <div style={{ fontSize: 11, opacity: .8, marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                  {t("status")}
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: "rgba(255,255,255,.15)", border: "none", borderRadius: 8,
              width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.3)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.15)"}
            aria-label="Close"
            >✕</button>
          </div>

          <div style={{
            flex: 1, overflowY: "auto", padding: "16px 14px 8px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "bot" && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginRight: 8, marginTop: 2,
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700,
                  }}>P</div>
                )}
                <div style={{
                  maxWidth: "80%", padding: "10px 14px", borderRadius: 16,
                  fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap",
                  ...(m.role === "user"
                    ? { background: "#6366f1", color: "#fff", borderBottomRightRadius: 4 }
                    : { background: "#f3f4f6", color: "#1e293b", borderBottomLeftRadius: 4 }),
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700,
                }}>P</div>
                <div style={{ background: "#f3f4f6", borderRadius: 16, padding: "10px 16px", display: "flex", gap: 4 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#94a3b8",
                      display: "inline-block",
                      animation: `bounce .8s ${i * 0.15}s infinite`,
                    }} />
                  ))}
                </div>
                <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
              </div>
            )}

            {messages.length <= 1 && !loading && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {QUICK_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q.message)} style={{
                    background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 100,
                    padding: "6px 12px", fontSize: 12, color: "#374151", cursor: "pointer",
                    transition: "all .15s", fontFamily,
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; e.currentTarget.style.background = "#f5f3ff"; e.currentTarget.style.color = "#6366f1" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#374151" }}
                  >
                    <span>{q.icon}</span> {q.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{
            padding: "10px 14px 14px", borderTop: "1px solid #f1f5f9",
            background: "#fff", flexShrink: 0,
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={t("placeholder")}
                disabled={loading}
                style={{
                  flex: 1, height: 42, border: "1.5px solid #e5e7eb", borderRadius: 12,
                  padding: "0 14px", fontSize: 13, outline: "none",
                  fontFamily,
                  transition: "border-color .15s",
                  background: loading ? "#f9fafb" : "#fff",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "#6366f1"}
                onBlur={e => e.currentTarget.style.borderColor = "#e5e7eb"}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                aria-label="Send"
                style={{
                  width: 42, height: 42, borderRadius: 12, border: "none", flexShrink: 0,
                  background: input.trim() && !loading ? "#6366f1" : "#e5e7eb",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .2s, transform .1s",
                }}
                onMouseDown={e => { if (input.trim()) e.currentTarget.style.transform = "scale(.92)" }}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", marginTop: 8 }}>
              {t("footerLine")} · <Link href="/contact" style={{ color: "#6366f1", textDecoration: "none" }}>{t("footerContact")}</Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
