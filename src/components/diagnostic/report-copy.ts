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
}

function localize(overrides: Partial<ReportCopy>): ReportCopy {
  return { ...EN, ...overrides }
}

export const REPORT_COPY: Record<ReportLang, ReportCopy> = {
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
