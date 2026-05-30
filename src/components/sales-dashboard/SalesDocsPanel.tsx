"use client"

import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  Hand,
  ListChecks,
  MailCheck,
  Settings2,
  Sparkles,
} from "lucide-react"
import type { SalesDashboardData } from "@/lib/sales/dashboard"
import { formatNumber } from "./SalesCommandPanels"

const DAILY_FLOW = [
  {
    title: "1. CSV / NocoDBでリード投入",
    body: "Apollo、Fumadata、BIZMap、手元CSVなどのリストは、最終的にSupabaseのsales_companiesへ入れます。Twentyへ直接CSVを入れる運用は正本が分散するので避けます。",
  },
  {
    title: "2. 企業カルテ生成",
    body: "投入後にenrichment jobが作られ、Crawl4AI、PageSpeed、Wappalyzer、gBizInfo、Google Places、Dify診断などの結果をmeta/source_runsへ集約します。",
  },
  {
    title: "3. 診断レポートとAstroデモ生成",
    body: "企業カルテをもとにNext.js診断レポートと、Web制作提案用の差し替えデモURLを生成します。URLはTwenty HOME項目にも同期されます。",
  },
  {
    title: "4. Twentyで営業管理",
    body: "営業担当はTwentyをCRMとして見ます。企業ページでは診断レポートURL、フォームURL、推奨商材、カルテ要約、商談を確認します。",
  },
  {
    title: "5. フォーム営業は承認ゲート経由",
    body: "Difyが文面を生成し、フォームURLの信頼度やCAPTCHA/SPA判定を見ます。初回ライブ送信5件と危険判定はAppsmith/手動確認に回ります。",
  },
  {
    title: "6. 商談化後はCal.com / Docusealへ",
    body: "商談予約はCal.com、契約書はDocusealに集約し、WebhookでSupabaseへ戻します。分析はMetabaseで見ます。",
  },
]

const TOOL_ROLES = [
  ["Supabase OSS", "SSOT", "営業データ、企業カルテ、ジョブ、Webhook、同期ログの正本。"],
  ["NocoDB OSS", "一括編集", "CSV投入後の重複整理、ステータス一括変更、リスト確認。"],
  ["Twenty OSS", "CRM", "企業個別ページ、商談、担当、活動履歴。企業カルテの閲覧先。"],
  ["Appsmith OSS", "オペレーター画面", "初回送信承認、フォームURL確認、CAPTCHA/SPAなどの手動処理。"],
  ["Metabase OSS", "分析", "返信率、商談化率、ソース別成績、担当別KPI。"],
  ["n8n OSS", "自動化", "ジョブ起動、通知、外部API連携、Slack連携。"],
  ["Cal.com OSS", "商談予約", "予約イベントをSupabaseに戻す。"],
  ["Docuseal OSS", "契約", "契約書ステータスをSupabaseに戻す。"],
]

const AUTOMATION_BOUNDARIES = [
  "CSV投入とSupabase登録は自動化済み。ただし列名が未知の場合はCSVテンプレへ合わせる。",
  "企業カルテ生成、診断レポートURL、AstroデモURL、Twenty同期は自動導線あり。",
  "フォーム営業はdry-runと手動キューが基本。初回5件のライブ送信は必ず承認待ち。",
  "CAPTCHA、ログイン必須フォーム、強いSPAフォーム、法務・業種リスクがあるフォームは人間確認。",
  "NotionはSSOTから外す。顧客共有ページや個別プロジェクトのポータル用途に限定する。",
]

const OPERATION_GAPS = [
  {
    status: "manual",
    title: "初回ライブ送信の人間承認",
    body: "意図的に残している安全ゲートです。完全自動送信へ進める前に、文面品質・苦情率・フォーム判定精度を確認します。",
  },
  {
    status: "config",
    title: "外部APIキーとプロキシ残量",
    body: "Dify、DataForSEO、Google Places、Apollo、Browserless、プロキシは環境変数と残量に依存します。未設定でもシステムは落ちず、取得状況にmissingとして出ます。",
  },
  {
    status: "ops",
    title: "大量送信時のレート制御",
    body: "初期は安全側です。Smartlead/Listmonk/Resend/Twilioを本格送信に使う前に、ドメインウォームアップと送信上限をMetabaseで監視します。",
  },
  {
    status: "done",
    title: "Coolifyログイン不能問題",
    body: "UIログインに依存しない `scripts/sales-os-no-login-deploy.mjs` を追加済みです。API経由でデプロイ、Supabase商品反映、URL確認まで実行できます。",
  },
]

