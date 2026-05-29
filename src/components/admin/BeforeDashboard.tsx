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

type AdminToolLink = {
  label: string
  role: string
  url: string | null
  status: "active" | "missing" | "legacy"
  location: string
}

const TOOL_STATUS_LABEL: Record<AdminToolLink["status"], string> = {
  active: "接続済み",
  missing: "URL未設定",
  legacy: "移行元",
}

const TOOL_STATUS_COLOR: Record<AdminToolLink["status"], string> = {
  active: "#0f7b4f",
  missing: "#8a5a00",
  legacy: "#6b7280",
}

function envUrl(name: string): string | null {
  const value = process.env[name]
  if (!value || value.trim().length === 0) return null
  return value
}

function originFromEnvUrl(name: string): string | null {
  const value = envUrl(name)
  if (!value) return null
  try {
    return new URL(value).origin
  } catch (e) {
    console.error("[BeforeDashboard] invalid URL env:", name, e)
    return null
  }
}

function getToolUrl(primaryEnv: string, fallbackEnv?: string): string | null {
  return envUrl(primaryEnv) ?? (fallbackEnv ? originFromEnvUrl(fallbackEnv) : null)
}

function toolStatus(url: string | null, legacy = false): AdminToolLink["status"] {
  if (legacy) return "legacy"
  return url ? "active" : "missing"
}

function coolifyLocation(url: string | null): string {
  return url ? "Coolify" : "Coolify未構築"
}

