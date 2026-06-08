"use client"

import { useMemo, useState } from "react"
import { DatabaseZap, Filter, Layers3, Radar, Search, ShieldCheck } from "lucide-react"
import type {
  SourceAcquisitionSourceMetric,
  SourceAcquisitionSummary,
  SourceAcquisitionTechMetric,
} from "@/lib/sales/source-acquisition"

type SortKey = "companyCount" | "detections" | "averageConfidence" | "technologyName"

// 日本語のカテゴリーマッピング
const SOURCE_CATEGORY_MAP: Record<string, string> = {
  analysis: "診断ソース (分析)",
  list: "診断ソース (リスト収集)",
  list_source: "診断ソース (リスト収集)",
  outreach: "アプローチ自動化",
  orchestration: "オーケストレーション",
  post_outreach: "事後対応・CRM",
  crm_ops: "CRM・運用管理",
  asset: "アセット生成 (提案資料)",
  asset_generation: "アセット生成 (提案資料)",
  demo: "アセット生成 (デモサイト)",
  demo_site: "アセット生成 (デモサイト)",
  video: "アセット生成 (動画)",
  proxy: "プロキシ・通信制御",
}

// データソースごとの日本語の用途説明 (用途記述)
const SOURCE_ROLE_MAP: Record<string, string> = {
  pagespeed: "Core Web Vitalsおよび表示速度リスクをスキャンして改善優先度を判定",
  html_metadata: "HTMLのメタデータ（Title/Description/OGPなど）の不備や強みを分析",
  robots_sitemap: "robots.txt / sitemap.xml の配置状況から検索エンジン発見性を評価",
  security_headers_free: "HSTS, CSP, X-Frame-Options などのHTTPセキュリティヘッダーの脆弱性を診断",
  dataforseo: "ドメインのSEO評価、被リンク、検索トラフィック、Lighthouseスコアの取得",
  lighthouse_api: "Webサイトのパフォーマンス、アクセシビリティ、SEOスコアの詳細評価",
  wappalyzer: "ドメインで動作しているCMS、Webサーバー、アナリティクスなどの技術スタック判定",
  whatweb: "Webサーバーのヘッダーや特定ファイル等からの技術シグナル抽出",
  urlscan: "Webサイトの読み込みリソース安全性および外部リンクの信頼性スキャン",
  publicwww: "特定のトラッキングコードやスクリプトが埋め込まれているかを逆引き検索",
  ssllabs: "SSL/TLS証明書の強度、暗号化グレード、脆弱性の詳細分析",
  japan_market_audit: "特定商取引法に基づく表記、プライバシーポリシー、国内決済対応状況の法的監査",
  mozilla_observatory: "セキュリティヘッダーおよびSSL証明書の公開脆弱性診断",
  securitytrails: "DNS履歴、ドメイン所有権、IPアドレスの変遷履歴スキャン",
  shodan: "公開されているポート、サーバーのホスティング情報、セキュリティリスクの検出",
  gbizinfo: "経済産業省の法人データベース（gBizInfo）から実績・財務・認可情報を取得",
  apollo: "B2Bデータベース（Apollo）から企業プロファイルとキーパーソンの連絡先を取得",
  fumadata: "国内企業データベースから日本のターゲットの基本属性を収集",
  bizmap: "日本国内 of SMB（中小企業）データベースからリストを補強",
  houjin_bangou: "国税庁の法人番号公的データによる企業名・本店の名寄せと正規化",
  jgrants: "国の補助金データベースから提案可能な補助金・助成金の適合判定",
  apify: "SNSや特定Webサイトからのカスタムリスト・データスクレイピング",
  outscraper: "Googleマップ等のローカルビジネス情報・レビューの一括スクレイピング",
  google_places: "Google Places APIによる店舗の位置情報、口コミ、評価、MEOの課題診断",
  hunter: "対象ドメインに関連するメールパターンの抽出と連絡先発見",
  crawlee: "Webサイト内のリンク構造を再帰的に巡回し、問い合わせページを自動探索",
  crawl4ai: "LLMに最適化されたマークダウン抽出と問い合わせフォームの構造化検出",
  browserless: "SPAフォーム探索やスクリーンショット撮影用のリモートブラウザ実行",
  stagehand: "PlaywrightとLLMを用いて、問い合わせフォームを自律的に理解して入力・送信",
  mubeng: "クローラーやスクレイパーのアクセス遮断を防ぐIPローテーションプロキシ",
  browser_screenshot: "見込み客サイトの高解像度スクリーンショットを自動撮影しR2へ保存",
  camoufox: "ブラウザのフィンガープリントを偽装し、高度な検知を回避して検証アクセスを実行",
  playwright_stealth: "ステルスブラウザを使用して人間が確認したフォーム自動送信を実行",
  dify: "収集した企業カルテの事実を、相手に刺さる「痛みと損失仮説」にAI変換する中核",
  deepseek: "Difyの補助または個別文面作成時のAIコピーライティング",
  trigger_dev: "長時間ジョブ、バックグラウンドのクローラー、失敗時の再試行を制御するエンジン",
  chatwoot: "アプローチ送信後の返信タイムラインの一元管理とAI返信の下書き作成",
  calcom: "診断レポート閲覧後に見込み客が直接相談予約できるカレンダー機能",
  livekit: "商談時にリアルタイムでAIが会話支援・音声書き起こし・CRM同期を行う機能",
  hermes_slack: "送信前の人間によるダブルチェック承認通知およびエラーアラートのSlack通知",
  listmonk: "フォーム送信が不適切な場合や配信後のフォローアップ用のステップメール配信",
  smartlead: "ドメイン保護付きの自動フォローアップ営業メールシーケンス",
  resend: "トランザクションメールや営業通知メールの確真な配信",
  docsend: "送信した営業提案PDFの閲覧状況・ページ別滞在時間のトラッキング",
  twilio: "電話アプローチやIVR（音声自動応答）による自動コールフローの制御",
  serp_tavily: "検索結果の順位およびTavilyを用いたAIによる市場状況リサーチ",
  notion_mcp: "商談用の顧客ポータルや共有スペースの自動生成・同期",
  supabase_mcp: "NocoDBなどのスプレッドシートインターフェースとSupabaseの同期",
  directus: "診断結果や提案スライドの静的メッセージパーツ・アセットのCMS管理",
  keystatic: "提案先用のAstroデモサイトのコンテンツをGit経由で編集できる管理UI",
  chrome_mcp: "ローカルの検証用Chromeを操り、表示崩れや送信挙動をQA検証する機能",
  rsshub: "プレスリリース、採用情報、ニュースフィードの監視によるシグナル検知",
  wayback_machine: "Webサイトの過去バージョンと比較した更新頻度の診断",
  common_crawl: "Web全体の過去アーカイブから対象ドメインの履歴データをマイニング",
  tranco: "グローバルのWebアクセストップリストに載っているかのトラフィック規模判定",
  rapidapi: "ニッチな外部APIにフォールバック接続するための共通ゲートウェイ",
  google_crux: "Google Chromeのユーザー体験実データ（CrUX）から応答速度を診断",
  crunchbase_open_data: "Crunchbaseデータに基づく企業の資金調達ステージと競合分析",
  meta_ad_library: "競合のMeta/TikTok広告の出稿状況や本数に基づく動画提案の根拠化",
  cloudflare_radar: "インターネットトラフィックやセキュリティ脅威のトレンド診断",
  massdns: "大量のサブドメイン名が存在するかを高速に名前解決して調査",
  subfinder: "パッシブにサブドメインを探索し、隠れたWebサイトや脆弱性を発見",
  httpx: "サブドメイン群にWebサーバーが立っているかを高速ポートスキャンで確認",
  crtsh: "SSL証明書のログから過去に使用されたサブドメインの一覧を抽出",
  abstract_api: "会社データ、国、祝日、IPアドレスなどの一般属性データの補強",
  mozscape: "Moz独自のドメイン権威性（DA）スコアや被リンク数によるSEO評価",
  storeleads_cartleads: "Shopify等のECプラットフォーム検出と推計売上のコンテキスト補強",
  github_rest: "GitHubでの開発者採用やコード更新頻度からDX/IT投資意欲を診断",
  ahrefs_free: "Ahrefsの無料ツールを巡回して推定オーガニックトラフィック数を診断",
  similarweb_free_ui: "Similarwebの無料UIデータから月間訪問者数や流入元比率を推計",
  pytrends: "Google Trendsの検索キーワードから業界別の需要関心度を診断",
  myipms: "ホスティング事業者やIPアドレスから対象サイトの物理インフラ判定",
  whoogle: "Google検索API制限を避けるためのセルフホスト検索ゲートウェイ",
  overpass: "OpenStreetMapから周辺施設や競合店舗の位置関係を分析",
  yelp_graphql: "Yelpの店舗情報やローカル口コミを収集するAPI",
  rsshub_jobs: "Indeed等の求人サイトをRSSHubで巡回し、採用意欲の高い求人シグナルを検知",
  wellfound_crawl4ai: "Wellfoundに掲載されているスタートアップの求人募集・職種分析",
  whoisds_nrd: "新規取得ドメイン（WhoisDS）から創業まもないビジネスをリアルタイム検知",
  agency_directory: "Clutch等から外注先や開発会社をリスト化するリード収集",
  platform_experts: "Shopify/Webflow公式エキスパート登録リストからの見込み客獲得",
  theharvester: "OSINT技術によるターゲットメールアドレスとサブドメインの収集",
  hunter_snov: "Snov.io / Hunter.io による企業メールアドレス構造の特定",
  events_exhibitors: "展示会出展企業リストからのアプローチリード抽出",
  astro_demo: "見込み客ごとにAstroで生成したパーソナライズ改善後デモサイト",
  v0_demo: "v0を用いたデモコンポーネントの高速生成とAIモックアップ提示",
  gotenberg_slidev: "MarkdownからSlidev/Gotenbergを用いてPDF提案書を自動生成",
  openmontage: "OpenMontageを用いた提案動画 of 生成スケジューリングと配信",
  vast_runpod: "GPUサーバー（Vast.ai）を起動しComfyUIでの動画アセット生成を高速化",
  comfyui: "ComfyUIを用いたAI画像生成やアバター生成ワークフロー",
  hyperframes: "HTML/CSSを用いて動画コンポジションをレンダリングするエンジン",
  remotion_video: "Reactを用いて動画をプログラム生成・合成するレンダリングエンジン",
  faster_whisper: "Faster Whisperによる商談録音や動画音声の文字起こし",
  moviepy_short_video: "MoviePyによるパーソナライズ動画素材の結合と切り出し",
  liveportrait: "静止画アバターに表情や会話の動きを同期させる動画生成",
  tts_stack: "AI音声合成（ElevenLabs等）による自動提案動画ナレーション",
  ffcreator_editly_ffmpeg: "FFCreator/FFmpegによる最終動画アニメーション合成と圧縮",
  whisperx: "高精度な音声ワードアライメントと字幕用タイムコード生成",
  r2_video_delivery: "Cloudflare R2による大容量動画ファイルや提案資料の高速低コスト配信",
}