const CONTENT_ASSET_LABELS: Record<string, string> = {
  diagnostic_report: "診断レポート (Next.js)",
  astro_demo_site: "デモサイト (Astro)",
  sales_deck: "営業資料 (Slidev/Gotenberg)",
  sales_video: "動画 (ComfyUI/HyperFrames)",
}

const CUSTOMER_SUCCESS_FLOW = [
  "入口は sales_companies.deal_stage = 成約、Docuseal signed webhook、または /api/sales/customer-success/handoff。",
  "Supabaseで sales_customers と sales_contracts を作成し、契約・顧客運用の正本を切り替える。",
  "Notion顧客共有ページを作成し、顧客とのやり取り・素材・納品物のポータルにする。",
  "Twenty HOMEへ顧客共有Notion URL、契約名、Cal.com、Docuseal状況を投影する。",
]

function StepCard({ title, body, index }: { title: string; body: string; index: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-xs font-bold text-white">
          {index + 1}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
          <p className="mt-2 text-xs leading-6 text-zinc-600">{body}</p>
        </div>
      </div>
    </div>
  )
}

function GapIcon({ status }: { status: string }) {
  if (status === "done") return <CheckCircle2 size={16} className="text-emerald-600" aria-hidden />
  if (status === "manual") return <Hand size={16} className="text-amber-700" aria-hidden />
  return <AlertTriangle size={16} className="text-zinc-500" aria-hidden />
}

