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
}

export const REPORT_COPY: Record<ReportLang, ReportCopy> = {
  ja: {
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
    ctaHeading: "30分で、最初に直すべき一点を決める",
    ctaBody: "単なる制作提案ではなく、公開データと実測値から改善優先度、実装範囲、営業で使える訴求まで確認します。",
    ctaButton: "相談する",
    subject: "診断レポートについて",
    assumption: "診断仮説",
    implication: "影響",
    recommendation: "推奨対応",
  },
  en: EN,
  ko: {
    ...EN,
    privateReport: "전문가 검토용 비공개 진단 리포트",
    validUntil: "유효 기한",
    diagnosed: "진단 대상",
    expertRead: "전문가 소견",
    actions: "30일 실행 로드맵",
    ctaButton: "상담하기",
  },
  zh: {
    ...EN,
    privateReport: "专家审阅用非公开诊断报告",
    validUntil: "有效期",
    diagnosed: "诊断对象",
    expertRead: "专家判断",
    actions: "30天行动路线图",
    ctaButton: "咨询",
  },
  de: {
    ...EN,
    privateReport: "Privater Experten-Diagnosebericht",
    validUntil: "Gültig bis",
    diagnosed: "Analysiertes Unternehmen",
    expertRead: "Experteneinschätzung",
    actions: "30-Tage-Roadmap",
    ctaButton: "Gespräch anfragen",
  },
  fr: {
    ...EN,
    privateReport: "Rapport de diagnostic privé pour revue experte",
    validUntil: "Valable jusqu'au",
    diagnosed: "Entreprise diagnostiquée",
    expertRead: "Avis expert",
    actions: "Feuille de route 30 jours",
    ctaButton: "Nous contacter",
  },
  es: {
    ...EN,
    privateReport: "Informe privado de diagnóstico experto",
    validUntil: "Válido hasta",
    diagnosed: "Empresa diagnosticada",
    expertRead: "Evaluación experta",
    actions: "Hoja de ruta de 30 días",
    ctaButton: "Hablar con nosotros",
  },
  pt: {
    ...EN,
    privateReport: "Relatório privado de diagnóstico especializado",
    validUntil: "Válido até",
    diagnosed: "Empresa diagnosticada",
    expertRead: "Avaliação especializada",
    actions: "Roteiro de 30 dias",
    ctaButton: "Falar conosco",
  },
  ru: {
    ...EN,
    privateReport: "Закрытый экспертный диагностический отчет",
    validUntil: "Действует до",
    diagnosed: "Компания",
    expertRead: "Экспертная оценка",
    actions: "План на 30 дней",
    ctaButton: "Обсудить",
  },
  ar: {
    ...EN,
    privateReport: "تقرير تشخيص خاص لمراجعة الخبراء",
    validUntil: "صالح حتى",
    diagnosed: "الشركة محل التشخيص",
    expertRead: "تقييم الخبراء",
    actions: "خطة 30 يوما",
    ctaButton: "تواصل معنا",
  },
  vi: {
    ...EN,
    privateReport: "Báo cáo chẩn đoán riêng cho chuyên gia",
    validUntil: "Có hiệu lực đến",
    diagnosed: "Doanh nghiệp được chẩn đoán",
    expertRead: "Nhận định chuyên gia",
    actions: "Lộ trình 30 ngày",
    ctaButton: "Trao đổi",
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
