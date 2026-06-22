export type ReportLang = "ja" | "en" | "ko" | "zh" | "de" | "fr" | "es" | "pt" | "ru" | "ar" | "vi" | "id"

export type ReportCopy = {
  brand: string
  privateReport: string
  validity: string
  heroKicker: string
  heroLead: string
  primaryCta: string
  secondaryCta: string
  evidenceReady: string
  sourceCoverage: string
  monthlyLoss: string
  confidence: string
  currentState: string
  improvedState: string
  diagnosticSurface: string
  priorityFindings: string
  businessImpact: string
  firstMove: string
  whyItMatters: string
  evidence: string
  recommendation: string
  roadmap: string
  dataAppendix: string
  sourceMeaning: string
  sourceNext: string
  sourceMissing: string
  templateDirection: string
  qualityBar: string
  finalHeading: string
  finalBody: string
  emailSubject: string
  competitorBenchmark: string
  yourSite: string
  industryAvg: string
  topCompetitors: string
  roiTitle: string
  paybackPeriod: string
  recoveredTwelveMonths: string
  roiLabel: string
  faqTitle: string
  readMore: string
}

export interface FaqItem {
  q: string
  a: string
}

export const REPORT_FAQS: Record<"ja" | "en", Record<string, FaqItem[]>> = {
  ja: {
    website_diagnostic: [
      { q: "既存のシステムやドメインを捨てる必要がありますか？", a: "いいえ。既存の環境はそのままで、改善した表示部分のみをステージング環境で構築・検証し、本番移行するためダウンタイムは発生しません。" },
      { q: "Lighthouseの表示速度スコア85点以上は本当に保証されますか？", a: "はい。私たちのAstro/Next.js最適化パッケージはLighthouseモバイルスコア85点以上を品質保証しており、未達の場合はパフォーマンス報酬を全額返金いたします。" },
      { q: "どのようなプロセスで進めますか？", a: "現状分析、Astro/Next.jsでのビジュアル制作、ステージングでの検証、ドメイン切り替えの順で進行し、最短2週間で完了します。" }
    ],
    japan_entry: [
      { q: "日本に現地法人がなくても営業を開始できますか？", a: "はい。日本法人を設立する前に、特商法・APPIに準拠したローカライズLPの構築と、決済代行のローカライズを完了させて営業検証を開始できます。" },
      { q: "特商法（特定商取引法に基づく表記）はなぜ必須なのですか？", a: "日本の商慣習および法律により、ウェブサイト上で販売や予約を行う際は運営元の情報開示が義務付けられており、これが無いと日本の買い手は警戒して購入しません。" },
      { q: "ローカライズにかかる期間はどれくらいですか？", a: "ドキュメントと基本LPの構築を含め、キックオフから通常2〜4週間で日本向けの公開が可能です。" }
    ],
    video_subscription: [
      { q: "動画サブスクの毎月の本数は変更できますか？", a: "はい。キャンペーンやプロモーションのスケジュールに応じて、月ごとの制作本数を柔軟に調整できるプランをご用意しています。" },
      { q: "自社で撮影した素材がなくても動画は作れますか？", a: "はい。ComfyUIやHyperFrames等のAI技術とストックフッテージを組み合わせ、高品質な営業用動画をアセットなしから量産可能です。" },
      { q: "どのような動画タイプに対応していますか？", a: "リード獲得用のデモ動画、営業フォロー用のショート解説動画、カスタマーサクセス向けの製品チュートリアル動画に特化しています。" }
    ],
    outreach: [
      { q: "フォーム営業の自動化はスパム判定されませんか？", a: "私たちは闇雲なスパム送信は行いません。事前分類フィルタを使い、課題が明確なターゲット企業にのみ、パーソナライズされた丁寧な文面で送信します。" },
      { q: "配信先のリストはどのように用意しますか？", a: "gBizInfoやOverpass等のオープンデータをスクレイピング・精査し、御社のターゲット業界に完全に一致するリードリストを自動構築します。" },
      { q: "送信結果のレポーティングはありますか？", a: "はい。MetabaseダッシュボードおよびTwenty CRMと完全連携し、送信ステータスや返信率をリアルタイムに可視化します。" }
    ],
    security: [
      { q: "セキュリティヘッダーの適用でサイトが壊れることはありませんか？", a: "CSP（コンテンツセキュリティポリシー）などの設定は、慎重にステージングでテストした上で適用するため、既存機能に影響を与えません。" },
      { q: "SSL証明書の更新エラーはなぜ発生するのですか？", a: "DNSの不整合や自動更新スクリプトの不具合が原因であることが多く、私たちのインフラチームがDNS設定のクリーンアップを含めて恒久対応します。" }
    ]
  },
  en: {
    website_diagnostic: [
      { q: "Do we need to scrap our existing hosting or domain?", a: "No. We build and test the high-performance presentation layer on a staging environment and swap it with zero downtime when approved." },
      { q: "Is the Lighthouse 85+ score guaranteed?", a: "Yes. Our Astro/Next.js build package guarantees a Lighthouse mobile score of 85+. If we fail to reach this, we refund the performance optimization fee." },
      { q: "What is the timeline for deployment?", a: "We proceed from baseline audit, staging build, trust setup, to deployment within 2 to 3 weeks." }
    ],
    japan_entry: [
      { q: "Can we start sales before establishing a local Japanese entity?", a: "Yes. You can test and validate the Japanese market by setting up a localized LP compliant with APPI/Tokushoho and local billing before incorporating." },
      { q: "Why is the Tokushoho commercial disclosure mandatory?", a: "Japanese consumer laws require transparent disclosure of the seller's entity. Japanese B2B/B2C buyers actively look for this page to verify credibility before buying." },
      { q: "How long does the localization setup take?", a: "Typically 2 to 4 weeks from kickoff to a live, compliant, localized launch." }
    ],
    video_subscription: [
      { q: "Can we adjust the monthly video volume?", a: "Yes. We offer flexible plans where you can scale your video pipeline up or down depending on your current marketing campaigns." },
      { q: "Can you create videos if we don't have custom footage?", a: "Yes. We utilize ComfyUI, stock assets, and dynamic motion templates to generate premium sales videos from scratch." },
      { q: "What formats do you specialize in?", a: "We focus on short landing page demos, automated proposal explainers, and customer success tutorials." }
    ],
    outreach: [
      { q: "Will automated outreach flag us as spammers?", a: "No. We target only verified leads using dry-runs, strict rate limits, and highly personalized B2B messages rather than generic bulk spam." },
      { q: "How are the lead lists built?", a: "We aggregate registrar data from gBizInfo, Overpass OSM, and browser-based search, filtered by industry and tech stack indicators." },
      { q: "How is the performance tracked?", a: "Everything is logged into Twenty CRM and Metabase, giving you real-time visibility on send rates and reply captures." }
    ],
    security: [
      { q: "Will implementing security headers break our site functions?", a: "No. We test HSTS and CSP settings in report staging environments first to ensure they don't block required third-party scripts." },
      { q: "What causes certificate verification issues?", a: "Common causes are DNS lookup gaps or stale server configurations. We verify and resolve the underlying network route." }
    ]
  }
}

