export type ReportLang = "ja" | "en" | "ko" | "zh" | "de" | "fr" | "es" | "pt" | "ru" | "ar" | "vi" | "id"

export type ReportCopy = {
  brand: string
  privateReport: string
  validUntil: string
  diagnosed: string
  expertRead: string
  whatWeSee: string
  whyItMatters: string
  firstMove: string
  loss: string
  confidence: string
  priority: string
  sourceConfidence: string
  evidence: string
  pain: string
  sourceLedger: string
  actions: string
  template: string
  quality: string
  demo: string
  video: string
  collected: string
  configured: string
  missing: string
  ctaHeading: string
  ctaBody: string
  ctaButton: string
  subject: string
  assumption: string
  implication: string
  recommendation: string
  whyImportant: string
  missingTreatment: string
  sourceMeaning: string
  sourceMissingImpact: string
  sourceNext: string
  sourceUse: string
  sourceUseBody: string
  missingImportantData: string
  missingImportantBody: string
}

const JA: ReportCopy = {
  brand: "Paradigm Diagnostic Intelligence",
  privateReport: "専門家レビュー用の非公開診断レポート",
  validUntil: "有効期限",
  diagnosed: "診断対象",
  expertRead: "専門家所見",
  whatWeSee: "見えている事実",
  whyItMatters: "事業上の意味",
  firstMove: "最初の一手",
  loss: "推定月間機会損失",
  confidence: "根拠信頼度",
  priority: "優先度",
  sourceConfidence: "取得ソース信頼度",
  evidence: "客観データの根拠",
  pain: "痛みの構造化",
  sourceLedger: "API / OSS 取得台帳",
  actions: "30日ロードマップ",
  template: "適用テンプレート",
  quality: "品質基準",
  demo: "改善デモを見る",
  video: "60秒動画を見る",
  collected: "取得済み",
  configured: "接続済み",
  missing: "未取得",
  ctaHeading: "30分で、最初に直す一点を決める",
  ctaBody: "単なる制作提案ではなく、公開データと実測値から改善優先度・実装範囲・営業で使える訴求まで確認します。",
  ctaButton: "相談する",
  subject: "診断レポートについて",
  assumption: "診断仮説",
  implication: "影響",
  recommendation: "推奨対応",
  whyImportant: "なぜ重要か",
  missingTreatment: "未取得時の扱い",
  sourceMeaning: "意味",
  sourceMissingImpact: "未取得の影響",
  sourceNext: "次",
  sourceUse: "使い方",
  sourceUseBody: "この根拠を痛み・損失仮説・改善優先度に反映します。",
  missingImportantData: "取得できていない重要データ",
  missingImportantBody:
    "未取得データは隠さず、断定を避けて仮説扱いにします。次回のカルテ生成でここを埋めるほど、「何が悪いか」ではなく「なぜ今直すべきか」まで強く説明できます。",
}

const EN: ReportCopy = {
  brand: "Paradigm Diagnostic Intelligence",
  privateReport: "Private expert diagnostic report",
  validUntil: "Valid until",
  diagnosed: "Diagnosed company",
  expertRead: "Expert assessment",
  whatWeSee: "What the evidence shows",
  whyItMatters: "Business implication",
  firstMove: "First move",
  loss: "Estimated monthly opportunity loss",
  confidence: "Evidence confidence",
  priority: "Priority",
  sourceConfidence: "Source confidence",
  evidence: "Objective evidence",
  pain: "Pain model",
  sourceLedger: "API / OSS source ledger",
  actions: "30-day roadmap",
  template: "Selected template",
  quality: "Quality bar",
  demo: "Open replacement demo",
  video: "Watch 60-sec video",
  collected: "collected",
  configured: "configured",
  missing: "missing",
  ctaHeading: "Use 30 minutes to decide the first fix",
  ctaBody: "We turn public evidence and real measurements into priority, scope, and sales-ready messaging.",
  ctaButton: "Talk to us",
  subject: "About the diagnostic report",
  assumption: "Diagnostic hypothesis",
  implication: "Impact",
  recommendation: "Recommended action",
  whyImportant: "Why this matters",
  missingTreatment: "How to treat missing data",
  sourceMeaning: "Meaning",
  sourceMissingImpact: "Missing-data impact",
  sourceNext: "Next",
  sourceUse: "Use",
  sourceUseBody: "Use this evidence to support pain, loss hypotheses, and improvement priorities.",
  missingImportantData: "Important data not collected yet",
  missingImportantBody:
    "Missing sources are shown explicitly and treated as hypotheses, not facts. Filling these gaps makes the report move from what is wrong to why it matters now.",
}