export function SalesDocsPanel({ data }: { data: SalesDashboardData }) {
  const activeTools = data.toolConnections.filter((tool) => tool.status === "active").length
  const pendingJobs = data.enrichmentJobs.filter((job) => job.status === "queued" || job.status === "running").length
  const contentTemplates = data.contentTemplates

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-zinc-500">
              <BookOpen size={15} aria-hidden />
              営業OS 運用Docs
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal text-zinc-950">基本方針</h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-zinc-600">
              Supabaseを唯一の正本にして、TwentyはCRM、NocoDBは一括作業場、Appsmithは手動承認、Metabaseは分析、
              n8nは自動化として使います。営業担当は原則Twentyを見ればよく、管理者だけがこの司令塔でジョブと統合状態を確認します。
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-3 gap-2">
            <div className="rounded-lg bg-zinc-50 p-3">
              <div className="text-xs text-zinc-500">リード</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{formatNumber(data.kpis.totalLeads)}</div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3">
              <div className="text-xs text-zinc-500">統合</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{activeTools}/{data.toolConnections.length}</div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3">
              <div className="text-xs text-zinc-500">生成中</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{pendingJobs}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} aria-hidden />
              <h2 className="text-sm font-semibold text-zinc-950">成果物テンプレート基盤</h2>
            </div>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-zinc-600">
              診断レポート、Astroデモ、営業資料、営業動画は同じ企業カルテを使い、Difyが言語・業界・商材・訴求・成果物タイプから最適なテンプレートを選びます。
              初期版は日本語と英語を優先し、数十から数百の組み合わせをSupabaseに保存できる構成です。
            </p>
            {contentTemplates.fallbackUsed && (
              <p className="mt-2 text-xs leading-6 text-amber-700">
                DBテーブルが未適用、または未接続の場合でも、アプリ内蔵テンプレートで選定ロジックは継続します。migration_022適用後はSupabase SSOTに切り替わります。
              </p>
            )}
          </div>
          <div className="rounded-lg bg-zinc-50 p-4 text-right">
            <div className="text-xs text-zinc-500">テンプレート数</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(contentTemplates.total)}</div>
            <div className="mt-1 text-xs text-zinc-500">{contentTemplates.fallbackUsed ? "Bundled fallback" : "Supabase SSOT"}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(CONTENT_ASSET_LABELS).map(([key, label]) => (
            <div key={key} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <div className="text-sm font-semibold text-zinc-950">{label}</div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">
                {formatNumber(contentTemplates.byAssetType[key] ?? 0)}
              </div>
              <p className="mt-2 text-xs leading-6 text-zinc-600">
                Difyのテンプレ選定APIから呼び出し、n8nが生成・保存・Slack承認へつなぎます。
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-950">言語別</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(contentTemplates.byLocale).map(([locale, count]) => (
                <span key={locale} className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700">
                  {locale}: {formatNumber(count)}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-zinc-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-950">Dify / n8n の判断順</h3>
            <p className="mt-2 text-xs leading-6 text-zinc-600">
              1. 対象言語、2. 業界、3. 商材、4. 成果物タイプ、5. 訴求角度、6. 企業カルテの痛み根拠の順にスコアリングします。
              人間判断が必要な場合はSlackとAppsmithの承認キューに回します。
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <ListChecks size={16} aria-hidden />
            <h2 className="text-sm font-semibold text-zinc-950">実務フロー</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {DAILY_FLOW.map((step, index) => (
              <StepCard key={step.title} title={step.title} body={step.body} index={index} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Database size={16} aria-hidden />
              <h2 className="text-sm font-semibold text-zinc-950">データの流れ</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm text-zinc-700">
              <div className="flex items-center gap-2"><span>CSV / NocoDB</span><ArrowRight size={14} /><span>Supabase</span></div>
              <div className="flex items-center gap-2"><span>Supabase</span><ArrowRight size={14} /><span>診断/カルテ/デモ</span></div>
              <div className="flex items-center gap-2"><span>Supabase</span><ArrowRight size={14} /><span>Twenty / Metabase</span></div>
              <div className="flex items-center gap-2"><span>フォーム候補</span><ArrowRight size={14} /><span>Appsmith承認</span></div>
              <div className="flex items-center gap-2"><span>商談/契約</span><ArrowRight size={14} /><span>Cal.com / Docuseal</span></div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <MailCheck size={16} aria-hidden />
              <h2 className="text-sm font-semibold text-zinc-950">フォーム営業の安全ルール</h2>
            </div>
            <ul className="mt-4 space-y-3 text-xs leading-6 text-zinc-600">
              {AUTOMATION_BOUNDARIES.map((item) => (
                <li key={item} className="flex gap-2">
                  <CheckCircle2 size={14} className="mt-1 shrink-0 text-emerald-600" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Settings2 size={16} aria-hidden />
          <h2 className="text-sm font-semibold text-zinc-950">各OSS/APIの役割</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {TOOL_ROLES.map(([name, role, detail]) => (
            <div key={name} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <div className="text-sm font-semibold text-zinc-950">{name}</div>
              <div className="mt-1 text-xs font-semibold text-zinc-500">{role}</div>
              <p className="mt-3 text-xs leading-6 text-zinc-600">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={16} aria-hidden />
          <h2 className="text-sm font-semibold text-zinc-950">成約後パイプライン</h2>
        </div>
        <p className="mt-2 text-sm leading-7 text-zinc-600">
          成約後はNotionをSSOTに戻さず、顧客共有ページとしてだけ使います。正本はSupabase、営業担当の閲覧面はTwenty HOMEです。
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {CUSTOMER_SUCCESS_FLOW.map((step, index) => (
            <div key={step} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <div className="text-xs font-semibold text-zinc-500">STEP {index + 1}</div>
              <p className="mt-2 text-sm leading-6 text-zinc-700">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <FileText size={16} aria-hidden />
          <h2 className="text-sm font-semibold text-zinc-950">実務運用面の実装漏れ監査</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {OPERATION_GAPS.map((item) => (
            <div key={item.title} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
              <div className="flex items-start gap-2">
                <GapIcon status={item.status} />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-950">{item.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-zinc-600">{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
