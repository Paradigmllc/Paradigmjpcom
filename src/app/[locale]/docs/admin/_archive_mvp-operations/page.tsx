/**
 * /[locale]/docs/admin/mvp-operations — B36 MVP 営業フロー管理画面 quick reference.
 *
 * 設計 (2026-05-10 ユーザー指示):
 *   「営業フローの管理画面がメモしなくても分かるように /docs などからアクセスしやすく」
 *
 * 本ページの方針:
 *   - **公開可能な情報のみ** 記載 (URL / 機能説明 / endpoint 一覧)
 *   - 認証情報 (Basic Auth pass / API secret) は **記載しない** —
 *     `~/.claude/projects/D--dev-appexxme/memory/reference_b36_mvp_secrets.md` 参照
 *   - 実 admin UI へのリンクは Basic Auth gate 配下 (paradigmjp.com/sales/{region}/mvp)
 *   - 各 region の URL を一覧表示 → memo 不要で全 region 監視 UI に到達可能
 *
 * 注: 本ページ自体は public 可視 (ヘッダー/フッター付き通常ページ)・robots.txt 対象外推奨.
 */

import Link from "next/link"
import type { Metadata } from "next"

export const dynamic = "force-static"
export const revalidate = 3600 // 1h cache

export const metadata: Metadata = {
  title: "MVP 営業フロー 管理画面 | Paradigm 運用 docs",
  description: "B36 MVP 自動営業パイプラインの監視 UI / endpoint reference / 障害対応 runbook の早見表",
  robots: { index: false, follow: false }, // 内部運用 docs (検索除外)
}

const REGIONS: Array<{ code: string; label: string; lang: string }> = [
  { code: "ja",      label: "🇯🇵 日本",            lang: "ja" },
  { code: "en",      label: "🇺🇸 グローバル英語",     lang: "en" },
  { code: "ko",      label: "🇰🇷 韓国",            lang: "ko" },
  { code: "zh",      label: "🇨🇳 中国",            lang: "zh" },
  { code: "europe",  label: "🇪🇺 ヨーロッパ",       lang: "de" },
  { code: "es",      label: "🇪🇸 スペイン語圏",     lang: "es" },
  { code: "pt",      label: "🇧🇷 ポルトガル語圏",    lang: "pt" },
  { code: "ru",      label: "🇷🇺 ロシア語圏",       lang: "ru" },
  { code: "ar",      label: "🇸🇦 アラビア語圏",     lang: "ar" },
  { code: "sea",     label: "🌏 東南アジア",         lang: "vi" },
  { code: "africa",  label: "🌍 アフリカ",           lang: "en" },
  { code: "others",  label: "🌐 その他",             lang: "en" },
]

const PAGE_TYPES: Array<{ slug: string; label: string; description: string }> = [
  { slug: "mvp",       label: "監視ダッシュボード",  description: "Run 状態 / 直近活動 / 主要 KPI のサマリ表示" },
  { slug: "mvp/runs",  label: "Run 一覧",         description: "全 run の status / template / Dify cost / form_submit 結果一覧" },
  { slug: "mvp/stats", label: "KPI ダッシュボード", description: "Funnel metrics / quotas / 日次 throughput / active campaigns" },
]

const KEY_ENDPOINTS = [
  { method: "GET",  path: "/api/mvp/runs?region=&limit=", desc: "Run 一覧 (UI フェッチ・X-MVP-Secret)" },
  { method: "POST", path: "/api/mvp/generate-report", desc: "個別 lead に対する診断レポート生成 (X-MVP-Secret)" },
  { method: "POST", path: "/api/mvp/submit-form", desc: "form 文面生成 + violation check + Playwright dispatch" },
  { method: "GET",  path: "/api/mvp/cron-pickup?step=report|form", desc: "cron pickup (n8n 5min/10min 自動)" },
  { method: "POST", path: "/api/mvp/runs/[id]/stage2", desc: "反応者向け Stage 2 brief 生成 → Slack 投影" },
  { method: "POST", path: "/api/mvp/runs/[id]/retry", desc: "dead_letter / failed_* 再投入" },
  { method: "GET",  path: "/api/persona/[slug]", desc: "Persona-as-Data 取得 (Dify が自動 fetch)" },
  { method: "GET",  path: "/api/mvp/track/[kind]/[token]", desc: "pixel / cta / optout (公開・HMAC token)" },
  { method: "POST", path: "/api/mvp/right-to-be-forgotten", desc: "個人情報削除 (個人情報保護法 / GDPR)" },
]