export const REPORT_COPY: Record<ReportLang, ReportCopy> = {
  ja: JA,
  en: EN,
  ko: {
    ...EN,
    privateReport: "전문가 검토용 비공개 진단 리포트",
    validUntil: "유효 기간",
    diagnosed: "진단 대상",
    expertRead: "전문가 소견",
    actions: "30일 로드맵",
    ctaButton: "상담하기",
  },
  zh: {
    ...EN,
    privateReport: "专家审阅用私人诊断报告",
    validUntil: "有效期至",
    diagnosed: "诊断对象",
    expertRead: "专家评估",
    actions: "30天路线图",
    ctaButton: "联系我们",
  },
  de: {
    ...EN,
    privateReport: "Privater Diagnosebericht zur Expertenprufung",
    validUntil: "Gultig bis",
    diagnosed: "Analysiertes Unternehmen",
    expertRead: "Experteneinschatzung",
    actions: "30-Tage-Roadmap",
    ctaButton: "Gesprach anfragen",
  },
  fr: {
    ...EN,
    privateReport: "Rapport de diagnostic prive pour revue experte",
    validUntil: "Valable jusqu'au",
    diagnosed: "Entreprise diagnostiquee",
    expertRead: "Avis expert",
    actions: "Feuille de route 30 jours",
    ctaButton: "Nous contacter",
  },
  es: {
    ...EN,
    privateReport: "Informe privado de diagnostico experto",
    validUntil: "Valido hasta",
    diagnosed: "Empresa diagnosticada",
    expertRead: "Evaluacion experta",
    actions: "Hoja de ruta de 30 dias",
    ctaButton: "Hablar con nosotros",
  },
  pt: {
    ...EN,
    privateReport: "Relatorio privado de diagnostico especializado",
    validUntil: "Valido ate",
    diagnosed: "Empresa diagnosticada",
    expertRead: "Avaliacao especializada",
    actions: "Roteiro de 30 dias",
    ctaButton: "Falar conosco",
  },
  ru: {
    ...EN,
    privateReport: "Private expert diagnostic report",
    actions: "30-day roadmap",
    ctaButton: "Contact us",
  },
  ar: {
    ...EN,
    privateReport: "Private expert diagnostic report",
    actions: "30-day roadmap",
    ctaButton: "Contact us",
  },
  vi: {
    ...EN,
    privateReport: "Bao cao chan doan rieng cho chuyen gia",
    validUntil: "Co hieu luc den",
    diagnosed: "Doanh nghiep duoc chan doan",
    expertRead: "Nhan dinh chuyen gia",
    actions: "Lo trinh 30 ngay",
    ctaButton: "Trao doi",
  },
  id: {
    ...EN,
    privateReport: "Laporan diagnosis privat untuk tinjauan ahli",
    validUntil: "Berlaku hingga",
    diagnosed: "Perusahaan yang dianalisis",
    expertRead: "Penilaian ahli",
    actions: "Peta jalan 30 hari",
    ctaButton: "Konsultasi",
  },
}

export function normalizeReportLang(locale?: string): ReportLang {
  if (!locale) return "ja"
  return (Object.keys(REPORT_COPY) as ReportLang[]).includes(locale as ReportLang) ? (locale as ReportLang) : "en"
}
