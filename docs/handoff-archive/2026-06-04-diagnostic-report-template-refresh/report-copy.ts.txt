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
  brand: "Paradigm Business Intelligence",
  privateReport: "経営者向け 非公開診断レポート",
  validUntil: "有効期限",
  diagnosed: "診断対象",
  expertRead: "経営診断サマリー",
  whatWeSee: "いま起きていること",
  whyItMatters: "事業への影響",
  firstMove: "最初の一手",
  loss: "推定月間機会損失",
  confidence: "根拠の信頼度",
  priority: "優先テーマ",
  sourceConfidence: "根拠カバレッジ",
  evidence: "判断材料",
  pain: "売上を止める構造",
  sourceLedger: "取得データの補足",
  actions: "30日改善ロードマップ",
  template: "提案方針",
  quality: "品質基準",
  demo: "改善デモを見る",
  video: "1分動画を見る",
  collected: "取得済み",
  configured: "接続済み",
  missing: "未取得",
  ctaHeading: "30分で、最初に直すべき経営課題を決める",
  ctaBody: "技術用語の説明ではなく、売上・信頼・集客・運用負荷のどこから回収するかを整理します。実装範囲、費用感、優先順位までその場で確認できます。",
  ctaButton: "改善方針を相談する",
  subject: "経営診断レポートについて",
  assumption: "診断仮説",
  implication: "経営インパクト",
  recommendation: "推奨アクション",
  whyImportant: "なぜ重要か",
  missingTreatment: "未取得データの扱い",
  sourceMeaning: "経営上の意味",
  sourceMissingImpact: "未取得時の影響",
  sourceNext: "次に確認すること",
  sourceUse: "使い方",
  sourceUseBody: "この根拠は、売上機会、信頼低下、問い合わせ導線、改善優先度の判断材料として使います。",
  missingImportantData: "まだ確認できていない重要データ",
  missingImportantBody:
    "未取得データは事実として断定せず、次回確認すべき仮説として扱います。ここが埋まるほど、レポートは「何が悪いか」から「いくら回収できるか」へ近づきます。",
}

const EN: ReportCopy = {
  brand: "Paradigm Business Intelligence",
  privateReport: "Private executive business assessment",
  validUntil: "Valid until",
  diagnosed: "Assessed company",
  expertRead: "Executive assessment",
  whatWeSee: "What is happening now",
  whyItMatters: "Business impact",
  firstMove: "First move",
  loss: "Estimated monthly opportunity loss",
  confidence: "Evidence confidence",
  priority: "Priority theme",
  sourceConfidence: "Evidence coverage",
  evidence: "Decision evidence",
  pain: "Revenue friction model",
  sourceLedger: "Data appendix",
  actions: "30-day improvement roadmap",
  template: "Proposal direction",
  quality: "Quality bar",
  demo: "Open improvement demo",
  video: "Watch 60-sec video",
  collected: "collected",
  configured: "configured",
  missing: "missing",
  ctaHeading: "Use 30 minutes to choose the first business fix",
  ctaBody: "This is not an IT checklist. We clarify where revenue, trust, acquisition, or operating load can be recovered first, then map scope and cost.",
  ctaButton: "Discuss the improvement plan",
  subject: "About the business assessment",
  assumption: "Assessment hypothesis",
  implication: "Business impact",
  recommendation: "Recommended action",
  whyImportant: "Why this matters",
  missingTreatment: "How to treat missing data",
  sourceMeaning: "Business meaning",
  sourceMissingImpact: "Impact when missing",
  sourceNext: "Next check",
  sourceUse: "How to use",
  sourceUseBody: "Use this evidence to judge revenue opportunity, trust gaps, inquiry flow, and improvement priority.",
  missingImportantData: "Important data not confirmed yet",
  missingImportantBody:
    "Missing sources are not treated as facts. They are review items that make the assessment more financial and less technical once confirmed.",
}

function localize(base: Partial<ReportCopy>): ReportCopy {
  return { ...EN, ...base }
}