export default function MvpOperationsDocsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-paradigm-ink/60 mb-2">運用 docs / 内部</p>
        <h1 className="text-3xl md:text-4xl font-display text-paradigm-ink mb-3">
          MVP 営業フロー 管理画面
        </h1>
        <p className="text-sm text-paradigm-ink-soft leading-relaxed">
          B36 自動営業パイプラインの全 region 監視 UI ・主要 endpoint ・障害対応 runbook 早見表.
          認証情報は記載していません (memory 参照).
        </p>
      </div>

      {/* 全 region UI matrix */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-paradigm-ink mb-4">🌐 全 12 region 監視 UI</h2>
        <p className="text-xs text-paradigm-ink-soft mb-3">
          各 URL は Basic Auth gate (user: <code className="px-1 bg-paradigm-paper-deep rounded">paradigm</code> /
          pass: <code className="px-1 bg-paradigm-paper-deep rounded">memory 参照</code>).
          ブラウザで開く際は dialog でログイン情報を入力.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-paradigm-line">
            <thead className="bg-paradigm-paper-deep">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Region</th>
                {PAGE_TYPES.map((p) => (
                  <th key={p.slug} className="px-3 py-2 text-left font-medium">{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {REGIONS.map((r) => (
                <tr key={r.code} className="border-t border-paradigm-line">
                  <td className="px-3 py-2 font-medium">{r.label}</td>
                  {PAGE_TYPES.map((p) => (
                    <td key={p.slug} className="px-3 py-2">
                      <a
                        href={`/sales/${r.code}/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-paradigm-ink underline hover:text-paradigm-accent text-xs"
                      >
                        /sales/{r.code}/{p.slug}
                      </a>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 主要 endpoint */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-paradigm-ink mb-4">🔧 主要 API endpoint</h2>
        <p className="text-xs text-paradigm-ink-soft mb-3">
          全 endpoint は <code className="px-1 bg-paradigm-paper-deep rounded">X-MVP-Secret</code> header
          または <code className="px-1 bg-paradigm-paper-deep rounded">?secret=</code> query で認証.
          Secret 値は <code className="px-1 bg-paradigm-paper-deep rounded">~/.claude/projects/D--dev-appexxme/memory/reference_b36_mvp_secrets.md</code> 参照.
        </p>
        <div className="space-y-2">
          {KEY_ENDPOINTS.map((e, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border border-paradigm-line rounded">
              <code className={`text-xs font-mono px-2 py-0.5 rounded ${
                e.method === "GET" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20" :
                e.method === "POST" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20" : "bg-paradigm-paper-deep"
              } w-fit`}>
                {e.method}
              </code>
              <code className="text-xs font-mono flex-1 text-paradigm-ink">{e.path}</code>
              <span className="text-xs text-paradigm-ink-soft">{e.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5 layer architecture quick reference */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-paradigm-ink mb-4">🏛️ 5 Layer Architecture</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="p-3 border border-paradigm-line rounded">
            <div className="font-semibold mb-1">Memory</div>
            <div className="text-xs text-paradigm-ink-soft">Supabase (paradigm_personas + leads + cms_content_blocks + form_message_templates 240 row)</div>
          </div>
          <div className="p-3 border border-paradigm-line rounded">
            <div className="font-semibold mb-1">Brain</div>
            <div className="text-xs text-paradigm-ink-soft">Dify Cloud 4 workflow + DeepSeek V4 Context Cache</div>
          </div>
          <div className="p-3 border border-paradigm-line rounded">
            <div className="font-semibold mb-1">Persona</div>
            <div className="text-xs text-paradigm-ink-soft">/api/persona/[slug] + paradigm-advisor-{`{locale}`} (B2B 大人語彙ガイドライン構造的に強制)</div>
          </div>
          <div className="p-3 border border-paradigm-line rounded">
            <div className="font-semibold mb-1">Tool-use</div>
            <div className="text-xs text-paradigm-ink-soft">Hermes Agent (Phase 1・hermes.appexx.me)</div>
          </div>
          <div className="p-3 border border-paradigm-line rounded md:col-span-2">
            <div className="font-semibold mb-1">Execute</div>
            <div className="text-xs text-paradigm-ink-soft">n8n + Playwright + Crawlee + Crawl4AI (フォーム送信 / クロール / 動画レンダリング)</div>
          </div>
        </div>
      </section>

      {/* 障害対応 runbook */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-paradigm-ink mb-4">🚨 障害対応 quick runbook</h2>
        <table className="w-full text-sm border border-paradigm-line">
          <thead className="bg-paradigm-paper-deep">
            <tr><th className="px-3 py-2 text-left">症状</th><th className="px-3 py-2 text-left">対応</th></tr>
          </thead>
          <tbody className="text-xs">
            <tr className="border-t border-paradigm-line">
              <td className="px-3 py-2">paradigmjp.com 全体ダウン</td>
              <td className="px-3 py-2">Coolify 再 deploy → 解消しなければ Hetzner API で <code>paradigm-prod-01</code> の metrics 確認後に reboot/reset</td>
            </tr>
            <tr className="border-t border-paradigm-line">
              <td className="px-3 py-2">Dify Cloud 503</td>
              <td className="px-3 py-2">n8n が graceful fallback 設計 (本文 stub で送信継続) → Slack #all-paradigm 通知</td>
            </tr>
            <tr className="border-t border-paradigm-line">
              <td className="px-3 py-2">run が <code>form_submitting</code> で stuck</td>
              <td className="px-3 py-2">mvp_outreach_runs.error_log 確認 → <code>/api/mvp/runs/[id]/retry</code> で再投入</td>
            </tr>
            <tr className="border-t border-paradigm-line">
              <td className="px-3 py-2">LLM cost 暴騰</td>
              <td className="px-3 py-2"><code>/api/mvp/stats</code> で daily quota 確認 → cost-guard auto_pause 自動発火</td>
            </tr>
            <tr className="border-t border-paradigm-line">
              <td className="px-3 py-2">配信停止依頼</td>
              <td className="px-3 py-2"><code>POST /api/mvp/right-to-be-forgotten</code> {`{ action:"request_initiate", domain:"...", entity_id:"..." }`} → admin 確認 → admin_purge</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 関連 docs リンク */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-paradigm-ink mb-4">📚 詳細 docs</h2>
        <ul className="text-sm space-y-1 list-disc pl-5 text-paradigm-ink-soft">
          <li><code>D:/dev/appexxme/docs/knowledge/b36-mvp-operations-manual.md</code> — 取扱説明書 406 行 (運用手順 + 全 endpoint + 障害 runbook)</li>
          <li><code>D:/dev/paradigmjpcom/docs/audit/2026-05-10-holistic-e2e-audit.md</code> — Holistic E2E audit (production-ready 認定)</li>
          <li><code>D:/dev/paradigmjpcom/docs/refactor/b36-p7b-template-matrix-spec.md</code> — Phase 7-B 5 pitch_angles × 4 業種 matrix 設計</li>
          <li><code>D:/dev/paradigmjpcom/docs/refactor/elizaos-deferred-decision.md</code> — Persona-as-Data 採用理由 (ElizaOS 不採用)</li>
          <li><code>D:/dev/paradigmjpcom/docs/refactor/b36-p7c-6themes-figma-quality-spec.md</code> — 6 design themes Figma 級 spec</li>
          <li><code>~/.claude/projects/D--dev-appexxme/memory/reference_b36_mvp_secrets.md</code> — Basic Auth pass / API secret / Slack token (永久保存)</li>
        </ul>
      </section>

      {/* footer */}
      <div className="pt-6 border-t border-paradigm-line text-xs text-paradigm-ink-soft">
        最終更新: 2026-05-10 / B36-P7B holistic audit 後·
        <Link href="/" className="ml-2 underline hover:text-paradigm-accent">← Paradigm Home</Link>
      </div>
    </div>
  )
}
