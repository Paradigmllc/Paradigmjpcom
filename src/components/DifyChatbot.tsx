"use client"

/**
 * DifyChatbot — locale-aware floating assistant (Aesop luxury voice).
 *
 * P18 follow-up (2026-04-30 ユーザ指示「Difyチャットボットのデザインも
 * ラグジュアリーな感じに」): 旧 violet/indigo gradient + rounded-20px shadow
 * 装飾を全廃し、paradigm-paper bg + paradigm-line hairline + paradigm-ink
 * accent + 直線コーナー + Noto Sans typography に書き換え。
 *
 * AE-10 URL-state supremacy: locale は URL から派生した値 (layout.tsx 経由) を
 * props で受ける。LocaleSwitcher が唯一の locale 切替責任を持つ。
 * AE-PHP-2 厳守: 全表示テキストは useTranslations("chatbot") 経由。
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"

const FONT_STACK = "'Noto Sans', 'Noto Sans JP', Arial, sans-serif"

const TOKENS = {
  paper: "rgb(var(--paradigm-paper))",
  paperDeep: "rgb(var(--paradigm-paper-deep))",
  paperCard: "rgb(var(--paradigm-paper-card))",
  ink: "rgb(var(--paradigm-ink))",
  inkSoft: "rgb(var(--paradigm-ink-soft))",
  inkMute: "rgb(var(--paradigm-ink-mute))",
  line: "rgb(var(--paradigm-line))",
  accent: "rgb(var(--paradigm-accent))",
} as const

export default function DifyChatbot({ locale }: { locale: "ja" | "en" }) {
  const pathname = usePathname()
  const t = useTranslations("chatbot")

  const QUICK_QUESTIONS = useMemo(
    () => [
      { label: t("quick.pricingLabel"), message: t("quick.pricingMessage") },
      { label: t("quick.processLabel"), message: t("quick.processMessage") },
      { label: t("quick.timelineLabel"), message: t("quick.timelineMessage") },
      { label: t("quick.meoLabel"), message: t("quick.meoMessage") },
      { label: t("quick.aiLabel"), message: t("quick.aiMessage") },
      { label: t("quick.supportLabel"), message: t("quick.supportMessage") },
    ],
    [t],
  )

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
    { role: "bot", text: t("greeting") },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMessages([{ role: "bot", text: t("greeting") }])
    setConversationId(null)
  }, [locale, t])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  if (pathname.includes("/p/") || pathname.includes("/report/")) return null

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    setMessages((prev) => [...prev, { role: "user", text }])
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, locale }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: "bot", text: data.answer || t("errorReply") }])
      if (data.conversation_id) setConversationId(data.conversation_id)
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: t("errorNetwork") }])
    }
    setLoading(false)
  }

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        sendMessage(input)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, loading, locale],
  )

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 9999,
            width: 56,
            height: 56,
            background: TOKENS.ink,
            border: `1px solid ${TOKENS.ink}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s, color 0.2s",
            fontFamily: FONT_STACK,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = TOKENS.paper
            e.currentTarget.style.color = TOKENS.ink
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = TOKENS.ink
            e.currentTarget.style.color = TOKENS.paper
          }}
          aria-label={t("openLabel")}
          title={t("openLabel")}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: TOKENS.paper }}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 9999,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            height: 600,
            maxHeight: "calc(100vh - 56px)",
            background: TOKENS.paper,
            border: `1px solid ${TOKENS.line}`,
            display: "flex",
            flexDirection: "column",
            fontFamily: FONT_STACK,
            animation: "chatSlideUp .25s ease",
          }}
        >
          <style>{`@keyframes chatSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>

          <div
            style={{
              padding: "20px 22px",
              background: TOKENS.paper,
              color: TOKENS.ink,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              borderBottom: `1px solid ${TOKENS.line}`,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: TOKENS.inkMute,
                  margin: 0,
                  marginBottom: 4,
                  fontWeight: 500,
                }}
              >
                Paradigm
              </p>
              <p style={{ fontWeight: 400, fontSize: 16, color: TOKENS.ink, margin: 0, letterSpacing: "-0.01em" }}>
                {t("title")}
              </p>
              <p style={{ fontSize: 11, color: TOKENS.inkMute, margin: 0, marginTop: 4, display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.05em" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: TOKENS.accent, display: "inline-block" }} />
                {t("status")}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: `1px solid ${TOKENS.line}`,
                width: 32,
                height: 32,
                cursor: "pointer",
                color: TOKENS.inkSoft,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = TOKENS.ink
                e.currentTarget.style.color = TOKENS.ink
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = TOKENS.line
                e.currentTarget.style.color = TOKENS.inkSoft
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 22px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              background: TOKENS.paper,
            }}
          >
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "12px 16px",
                    fontSize: 13,
                    lineHeight: 1.85,
                    whiteSpace: "pre-wrap",
                    border: `1px solid ${TOKENS.line}`,
                    ...(m.role === "user"
                      ? { background: TOKENS.ink, color: TOKENS.paper, borderColor: TOKENS.ink }
                      : { background: TOKENS.paperDeep, color: TOKENS.ink }),
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    background: TOKENS.paperDeep,
                    border: `1px solid ${TOKENS.line}`,
                    padding: "12px 16px",
                    display: "flex",
                    gap: 5,
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: TOKENS.inkMute,
                        display: "inline-block",
                        animation: `bounce .8s ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-4px);opacity:1}}`}</style>
              </div>
            )}

            {messages.length <= 1 && !loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 8, borderTop: `1px solid ${TOKENS.line}` }}>
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q.message)}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: `1px solid ${TOKENS.line}`,
                      padding: "11px 4px",
                      fontSize: 13,
                      color: TOKENS.inkSoft,
                      cursor: "pointer",
                      transition: "color 0.15s",
                      fontFamily: FONT_STACK,
                      textAlign: "left",
                      letterSpacing: "0.005em",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = TOKENS.ink)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = TOKENS.inkSoft)}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div
            style={{
              padding: "14px 22px 18px",
              borderTop: `1px solid ${TOKENS.line}`,
              background: TOKENS.paper,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={t("placeholder")}
                disabled={loading}
                style={{
                  flex: 1,
                  height: 40,
                  border: "none",
                  borderBottom: `1px solid ${TOKENS.line}`,
                  padding: "0 0 8px 0",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: FONT_STACK,
                  background: "transparent",
                  color: TOKENS.ink,
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderBottomColor = TOKENS.ink)}
                onBlur={(e) => (e.currentTarget.style.borderBottomColor = TOKENS.line)}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                aria-label="Send"
                style={{
                  width: 40,
                  height: 40,
                  border: `1px solid ${input.trim() && !loading ? TOKENS.ink : TOKENS.line}`,
                  background: input.trim() && !loading ? TOKENS.ink : "transparent",
                  cursor: input.trim() && !loading ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.2s, border-color 0.2s",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={input.trim() && !loading ? TOKENS.paper : TOKENS.inkMute}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p
              style={{
                fontSize: 10,
                color: TOKENS.inkMute,
                textAlign: "center",
                marginTop: 12,
                marginBottom: 0,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: 500,
              }}
            >
              {t("footerLine")} ·{" "}
              <Link href="/contact" style={{ color: TOKENS.inkSoft, textDecoration: "none", borderBottom: `1px solid ${TOKENS.line}` }}>
                {t("footerContact")}
              </Link>
            </p>
          </div>
        </div>
      )}
    </>
  )
}
