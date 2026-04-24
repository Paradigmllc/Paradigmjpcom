import React from "react"
import { getPayload } from "payload"
import config from "@payload-config"
import Link from "next/link"

type Kpi = {
  label: string
  value: number | string
  hint?: string
  href: string
  accent: string
}

async function loadKpis(): Promise<{ kpis: Kpi[]; recentLeads: Array<{ id: string | number; name: string; email: string; companyName?: string; createdAt: string }> }> {
  try {
    const payload = await getPayload({ config })
    const [leads, posts, services, works, faqs, pricing] = await Promise.all([
      payload.count({ collection: "leads" }),
      payload.count({ collection: "posts" }),
      payload.count({ collection: "services" }),
      payload.count({ collection: "works" }),
      payload.count({ collection: "faqs" }),
      payload.count({ collection: "pricing" }),
    ])
    const recentLeadsRes = await payload.find({
      collection: "leads",
      limit: 5,
      sort: "-createdAt",
      depth: 0,
    })
    const recentLeads = (recentLeadsRes.docs as Array<Record<string, unknown>>).map((d) => ({
      id: (d.id as string | number) ?? "",
      name: (d.name as string) ?? "",
      email: (d.email as string) ?? "",
      companyName: (d.companyName as string) ?? undefined,
      createdAt: (d.createdAt as string) ?? "",
    }))
    return {
      kpis: [
        { label: "リード", value: leads.totalDocs, hint: "お問い合わせ総数", href: "/admin/collections/leads", accent: "#C1272D" },
        { label: "ブログ投稿", value: posts.totalDocs, hint: "公開＋下書き", href: "/admin/collections/posts", accent: "#1E3A5F" },
        { label: "サービス", value: services.totalDocs, hint: "商材定義", href: "/admin/collections/services", accent: "#0F766E" },
        { label: "制作実績", value: works.totalDocs, hint: "ポートフォリオ", href: "/admin/collections/works", accent: "#B45309" },
        { label: "料金プラン", value: pricing.totalDocs, hint: "Pricing", href: "/admin/collections/pricing", accent: "#6D28D9" },
        { label: "FAQ", value: faqs.totalDocs, hint: "よくある質問", href: "/admin/collections/faqs", accent: "#475569" },
      ],
      recentLeads,
    }
  } catch {
    return { kpis: [], recentLeads: [] }
  }
}

const Dashboard: React.FC = async () => {
  const { kpis, recentLeads } = await loadKpis()
  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "var(--theme-text)" }}>
          ダッシュボード
        </h1>
        <p style={{ fontSize: 13, color: "var(--theme-elevation-500)", marginTop: 4 }}>
          Paradigm CMS — 全コレクションのKPIと最近のリードをここで確認できます
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            style={{
              display: "block",
              padding: 20,
              background: "var(--theme-elevation-50)",
              border: "1px solid var(--theme-elevation-100)",
              borderLeft: `4px solid ${k.accent}`,
              borderRadius: 8,
              textDecoration: "none",
              transition: "transform 150ms ease, box-shadow 150ms ease",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--theme-elevation-500)", marginBottom: 6 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "var(--theme-text)", lineHeight: 1 }}>
              {k.value}
            </div>
            {k.hint && (
              <div style={{ fontSize: 11, color: "var(--theme-elevation-400)", marginTop: 6 }}>
                {k.hint}
              </div>
            )}
          </Link>
        ))}
      </div>

      <section>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "var(--theme-text)" }}>
            最近のリード（直近5件）
          </h2>
          <Link
            href="/admin/collections/leads"
            style={{ fontSize: 13, color: "#C1272D", textDecoration: "none" }}
          >
            すべて見る →
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              color: "var(--theme-elevation-500)",
              background: "var(--theme-elevation-50)",
              border: "1px dashed var(--theme-elevation-200)",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            まだリードはありません
          </div>
        ) : (
          <div
            style={{
              background: "var(--theme-elevation-50)",
              border: "1px solid var(--theme-elevation-100)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {recentLeads.map((lead, i) => (
              <Link
                key={String(lead.id)}
                href={`/admin/collections/leads/${lead.id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.5fr 1.5fr 1fr",
                  gap: 12,
                  padding: "14px 18px",
                  borderTop: i === 0 ? "none" : "1px solid var(--theme-elevation-100)",
                  textDecoration: "none",
                  color: "var(--theme-text)",
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 600 }}>{lead.name || "(名前なし)"}</span>
                <span style={{ color: "var(--theme-elevation-600)" }}>{lead.companyName || "—"}</span>
                <span style={{ color: "var(--theme-elevation-500)" }}>{lead.email}</span>
                <span style={{ color: "var(--theme-elevation-400)", fontSize: 12, textAlign: "right" }}>
                  {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("ja-JP") : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default Dashboard
