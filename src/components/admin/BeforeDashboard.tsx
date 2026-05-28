/**
 * BeforeDashboard — PayloadCMS admin ダッシュボード上部のカスタム概要パネル
 *
 * 2026-05-21 ユーザ指示「管理画面が機能少なすぎる」対応。
 * 既定 dashboard はコレクション一覧のカードだけで「今どうなっているか」が分からない。
 * 本コンポーネント (admin.components.beforeDashboard) で:
 *   ① 各コンテンツの件数 ② リードのパイプライン内訳 ③ 直近の監査ログ
 *   ④ よく使う新規作成ショートカット
 * を 1 画面で把握できるようにする。
 *
 * Server Component: payload local API で集計 (admin bundle 内で実行)。
 * 耐障害: 集計失敗時もダッシュボードを壊さないよう try/catch で握る (E ルールに則り
 *   console.error で可視化しつつ UI は degrade して継続)。
 */

import type { CSSProperties } from "react"
import type { Payload } from "payload"

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
  closed_lost: "不成約",
}

const card: CSSProperties = {
  border: "1px solid var(--theme-elevation-150)",
  borderRadius: 8,
  padding: "16px 18px",
  background: "var(--theme-elevation-50)",
}

const SALES_DASHBOARD_PATH = "/ja/admin/sales"

function envUrl(name: string): string | null {
  const value = process.env[name]
  if (!value || value.trim().length === 0) return null
  return value
}

function getAdminToolLinks(): Array<{ label: string; role: string; url: string }> {
  return [
    { label: "NocoDB", role: "大量リストの一括編集", url: envUrl("NOCODB_BASE_URL") },
    { label: "Appsmith", role: "オペレーター作業画面", url: envUrl("APPSMITH_BASE_URL") },
    { label: "Twenty", role: "商談・CRM", url: envUrl("TWENTY_BASE_URL") },
    { label: "Metabase", role: "営業分析", url: envUrl("METABASE_BASE_URL") },
  ].flatMap((tool) => (tool.url ? [{ ...tool, url: tool.url }] : []))
}

