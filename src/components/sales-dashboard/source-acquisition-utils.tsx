import type { SourceAcquisitionTechMetric } from "@/lib/sales/source-acquisition"

export type SortKey = "companyCount" | "detections" | "averageConfidence" | "technologyName"
export type SourceSortBy = "total_runs" | "success_rate" | "collected" | "missing" | "name_asc"

export const SOURCE_CATEGORY_MAP: Record<string, string> = {
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

export const SOURCE_ROLE_MAP: Record<string, string> = {
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
  steel: "CDPリモートブラウザによるSPAフォーム探索や保存用スクリーンショット撮影",
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

export function number(value: number): string {
  return new Intl.NumberFormat("ja-JP").format(value)
}

export function date(value: string | null): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function Tile({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string
  helper: string
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false" }>
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

export function TechRow({ tech }: { tech: SourceAcquisitionTechMetric }) {
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
