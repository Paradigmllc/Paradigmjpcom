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
      { q: "既存のシステムやドメインを捨てる必要がありますか？", a: "通常は既存環境を維持し、ステージングで構築・検証してから移行します。切替方法、停止リスク、ロールバック手順は着手前の書面で確認します。" },
      { q: "Lighthouseの表示速度スコア85点以上は本当に保証されますか？", a: "無条件のスコア保証は行いません。端末、外部スクリプト、配信環境を含む計測条件を固定し、基準値と公開時の実測結果を報告します。" },
      { q: "どのようなプロセスで進めますか？", a: "現状分析、Astro/Next.jsでのビジュアル制作、ステージングでの検証、ドメイン切り替えの順で進行し、最短2週間で完了します。" }
    ],
    japan_entry: [
      { q: "日本に現地法人がなくても営業を開始できますか？", a: "商材、販売方法、決済、規制要件によって異なります。契約前に利用可能な問い合わせ・販売経路を確認し、法人・税務・許認可の判断は専門家へつなぎます。" },
      { q: "特商法（特定商取引法に基づく表記）はなぜ必要ですか？", a: "日本の消費者向け通信販売など対象となる取引では、販売条件や事業者情報等の表示が必要です。必要項目は販売モデルに応じて確認し、専門判断が必要な場合は有資格者のレビューを前提にします。" },
      { q: "ローカライズにかかる期間はどれくらいですか？", a: "書面範囲、入金、必要素材・アクセス、承認者が揃った開始日から14営業日の納品保証を適用します。顧客側の変更・保留は時計を一時停止し、未納品時はセットアップ費用を全額返金します。" }
    ],
    video_subscription: [
      { q: "動画サブスクの毎月の本数は変更できますか？", a: "はい。キャンペーンやプロモーションのスケジュールに応じて、月ごとの制作本数を柔軟に調整できるプランをご用意しています。" },
      { q: "自社で撮影した素材がなくても動画は作れますか？", a: "はい。ComfyUIやHyperFrames等のAI技術とストックフッテージを組み合わせ、高品質な営業用動画をアセットなしから量産可能です。" },
      { q: "どのような動画タイプに対応していますか？", a: "リード獲得用のデモ動画、営業フォロー用のショート解説動画、カスタマーサクセス向けの製品チュートリアル動画に特化しています。" }
    ],
    outreach: [
      { q: "フォーム営業の自動化はスパム判定されませんか？", a: "私たちは闇雲なスパム送信は行いません。事前分類フィルタを使い、課題が明確なターゲット企業にのみ、パーソナライズされた丁寧な文面で送信します。" },
      { q: "配信先のリストはどのように用意しますか？", a: "利用条件を確認した公開データや検索結果を精査し、合意した業種・地域・技術シグナルに合う候補だけを選定します。" },
      { q: "送信結果のレポーティングはありますか？", a: "はい。取得できた送信状態や返信をTwenty CRM等に記録し、参照可能な範囲をダッシュボードで可視化します。" }
    ],
    security: [
      { q: "セキュリティヘッダーの適用でサイトが壊れることはありませんか？", a: "影響の可能性はあります。必要な外部スクリプトを棚卸しし、CSP等をステージングで検証してロールバック手順を用意してから本番へ反映します。" },
      { q: "SSL証明書の更新エラーはなぜ発生するのですか？", a: "DNSの不整合や自動更新スクリプトの不具合が原因であることが多く、私たちのインフラチームがDNS設定のクリーンアップを含めて恒久対応します。" }
    ]
  },
  en: {
    website_diagnostic: [
      { q: "Do we need to scrap our existing hosting or domain?", a: "Usually not. We stage and verify the agreed presentation layer first, then document the cutover, downtime risk, and rollback path before touching production." },
      { q: "Is a Lighthouse 85+ score guaranteed?", a: "No unconditional score is guaranteed. We fix the measurement conditions, record the baseline, and report the launch result, including third-party scripts or infrastructure that constrain it." },
      { q: "What is the timeline for deployment?", a: "For the fixed Japan Entry scope, the launch target is 14 business days after agreement, payment, required access, and assets are complete. External review or client delays move the target." }
    ],
    japan_entry: [
      { q: "Can we start sales before establishing a local Japanese entity?", a: "Sometimes. The viable inquiry, payment, fulfilment, and disclosure route depends on your product, regulated status, provider eligibility, and tax or legal requirements. We confirm the route before accepting the fixed scope." },
      { q: "When is a Tokushoho commercial disclosure needed?", a: "Covered Japanese consumer mail-order transactions require specified seller and commercial information. The exact disclosure depends on the sales model, and specialist legal review remains separate where needed." },
      { q: "How long does the localization setup take?", a: "The target is 14 business days after agreement, payment, required access, and assets are complete. Delayed approvals, expanded scope, regulation, or third-party reviews can move the date." }
    ],
    video_subscription: [
      { q: "Can we adjust the monthly video volume?", a: "Yes. We offer flexible plans where you can scale your video pipeline up or down depending on your current marketing campaigns." },
      { q: "Can you create videos if we don't have custom footage?", a: "Yes. We utilize ComfyUI, stock assets, and dynamic motion templates to generate premium sales videos from scratch." },
      { q: "What formats do you specialize in?", a: "We focus on short landing page demos, automated proposal explainers, and customer success tutorials." }
    ],
    outreach: [
      { q: "Can automated outreach be flagged as spam?", a: "Yes, that risk cannot be eliminated. Any approved outreach must use relevant B2B targeting, lawful source and suppression controls, conservative limits, and accurate sender identity rather than generic bulk messaging." },
      { q: "How are the lead lists built?", a: "We aggregate registrar data from gBizInfo, Overpass OSM, and browser-based search, filtered by industry and tech stack indicators." },
      { q: "How is the performance tracked?", a: "Everything is logged into Twenty CRM and Metabase, giving you real-time visibility on send rates and reply captures." }
    ],
    security: [
      { q: "Can security-header changes affect site functions?", a: "Yes. We inventory required third-party scripts, test CSP and related headers in staging, and define a rollback path before production changes." },
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
