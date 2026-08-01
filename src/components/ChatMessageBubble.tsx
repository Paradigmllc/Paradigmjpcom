"use client"

import { Link } from "@/i18n/routing"

export type ChatSource = { title: string; href: string }
export type ChatMessage = { role: "user" | "bot"; text: string; sources?: ChatSource[] }

const TOKENS = {
  paper: "rgb(var(--paradigm-paper))",
  paperDeep: "rgb(var(--paradigm-paper-deep))",
  ink: "rgb(var(--paradigm-ink))",
  inkMute: "rgb(var(--paradigm-ink-mute))",
  line: "rgb(var(--paradigm-line))",
  accent: "rgb(var(--paradigm-accent))",
} as const

export default function ChatMessageBubble({ message, locale }: { message: ChatMessage; locale: "ja" | "en" }) {
  return (
    <div style={{ display: "flex", justifyContent: message.role === "user" ? "flex-end" : "flex-start" }}>
      <div
        style={{
          maxWidth: "85%",
          padding: "12px 16px",
          fontSize: 13,
          lineHeight: 1.85,
          whiteSpace: "pre-wrap",
          border: `1px solid ${TOKENS.line}`,
          ...(message.role === "user"
            ? { background: TOKENS.ink, color: TOKENS.paper, borderColor: TOKENS.ink }
            : { background: TOKENS.paperDeep, color: TOKENS.ink }),
        }}
      >
        {message.text}
        {message.role === "bot" && message.sources && message.sources.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${TOKENS.line}`, display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: TOKENS.inkMute }}>
              {locale === "ja" ? "参照した公開情報" : "Approved site sources"}
            </span>
            {message.sources.slice(0, 3).map((source) => (
              <Link key={`${source.href}-${source.title}`} href={source.href} style={{ fontSize: 11, color: TOKENS.accent, textDecoration: "underline", textUnderlineOffset: 3 }}>
                {source.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