const JA: ReportCopy = {
  brand: "Paradigm Revenue OS",
  privateReport: "経営診断レポート",
  validity: "有効期限",
  heroKicker: "Private business assessment",
  heroLead: "公開データ、取得済みシグナル、改善デモをもとに、売上・信頼・問い合わせ導線のどこから直すべきかを整理しました。",
  primaryCta: "改善デモを見る",
  secondaryCta: "相談する",
  evidenceReady: "取得済みデータ",
  sourceCoverage: "根拠カバレッジ",
  monthlyLoss: "推定月間機会損失",
  confidence: "根拠信頼度",
  currentState: "現在の摩擦",
  improvedState: "改善後の状態",
  diagnosticSurface: "診断サーフェス",
  priorityFindings: "優先所見",
  businessImpact: "事業インパクト",
  firstMove: "最初の一手",
  whyItMatters: "なぜ重要か",
  evidence: "根拠",
  recommendation: "推奨アクション",
  roadmap: "30日ロードマップ",
  dataAppendix: "データ台帳",
  sourceMeaning: "事業上の意味",
  sourceNext: "次に確認すること",
  sourceMissing: "未取得データは事実として扱わず、次回確認すべき仮説として扱います。",
  templateDirection: "提案方向",
  qualityBar: "品質基準",
  finalHeading: "30分で、最初に直すべき一点を決める",
  finalBody: "大きな作り直しの前に、売上機会・信頼形成・問い合わせ導線のどこが最も回収しやすいかを一緒に確認します。",
  emailSubject: "経営診断レポートについて",
  competitorBenchmark: "競合・業界ベンチマーク比較",
  yourSite: "御社サイト",
  industryAvg: "業界平均",
  topCompetitors: "競合上位平均",
  roiTitle: "予測ROI（投資対効果シミュレーション）",
  paybackPeriod: "想定回収期間",
  recoveredTwelveMonths: "12ヶ月の予測回収額",
  roiLabel: "予測ROI",
  faqTitle: "よくあるご質問 (FAQ)",
  readMore: "詳細はこちらのレポートを参照",
}