function number(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value)
}

function date(value: string | null): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function Tile({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string
  helper: string
  icon: typeof DatabaseZap
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-950">{value}</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">{helper}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white">
          <Icon size={17} aria-hidden />
        </span>
      </div>
    </div>
  )
}

export function SalesSourceAcquisitionPanel({ summary }: { summary: SourceAcquisitionSummary }) {
  // Wappalyzer技術側の絞り込み/ソート
  const [techCategory, setTechCategory] = useState("all")
  const [technology, setTechnology] = useState("all")
  const [techSortKey, setTechSortKey] = useState<SortKey>("companyCount")

  // 無料API/OSS側の検索・フィルター・ソート
  const [sourceSearchTerm, setSourceSearchTerm] = useState("")
  const [sourceCategoryFilter, setSourceCategoryFilter] = useState("all")
  const [sourceStatusFilter, setSourceStatusFilter] = useState("all")
  const [sourceSortBy, setSourceSortBy] = useState<"total_runs" | "success_rate" | "collected" | "missing" | "name_asc">("total_runs")

  const technologies = useMemo(
    () => summary.topTechnologies.map((item) => item.technologyName).sort((a, b) => a.localeCompare(b)),
    [summary.topTechnologies],
  )

  // 技術スタックフィルタリング
  const filteredTech = useMemo(() => {
    const rows = summary.topTechnologies.filter((item) => {
      const matchCategory = techCategory === "all" || item.category === techCategory
      const matchTechnology = technology === "all" || item.technologyName === technology
      return matchCategory && matchTechnology
    })
    return [...rows].sort((a, b) => {
      if (techSortKey === "technologyName") return a.technologyName.localeCompare(b.technologyName)
      return b[techSortKey] - a[techSortKey] || a.technologyName.localeCompare(b.technologyName)
    })
  }, [techCategory, techSortKey, summary.topTechnologies, technology])

  // 無料API/OSS側の検索・フィルタリング・ソート
  const filteredSources = useMemo(() => {
    let items = [...summary.sourceMetrics]

    // 1. カテゴリーフィルター
    if (sourceCategoryFilter !== "all") {
      items = items.filter((item) => {
        if (sourceCategoryFilter === "diagnostic") {
          return item.category === "analysis" || item.category === "list" || item.category === "list_source"
        }
        return item.category === sourceCategoryFilter
      })
    }

    // 2. ステータスフィルター
    if (sourceStatusFilter !== "all") {
      items = items.filter((item) => {
        const hasCollected = item.collected > 0
        const successRate = item.successRate
        if (sourceStatusFilter === "ready") {
          return successRate === 100
        }
        if (sourceStatusFilter === "partial") {
          return hasCollected && successRate < 100
        }
        if (sourceStatusFilter === "missing") {
          return !hasCollected
        }
        return true
      })
    }

    // 3. 検索クエリ
    if (sourceSearchTerm.trim() !== "") {
      const q = sourceSearchTerm.toLowerCase()
      items = items.filter((item) => {
        const role = SOURCE_ROLE_MAP[item.sourceSlug] || item.meaning || item.detail || ""
        const catLabel = SOURCE_CATEGORY_MAP[item.category] || item.category
        return (
          item.label.toLowerCase().includes(q) ||
          item.sourceSlug.toLowerCase().includes(q) ||
          role.toLowerCase().includes(q) ||
          catLabel.toLowerCase().includes(q)
        )
      })
    }

    // 4. ソート
    items.sort((a, b) => {
      if (sourceSortBy === "total_runs") {
        return b.total - a.total || a.label.localeCompare(b.label)
      }
      if (sourceSortBy === "success_rate") {
        return b.successRate - a.successRate || b.total - a.total || a.label.localeCompare(b.label)
      }
      if (sourceSortBy === "collected") {
        return b.collected - a.collected || a.label.localeCompare(b.label)
      }
      if (sourceSortBy === "missing") {
        const aMissing = a.missing + a.error
        const bMissing = b.missing + b.error
        return bMissing - aMissing || a.label.localeCompare(b.label)
      }
      if (sourceSortBy === "name_asc") {
        return a.label.localeCompare(b.label)
      }
      return 0
    })

    return items
  }, [summary.sourceMetrics, sourceSearchTerm, sourceCategoryFilter, sourceStatusFilter, sourceSortBy])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="取得ログ"
          value={number(summary.totalRuns)}
          helper={`${number(summary.sourceTypes)}種類 / ${number(summary.companiesMeasured)}社を計測`}
          icon={DatabaseZap}
        />
        <Tile
          label="取得成功率"
          value={`${summary.successRate}%`}
          helper={`成功 ${number(summary.collected)} / 未取得・エラー ${number(summary.missing + summary.error)}`}
          icon={ShieldCheck}
        />
        <Tile
          label="Wappalyzer検出"
          value={number(summary.techDetectionsTotal)}
          helper={`${number(summary.technologiesTotal)}技術 / ${number(summary.techCompaniesTotal)}社`}
          icon={Radar}
        />
        <Tile
          label="技術カテゴリ"
          value={number(summary.techCategories.length)}
          helper={summary.techCategories.slice(0, 4).join(" / ") || "まだ検出がありません"}
          icon={Layers3}
        />
      </div>

      {summary.errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
          {summary.errors.join(" / ")}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        {/* 無料API / OSS 取得元の成績セクション */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">無料API / OSS 取得元別の成績</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                PageSpeed、Wappalyzer、gBizInfo、フォーム探索などの取得成否を、企業カルテ単位で集計しています。
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700 whitespace-nowrap self-start">
              最新 {date(summary.latestMeasuredAt)}
            </span>
          </div>

          {/* 検索・絞り込み・ソート用コントロールバー */}
          <div className="mt-4 flex flex-col gap-3 border-b border-zinc-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {/* テキスト検索 */}
              <div className="relative flex-1 max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  value={sourceSearchTerm}
                  onChange={(e) => setSourceSearchTerm(e.target.value)}
                  placeholder="取得元名や用途で検索..."
                  className="w-full rounded border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-xs outline-none focus:border-zinc-500 placeholder-zinc-400"
                />
              </div>

              {/* 分類フィルター */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 shrink-0">分類:</span>
                <select
                  value={sourceCategoryFilter}
                  onChange={(e) => setSourceCategoryFilter(e.target.value)}
                  className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-zinc-500"
                >
                  <option value="all">すべて</option>
                  <option value="diagnostic">診断ソースのみ</option>
                  <option value="analysis">診断ソース (分析)</option>
                  <option value="list">診断ソース (リスト収集)</option>
                  <option value="outreach">アプローチ自動化</option>
                  <option value="orchestration">オーケストレーション</option>
                  <option value="video">アセット生成 (動画)</option>
                  <option value="demo">アセット生成 (デモサイト)</option>
                </select>
              </div>

              {/* ステータスフィルター */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 shrink-0">ステータス:</span>
                <select
                  value={sourceStatusFilter}
                  onChange={(e) => setSourceStatusFilter(e.target.value)}
                  className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-zinc-500"
                >
                  <option value="all">すべて</option>
                  <option value="ready">良好 (100%)</option>
                  <option value="partial">一部取得</option>
                  <option value="missing">未取得・エラー</option>
                </select>
              </div>
            </div>

            {/* ソート */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500 shrink-0">ソート:</span>
              <select
                value={sourceSortBy}
                onChange={(e) => setSourceSortBy(e.target.value as any)}
                className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-zinc-500"
              >
                <option value="total_runs">ログ数順 (多)</option>
                <option value="success_rate">成功率順</option>
                <option value="collected">成功数順</option>
                <option value="missing">未取得数順</option>
                <option value="name_asc">名称順</option>
              </select>
            </div>
          </div>

          {/* 実績データテーブル */}
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="min-w-[960px] w-full text-left table-fixed">
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[28%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">取得元</th>
                  <th className="px-3 py-2 font-medium">ステータス</th>
                  <th className="px-3 py-2 font-medium">分類</th>
                  <th className="px-3 py-2 font-medium">用途 / 役割</th>
                  <th className="px-3 py-2 text-right font-medium">ログ</th>
                  <th className="px-3 py-2 text-right font-medium">成功</th>
                  <th className="px-3 py-2 text-right font-medium">未取得</th>
                  <th className="px-3 py-2 text-right font-medium">成功率</th>
                  <th className="px-3 py-2 font-medium">最終取得</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredSources.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-10 text-center text-sm text-zinc-500">
                      条件に一致する取得実績データはありません。
                    </td>
                  </tr>
                ) : (
                  filteredSources.map((source) => {
                    // 日本語カテゴリー
                    const displayCategory = SOURCE_CATEGORY_MAP[source.category] || source.category

                    // 用途説明
                    const role = SOURCE_ROLE_MAP[source.sourceSlug] || source.meaning || source.detail || "営業診断のためのデータを取得"

                    // 計算ステータス
                    let statusLabel = "未接続"
                    let statusTone = "bg-zinc-100 text-zinc-700"
                    if (source.total > 0) {
                      if (source.successRate === 100) {
                        statusLabel = "良好"
                        statusTone = "bg-emerald-100 text-emerald-700"
                      } else if (source.collected > 0) {
                        statusLabel = "一部取得"
                        statusTone = "bg-amber-100 text-amber-800"
                      } else {
                        statusLabel = "未取得"
                        statusTone = "bg-rose-100 text-rose-700"
                      }
                    }

                    return (
                      <tr key={source.sourceSlug} className="hover:bg-zinc-50">
                        <td className="px-3 py-3">
                          <div className="font-medium text-zinc-950 truncate" title={source.label}>{source.label}</div>
                          <div className="mt-1 text-[11px] text-zinc-500 truncate" title={source.sourceSlug}>{source.sourceSlug}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 ${statusTone}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-zinc-600 truncate" title={displayCategory}>
                          {displayCategory}
                        </td>
                        <td className="px-3 py-3 max-w-xs">
                          <div className="text-xs text-zinc-500 line-clamp-2 leading-relaxed" title={role}>
                            {role}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-700">{number(source.total)}</td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums text-emerald-700">{number(source.collected)}</td>
                        <td className="px-3 py-3 text-right text-xs tabular-nums text-rose-700">{number(source.missing + source.error)}</td>
                        <td className="px-3 py-3 text-right text-xs font-semibold tabular-nums text-zinc-950">{source.successRate}%</td>
                        <td className="px-3 py-3 text-[11px] text-zinc-500 whitespace-nowrap">{date(source.lastMeasuredAt)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Wappalyzer技術スタック検出セクション */}
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Wappalyzer 技術スタック検出</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                JSON埋め込みではなくDB化済み。技術名・カテゴリ・信頼度で選択式ソートできます。
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="relative block">
                <Filter className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} aria-hidden />
                <select
                  value={techCategory}
                  onChange={(event) => setTechCategory(event.target.value)}
                  className="h-9 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-7 text-xs outline-none focus:border-zinc-500"
                  aria-label="技術カテゴリで絞り込み"
                >
                  <option value="all">全カテゴリ</option>
                  {summary.techCategories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <select
                value={technology}
                onChange={(event) => setTechnology(event.target.value)}
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs outline-none focus:border-zinc-500"
                aria-label="技術名で絞り込み"
              >
                <option value="all">全技術</option>
                {technologies.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={techSortKey}
                onChange={(event) => setTechSortKey(event.target.value as SortKey)}
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs outline-none focus:border-zinc-500"
                aria-label="技術スタックの並び替え"
              >
                <option value="companyCount">企業数順</option>
                <option value="detections">検出数順</option>
                <option value="averageConfidence">信頼度順</option>
                <option value="technologyName">技術名順</option>
              </select>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
            <table className="min-w-[680px] w-full text-left">
              <thead className="bg-zinc-50 text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">技術</th>
                  <th className="px-3 py-2 font-medium">カテゴリ</th>
                  <th className="px-3 py-2 text-right font-medium">企業数</th>
                  <th className="px-3 py-2 text-right font-medium">検出数</th>
                  <th className="px-3 py-2 text-right font-medium">信頼度</th>
                  <th className="px-3 py-2 font-medium">最終検出</th>
                </tr>
              </thead>
              <tbody>
                {filteredTech.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-zinc-500">
                      条件に一致する技術スタックがありません。
                    </td>
                  </tr>
                ) : (
                  filteredTech.map((tech) => <TechRow key={`${tech.technologySlug}:${tech.category}`} tech={tech} />)
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

function TechRow({ tech }: { tech: SourceAcquisitionTechMetric }) {
  return (
    <tr className="border-t border-zinc-100">
      <td className="px-3 py-3">
        <div className="font-medium text-zinc-950">{tech.technologyName}</div>
        <div className="mt-1 text-[11px] text-zinc-500">{tech.technologySlug}</div>
      </td>
      <td className="px-3 py-3 text-xs text-zinc-600">{tech.category}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-950">{number(tech.companyCount)}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-700">{number(tech.detections)}</td>
      <td className="px-3 py-3 text-right text-xs tabular-nums text-zinc-700">{tech.averageConfidence}%</td>
      <td className="px-3 py-3 text-xs text-zinc-500">{date(tech.lastDetectedAt)}</td>
    </tr>
  )
}