export const REPORT_COPY: Record<ReportLang, ReportCopy> = {
  ja: JA,
  en: EN,
  ko: localize({
    privateReport: "비공개 경영 진단 리포트",
    diagnosed: "진단 대상",
    expertRead: "경영 진단 요약",
    whatWeSee: "현재 보이는 문제",
    whyItMatters: "사업 영향",
    firstMove: "첫 실행 과제",
    actions: "30일 개선 로드맵",
    ctaButton: "개선 방향 상담",
  }),
  zh: localize({
    privateReport: "非公开经营诊断报告",
    diagnosed: "诊断对象",
    expertRead: "经营诊断摘要",
    whatWeSee: "当前现象",
    whyItMatters: "业务影响",
    firstMove: "第一步行动",
    actions: "30天改善路线图",
    ctaButton: "讨论改善方案",
  }),
  de: localize({
    privateReport: "Privater Business-Assessment-Bericht",
    diagnosed: "Bewertetes Unternehmen",
    expertRead: "Management-Einschatzung",
    whatWeSee: "Was aktuell passiert",
    whyItMatters: "Auswirkung auf das Geschaft",
    firstMove: "Erster Schritt",
    actions: "30-Tage-Roadmap",
    ctaButton: "Verbesserungsplan besprechen",
  }),
  fr: localize({
    privateReport: "Rapport prive de diagnostic business",
    diagnosed: "Entreprise analysee",
    expertRead: "Synthese executive",
    whatWeSee: "Ce que montrent les signaux",
    whyItMatters: "Impact business",
    firstMove: "Premiere action",
    actions: "Plan d'amelioration sur 30 jours",
    ctaButton: "Discuter du plan",
  }),
  es: localize({
    privateReport: "Informe privado de diagnostico empresarial",
    diagnosed: "Empresa analizada",
    expertRead: "Evaluacion ejecutiva",
    whatWeSee: "Lo que esta ocurriendo",
    whyItMatters: "Impacto en el negocio",
    firstMove: "Primer movimiento",
    actions: "Hoja de ruta de 30 dias",
    ctaButton: "Hablar del plan",
  }),
  pt: localize({
    privateReport: "Relatorio privado de diagnostico empresarial",
    diagnosed: "Empresa analisada",
    expertRead: "Avaliacao executiva",
    whatWeSee: "O que esta acontecendo",
    whyItMatters: "Impacto no negocio",
    firstMove: "Primeiro passo",
    actions: "Roteiro de 30 dias",
    ctaButton: "Discutir o plano",
  }),
  ru: localize({
    privateReport: "Private executive business assessment",
    actions: "30-day improvement roadmap",
    ctaButton: "Discuss the plan",
  }),
  ar: localize({
    privateReport: "Private executive business assessment",
    actions: "30-day improvement roadmap",
    ctaButton: "Discuss the plan",
  }),
  vi: localize({
    privateReport: "Bao cao chan doan kinh doanh rieng",
    diagnosed: "Doanh nghiep duoc danh gia",
    expertRead: "Tom tat dieu hanh",
    whatWeSee: "Dieu dang xay ra",
    whyItMatters: "Tac dong kinh doanh",
    firstMove: "Viec dau tien",
    actions: "Lo trinh cai thien 30 ngay",
    ctaButton: "Trao doi ke hoach",
  }),
  id: localize({
    privateReport: "Laporan asesmen bisnis privat",
    diagnosed: "Perusahaan yang dinilai",
    expertRead: "Ringkasan eksekutif",
    whatWeSee: "Yang sedang terjadi",
    whyItMatters: "Dampak bisnis",
    firstMove: "Langkah pertama",
    actions: "Roadmap perbaikan 30 hari",
    ctaButton: "Bahas rencana",
  }),
}

export function normalizeReportLang(locale?: string): ReportLang {
  if (!locale) return "ja"
  return (Object.keys(REPORT_COPY) as ReportLang[]).includes(locale as ReportLang) ? (locale as ReportLang) : "en"
}