const EN: ReportCopy = {
  brand: "Paradigm Revenue OS",
  privateReport: "Executive diagnostic report",
  validity: "Valid until",
  heroKicker: "Private business assessment",
  heroLead: "We translated public evidence, collected signals, and the improvement demo into a clear first move across revenue, trust, and inquiry flow.",
  primaryCta: "View improvement demo",
  secondaryCta: "Discuss",
  evidenceReady: "Evidence collected",
  sourceCoverage: "Evidence coverage",
  monthlyLoss: "Estimated monthly opportunity loss",
  confidence: "Evidence confidence",
  currentState: "Current friction",
  improvedState: "Improved state",
  diagnosticSurface: "Diagnostic surface",
  priorityFindings: "Priority findings",
  businessImpact: "Business impact",
  firstMove: "First move",
  whyItMatters: "Why it matters",
  evidence: "Evidence",
  recommendation: "Recommended action",
  roadmap: "30-day roadmap",
  dataAppendix: "Data ledger",
  sourceMeaning: "Business meaning",
  sourceNext: "Next check",
  sourceMissing: "Missing sources are not treated as facts. They remain hypotheses for the next review.",
  templateDirection: "Proposal direction",
  qualityBar: "Quality bar",
  finalHeading: "Use 30 minutes to choose the first fix",
  finalBody: "Before a large rebuild, identify the easiest recovery path across revenue opportunity, trust proof, and inquiry flow.",
  emailSubject: "About the diagnostic report",
  competitorBenchmark: "Visual Competitor & Industry Benchmark",
  yourSite: "Your Site",
  industryAvg: "Industry Average",
  topCompetitors: "Top Competitors",
  roiTitle: "Projected ROI Simulation",
  paybackPeriod: "Est. Payback Period",
  recoveredTwelveMonths: "12-Month Recovered Revenue",
  roiLabel: "Projected ROI",
  faqTitle: "Frequently Asked Questions",
  readMore: "Read detailed analysis here",
}

function localize(overrides: Partial<ReportCopy>): ReportCopy {
  return { ...EN, ...overrides }
}

export const REPORT_COPY: Record<string, ReportCopy> = {
  ja: JA,
  en: EN,
  ko: localize({ privateReport: "Private executive business assessment" }),
  zh: localize({ privateReport: "Private executive business assessment" }),
  de: localize({ privateReport: "Private executive business assessment" }),
  fr: localize({ privateReport: "Private executive business assessment" }),
  es: localize({ privateReport: "Private executive business assessment" }),
  pt: localize({ privateReport: "Private executive business assessment" }),
  ru: localize({ privateReport: "Private executive business assessment" }),
  ar: localize({ privateReport: "Private executive business assessment" }),
  vi: localize({ privateReport: "Private executive business assessment" }),
  id: localize({ privateReport: "Private executive business assessment" }),
}

export function normalizeReportLang(locale?: string): ReportLang {
  if (!locale) return "ja"
  return (Object.keys(REPORT_COPY) as ReportLang[]).includes(locale as ReportLang) ? (locale as ReportLang) : "en"
}