export default async function BeforeDashboard({ payload }: { payload: Payload }) {
  let counts: Counts = {}
  let leadsByStage: Counts = {}
  let recent: Array<{ collection?: string; action?: string; userEmail?: string | null; createdAt?: string }> = []
  const adminToolLinks = getAdminToolLinks()

  try {

    // ① コンテンツ件数 (並列 count)
    const countResults = await Promise.all(
      CONTENT_CARDS.map(async (c) => {
        try {
          const r = await payload.count({ collection: c.slug as "pages" })
          return [c.slug, r.totalDocs] as const
        } catch (e) {
          console.error("[BeforeDashboard] count failed:", c.slug, e)
          return [c.slug, -1] as const // -1 = 取得不可 (テーブル未作成等)
        }
      }),
    )
    counts = Object.fromEntries(countResults)

    // ② リードのパイプライン内訳
    const leads = await payload.find({ collection: "leads", limit: 1000, depth: 0 })
    for (const l of leads.docs as Array<{ pipelineStage?: string }>) {
      const k = l.pipelineStage ?? "new"
      leadsByStage[k] = (leadsByStage[k] ?? 0) + 1
    }

    // ③ 直近の監査ログ 6 件
    const audit = await payload.find({
      collection: "audit-logs",
      limit: 6,
      sort: "-createdAt",
      depth: 0,
    })
    recent = audit.docs as typeof recent
  } catch (e) {
    console.error("[BeforeDashboard] 集計に失敗:", e instanceof Error ? e.message : e)
  }

  const totalLeads = Object.values(leadsByStage).reduce((a, b) => a + b, 0)

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
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontSize: 12, color: "var(--theme-elevation-500)", marginBottom: 6 }}>
              PayloadCMS 共通管理
            </div>
            <h2 style={{ fontSize: 20, margin: 0 }}>営業司令塔</h2>
            <p style={{ color: "var(--theme-elevation-600)", margin: "8px 0 0", fontSize: 13, lineHeight: 1.7 }}>
              営業ダッシュボードはこの管理画面と同じログインで利用します。Supabase Cloud を正本にし、
              NocoDB / Appsmith / Twenty / Metabase / n8n の OSS 画面はここから横断できるように集約します。
            </p>
          </div>
          <a
            href={SALES_DASHBOARD_PATH}
            style={{
              alignSelf: "flex-start",
              borderRadius: 6,
              background: "var(--theme-text)",
              color: "var(--theme-bg)",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 14px",
              textDecoration: "none",
            }}
          >
            営業ダッシュボードを開く
          </a>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          <a
            href="/admin/collections/leads"
            style={{
              border: "1px solid var(--theme-elevation-200)",
              borderRadius: 6,
              color: "inherit",
              fontSize: 12,
              padding: "7px 10px",
              textDecoration: "none",
            }}
          >
            Payload リード
          </a>
          {adminToolLinks.map((tool) => (
            <a
              key={tool.label}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              title={tool.role}
              style={{
                border: "1px solid var(--theme-elevation-200)",
                borderRadius: 6,
                color: "inherit",
                fontSize: 12,
                padding: "7px 10px",
                textDecoration: "none",
              }}
            >
              {tool.label}
            </a>
          ))}
        </div>
      </section>

      <h2 style={{ fontSize: 18, marginBottom: 4 }}>サイト概要</h2>
      <p style={{ color: "var(--theme-elevation-500)", marginBottom: 16, fontSize: 13 }}>
        Paradigm HP の状況を一覧表示します。各カードからコンテンツ管理へ移動できます。
      </p>

      {/* ① コンテンツ件数 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        {CONTENT_CARDS.map((c) => {
          const n = counts[c.slug]
          return (
            <a key={c.slug} href={`/admin/collections/${c.slug}`} style={{ ...card, textDecoration: "none", color: "inherit" }}>
              <div style={{ fontSize: 12, color: "var(--theme-elevation-500)" }}>{c.label}</div>
              <div style={{ fontSize: 26, fontWeight: 600 }}>{n === undefined || n < 0 ? "—" : n}</div>
            </a>
          )
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* ② リードパイプライン */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <strong>リード ({totalLeads})</strong>
            <a href="/admin/collections/leads" style={{ fontSize: 12 }}>すべて見る →</a>
          </div>
          {totalLeads === 0 ? (
            <p style={{ fontSize: 13, color: "var(--theme-elevation-500)" }}>まだリードがありません。</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(STAGE_LABELS).map(([k, label]) => (
                <li key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--theme-elevation-600)" }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{leadsByStage[k] ?? 0}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ③ 直近の監査ログ */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <strong>最近の変更</strong>
            <a href="/admin/collections/audit-logs" style={{ fontSize: 12 }}>監査ログ →</a>
          </div>
          {recent.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--theme-elevation-500)" }}>まだ変更履歴がありません。</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              {recent.map((r, i) => (
                <li key={i} style={{ fontSize: 12, color: "var(--theme-elevation-600)" }}>
                  <span style={{ fontWeight: 600 }}>{r.collection}</span> · {r.action} ·{" "}
                  {r.userEmail ?? "system"} ·{" "}
                  {r.createdAt ? new Date(r.createdAt).toLocaleString("ja-JP") : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ④ 新規作成ショートカット */}
        <div style={card}>
          <strong style={{ display: "block", marginBottom: 12 }}>新規作成</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { slug: "posts", label: "+ 記事" },
              { slug: "works", label: "+ 実績" },
              { slug: "team-members", label: "+ メンバー" },
              { slug: "testimonials", label: "+ お客様の声" },
              { slug: "pages", label: "+ ページ" },
            ].map((q) => (
              <a
                key={q.slug}
                href={`/admin/collections/${q.slug}/create`}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  border: "1px solid var(--theme-elevation-200)",
                  borderRadius: 6,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                {q.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