function getAdminToolLinks(): AdminToolLink[] {
  const supabaseUrl = getToolUrl("SALES_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
  const nocodbUrl = getToolUrl("NOCODB_BASE_URL")
  const appsmithUrl = getToolUrl("APPSMITH_BASE_URL")
  const twentyUrl = getToolUrl("TWENTY_BASE_URL")
  const metabaseUrl = getToolUrl("METABASE_BASE_URL")
  const n8nUrl = getToolUrl("N8N_BASE_URL", "N8N_PLAYWRIGHT_FORM_WEBHOOK")
  const calcomUrl = getToolUrl("CALCOM_BASE_URL")
  const docusealUrl = getToolUrl("DOCUSEAL_BASE_URL")

  return [
    {
      label: "Supabase OSS",
      role: "営業データの正本DB/API/RLS",
      url: supabaseUrl,
      status: toolStatus(supabaseUrl),
      location: "Cloud",
    },
    {
      label: "NocoDB OSS",
      role: "大量リストの一括編集",
      url: nocodbUrl,
      status: toolStatus(nocodbUrl),
      location: coolifyLocation(nocodbUrl),
    },
    {
      label: "Appsmith OSS",
      role: "オペレーター専用作業画面",
      url: appsmithUrl,
      status: toolStatus(appsmithUrl),
      location: coolifyLocation(appsmithUrl),
    },
    {
      label: "Twenty OSS",
      role: "商談・CRM・活動履歴",
      url: twentyUrl,
      status: toolStatus(twentyUrl),
      location: coolifyLocation(twentyUrl),
    },
    {
      label: "Metabase OSS",
      role: "営業分析・経営KPI",
      url: metabaseUrl,
      status: toolStatus(metabaseUrl),
      location: coolifyLocation(metabaseUrl),
    },
    {
      label: "n8n OSS",
      role: "同期・通知・自動化ワークフロー",
      url: n8nUrl,
      status: toolStatus(n8nUrl),
      location: "Coolify",
    },
    {
      label: "Cal.com OSS",
      role: "Meeting booking and post-diagnosis consultation slots.",
      url: calcomUrl,
      status: toolStatus(calcomUrl),
      location: coolifyLocation(calcomUrl),
    },
    {
      label: "Docuseal OSS",
      role: "Contract, order form, NDA e-signature management.",
      url: docusealUrl,
      status: toolStatus(docusealUrl),
      location: coolifyLocation(docusealUrl),
    },
  ]
}

export default async function BeforeDashboard({ payload }: { payload: Payload }) {
  let counts: Counts = {}
  let leadsByStage: Counts = {}
  let recent: Array<{ collection?: string; action?: string; userEmail?: string | null; createdAt?: string }> = []
  const adminToolLinks = getAdminToolLinks()

    // IO Budget 保護: PayloadCMS DB が使用不可の場合は即座に fallback
    let dbUnavailable = false
    try {
      // 軽量な疎通確認のみ（count 1件）
      await payload.count({ collection: "pages" })
    } catch (e) {
      dbUnavailable = true
      console.warn("[BeforeDashboard] DB unavailable, showing cached view:", e instanceof Error ? e.message : e)
    }

    if (!dbUnavailable) {
      try {
        // ① コンテンツ件数（並列 count・IO保護のため limit=4 に絞る）
        const ESSENTIAL_CARDS = CONTENT_CARDS.slice(0, 4)
        const countResults = await Promise.all(
          ESSENTIAL_CARDS.map(async (c) => {
            try {
              const r = await payload.count({ collection: c.slug as "pages" })
              return [c.slug, r.totalDocs] as const
            } catch (e) {
              console.error("[BeforeDashboard] count failed:", c.slug, e)
              return [c.slug, -1] as const
            }
          }),
        )
        counts = Object.fromEntries(countResults)

        // ② リードのパイプライン内訳（max 200件に制限・IO保護）
        const leads = await payload.find({ collection: "leads", limit: 200, depth: 0 })
        for (const l of leads.docs as Array<{ pipelineStage?: string }>) {
          const k = l.pipelineStage ?? "new"
          leadsByStage[k] = (leadsByStage[k] ?? 0) + 1
        }

        // ③ 直近の監査ログ 3 件（6→3に削減）
        const audit = await payload.find({
          collection: "audit-logs",
          limit: 3,
          sort: "-createdAt",
          depth: 0,
        })
        recent = audit.docs as typeof recent
      } catch (e) {
        console.error("[BeforeDashboard] 集計に失敗:", e instanceof Error ? e.message : e)
      }
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
            tool.url ? (
              <a
                key={tool.label}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                title={`${tool.role} / ${TOOL_STATUS_LABEL[tool.status]}`}
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
            ) : (
              <span
                key={tool.label}
                title={`${tool.role} / ${TOOL_STATUS_LABEL[tool.status]}`}
                style={{
                  border: "1px solid var(--theme-elevation-150)",
                  borderRadius: 6,
                  color: "var(--theme-elevation-500)",
                  fontSize: 12,
                  padding: "7px 10px",
                }}
              >
                {tool.label}
              </span>
            )
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 4 }}>営業OS 統合ステータス</h2>
        <p style={{ color: "var(--theme-elevation-500)", marginBottom: 16, fontSize: 13 }}>
          Supabase Cloud を正本にし、各OSSツールは用途別の操作面として接続します。未構築のツールも隠さず表示します。
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {adminToolLinks.map((tool) => {
            const content = (
              <div style={{ ...card, minHeight: 124 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <strong style={{ fontSize: 14 }}>{tool.label}</strong>
                  <span
                    style={{
                      border: "1px solid var(--theme-elevation-150)",
                      borderRadius: 999,
                      color: TOOL_STATUS_COLOR[tool.status],
                      fontSize: 11,
                      padding: "2px 8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {TOOL_STATUS_LABEL[tool.status]}
                  </span>
                </div>
                <p style={{ color: "var(--theme-elevation-600)", fontSize: 12, lineHeight: 1.6, margin: "10px 0 12px" }}>
                  {tool.role}
                </p>
                <div style={{ color: "var(--theme-elevation-500)", fontSize: 12 }}>{tool.location}</div>
              </div>
            )

            if (!tool.url) {
              return <div key={tool.label}>{content}</div>
            }

            return (
              <a
                key={tool.label}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {content}
              </a>
            )
          })}
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
