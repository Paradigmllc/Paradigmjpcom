import type { CSSProperties } from "react"
import type { Payload } from "payload"
import { headers } from "next/headers"

type Counts = Record<string, number>

const CONTENT_CARDS: { slug: string; label: string }[] = [
  { slug: "pages", label: "ページ" },
  { slug: "posts", label: "ブログ記事" },
  { slug: "services", label: "サービス" },
  { slug: "pricing", label: "料金プラン" },
  { slug: "works", label: "実績" },
  { slug: "faqs", label: "FAQ" },
  { slug: "team-members", label: "チーム" },
  { slug: "testimonials", label: "お客様の声" },
  { slug: "categories", label: "カテゴリー" },
  { slug: "media", label: "メディア" },
]

const STAGE_LABELS: Record<string, string> = {
  new: "新規",
  in_discussion: "商談中",
  proposal_sent: "提案済み",
  closed_won: "成約",
  closed_lost: "失注",
}

const card: CSSProperties = {
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 8,
  padding: "16px 18px",
  background: "var(--theme-elevation-50)",
}

function adminButtonStyle(kind: "primary" | "secondary" = "secondary"): CSSProperties {
  return {
    border: kind === "primary" ? "1px solid var(--theme-text)" : "1px solid var(--theme-elevation-200)",
    borderRadius: 6,
    background: kind === "primary" ? "var(--theme-text)" : "transparent",
    color: kind === "primary" ? "var(--theme-bg)" : "inherit",
    fontSize: 13,
    fontWeight: kind === "primary" ? 600 : 500,
    padding: "9px 12px",
    textDecoration: "none",
  }
}

async function countCollection(payload: Payload, slug: string): Promise<[string, number]> {
  try {
    const result = await payload.count({ collection: slug as "pages" })
    return [slug, result.totalDocs]
  } catch (error) {
    console.error("[BeforeDashboard] count failed:", slug, error)
    return [slug, -1]
  }
}

export default async function BeforeDashboard({ payload }: { payload: Payload }) {
  const requestHeaders = await headers()
  const acceptLang = requestHeaders.get("accept-language") || ""
  const detectedLocale = acceptLang.toLowerCase().startsWith("en") ? "en" : "ja"
  const twentyUrl = "https://twenty.paradigmjp.com"

  let counts: Counts = {}
  let leadsByStage: Counts = {}
  let recent: Array<{ collection?: string; action?: string; userEmail?: string | null; createdAt?: string }> = []
  let dbUnavailable = false

  try {
    await payload.count({ collection: "pages" })
  } catch (error) {
    dbUnavailable = true
    console.warn("[BeforeDashboard] DB unavailable, showing lightweight view:", error instanceof Error ? error.message : error)
  }

  if (!dbUnavailable) {
    try {
      const essentialCards = CONTENT_CARDS.slice(0, 4)
      const countResults = await Promise.all(essentialCards.map((item) => countCollection(payload, item.slug)))
      counts = Object.fromEntries(countResults)

      const leads = await payload.find({ collection: "leads", limit: 200, depth: 0 })
      for (const lead of leads.docs as Array<{ pipelineStage?: string }>) {
        const stage = lead.pipelineStage ?? "new"
        leadsByStage[stage] = (leadsByStage[stage] ?? 0) + 1
      }

      const audit = await payload.find({
        collection: "audit-logs",
        limit: 3,
        sort: "-createdAt",
        depth: 0,
      })
      recent = audit.docs as typeof recent
    } catch (error) {
      console.error("[BeforeDashboard] dashboard aggregation failed:", error instanceof Error ? error.message : error)
    }
  }

  const totalLeads = Object.values(leadsByStage).reduce((acc, count) => acc + count, 0)

  return (
    <div style={{ marginBottom: 32 }}>
      <section
        style={{
          ...card,
          marginBottom: 24,
          background: "linear-gradient(135deg, var(--theme-elevation-50), var(--theme-elevation-0))",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between" }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{ fontSize: 12, color: "var(--theme-elevation-500)", marginBottom: 6 }}>
              PayloadCMS 共通管理
            </div>
            <h2 style={{ fontSize: 20, margin: 0 }}>サイト管理ダッシュボード</h2>
            <p style={{ color: "var(--theme-elevation-600)", margin: "8px 0 0", fontSize: 13, lineHeight: 1.7 }}>
              この画面はPayloadのコンテンツ管理とリード入口だけに絞りました。Supabase、NocoDB、Appsmith、Twenty、Metabase、Trigger.dev、Cal.com、Docusealなどの営業基盤はRevenue OSの「統合」に集約しています。
            </p>
          </div>
          <a href={twentyUrl} target="_blank" rel="noopener noreferrer" style={adminButtonStyle("primary")}>
            Twenty Sales OS を開く
          </a>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          <a href="/admin/collections/leads" style={adminButtonStyle()}>
            Payloadリード
          </a>
          <a href={twentyUrl} target="_blank" rel="noopener noreferrer" style={adminButtonStyle()}>
            Twenty Sales OS
          </a>
        </div>
      </section>

      <h2 style={{ fontSize: 18, marginBottom: 4 }}>サイト概要</h2>
      <p style={{ color: "var(--theme-elevation-500)", marginBottom: 16, fontSize: 13 }}>
        Paradigm HPの状態を一覧表示します。営業基盤の接続状態はRevenue OSの「統合」で確認してください。
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        {CONTENT_CARDS.map((item) => {
          const count = counts[item.slug]
          return (
            <a key={item.slug} href={`/admin/collections/${item.slug}`} style={{ ...card, textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 12, color: "var(--theme-elevation-500)" }}>{item.label}</div>
              <div style={{ fontSize: 26, fontWeight: 600 }}>{count === undefined || count < 0 ? "-" : count}</div>
            </a>
          )
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <strong>リード ({totalLeads})</strong>
            <a href="/admin/collections/leads" style={{ fontSize: 12 }}>
              すべて見る →
            </a>
          </div>
          {totalLeads === 0 ? (
            <p style={{ fontSize: 13, color: "var(--theme-elevation-500)" }}>まだリードがありません。</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(STAGE_LABELS).map(([stage, label]) => (
                <li key={stage} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--theme-elevation-600)" }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{leadsByStage[stage] ?? 0}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <strong>最近の変更</strong>
            <a href="/admin/collections/audit-logs" style={{ fontSize: 12 }}>
              監査ログ →
            </a>
          </div>
          {recent.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--theme-elevation-500)" }}>まだ変更履歴がありません。</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {recent.map((item, index) => (
                <li key={`${item.collection ?? "unknown"}-${item.createdAt ?? index}`} style={{ fontSize: 12, color: "var(--theme-elevation-600)" }}>
                  {item.collection ?? "-"} / {item.action ?? "-"} / {item.userEmail ?? "system"}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={card}>
          <strong>新規作成</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <a href="/admin/collections/posts/create" style={adminButtonStyle()}>+ 記事</a>
            <a href="/admin/collections/works/create" style={adminButtonStyle()}>+ 実績</a>
            <a href="/admin/collections/team-members/create" style={adminButtonStyle()}>+ メンバー</a>
            <a href="/admin/collections/testimonials/create" style={adminButtonStyle()}>+ お客様の声</a>
            <a href="/admin/collections/pages/create" style={adminButtonStyle()}>+ ページ</a>
          </div>
        </div>
      </div>
    </div>
  )
}
