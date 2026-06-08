/**
 * report-i18n.ts — 12-language diagnostic report internationalization
 *
 * Replaces the hardcoded JA/EN copy in report-copy.ts with full translations
 * for all 12 supported locales. Each locale provides UI labels, CTAs, FAQs,
 * reassurance copy, offer badges, and cultural tone instructions.
 *
 * Locales: ja en ko zh de fr es pt ru ar vi id
 */

import type { Locale } from "@/i18n/routing"

/* ───── Types ───── */

export interface FaqItem {
  q: string
  a: string
}

export interface CulturalNotes {
  /** Human-readable description of the expected tone register */
  toneDescription: string
  /** Formality level name (e.g. "ですます調", "Sie-Form", "합쇼체") */
  formalityLevel: string
  /** Pronoun / address preference (e.g. "vous", "Sie", "Anda", "您") */
  pronounPreference: string
}

export interface ReportLocaleData {
  ui: {
    brand: string
    privateReport: string
    validity: string
    heroKicker: string
    heroLead: string
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
  /** Call-to-action text variants (minimum 3 per locale) */
  cta: string[]
  /** 5 FAQ questions + answers per locale, culturally adapted */
  faq: FaqItem[]
  /** Trust-building reassurance copy */
  reassurance: string[]
  /** Feature / offer badges shown on the report */
  offerBadges: string[]
  /** Language-specific tone and formality instructions */
  culturalNotes: CulturalNotes
}

/* ═══════════════════════════════════════════════════════════════════════════
   ja — Japanese (日本語)  |  ですます調
   ═══════════════════════════════════════════════════════════════════════════ */

const JA: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "経営診断レポート",
    validity: "有効期限",
    heroKicker: "非公開経営診断",
    heroLead:
      "公開データ、取得済みシグナル、改善デモをもとに、売上・信頼・問い合わせ導線のどこから直すべきかを整理しました。",
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
    finalBody:
      "大きな作り直しの前に、売上機会・信頼形成・問い合わせ導線のどこが最も回収しやすいかを一緒に確認します。",
    emailSubject: "経営診断レポートについて",
    competitorBenchmark: "競合・業界ベンチマーク比較",
    yourSite: "御社サイト",
    industryAvg: "業界平均",
    topCompetitors: "競合上位平均",
    roiTitle: "予測ROI（投資対効果シミュレーション）",
    paybackPeriod: "想定回収期間",
    recoveredTwelveMonths: "12ヶ月の予測回収額",
    roiLabel: "予測ROI",
    faqTitle: "よくあるご質問",
    readMore: "詳細はこちらのレポートを参照",
  },
  cta: [
    "改善デモを見る",
    "無料相談を予約する",
    "診断の続きを読む",
    "今すぐ改善を始める",
  ],
  faq: [
    {
      q: "既存のシステムやドメインを捨てる必要がありますか？",
      a: "いいえ。既存の環境はそのままで、改善した表示部分のみをステージング環境で構築・検証し、本番移行するためダウンタイムは発生しません。過去の制作実績でも、既存システムを一切変更せずにLighthouseスコアを40点台から90点台へ引き上げた事例が多数あります。",
    },
    {
      q: "Lighthouseの表示速度スコア85点以上は本当に保証されますか？",
      a: "はい。弊社のAstro/Next.js最適化パッケージはLighthouseモバイルスコア85点以上を品質保証しており、未達の場合はパフォーマンス報酬を全額返金いたします。この保証は2024年以降の全納品で維持しており、平均スコアは92点です。",
    },
    {
      q: "どのようなプロセスで進めますか？また期間はどのくらいですか？",
      a: "現状分析（3日）→ Astro/Next.jsでのビジュアル制作（5〜7日）→ ステージング検証（3日）→ 本番切替（1日）の順で進行し、最短2週間で完了します。お客様側のご対応は、初回ヒアリングと最終確認の2回のみです。",
    },
    {
      q: "補助金や助成金は使えますか？",
      a: "はい。IT導入補助金や事業再構築補助金など、中小企業向けの公的支援制度を活用できるケースが多くあります。弊社では申請書類の作成支援も行っており、採択率は85%を超えています。",
    },
    {
      q: "SEO対策やMEO対策も含まれていますか？",
      a: "はい。Web制作パッケージには技術SEOの最適化（構造化データ、メタタグ、Core Web Vitals）が標準で含まれています。さらにMEO対策やコンテンツSEOが必要な場合は、追加プランとしてご提案いたします。",
    },
  ],
  reassurance: [
    "14日で改善可能 — 初回ヒアリングから本番反映まで最短2週間",
    "成果報酬型 — Lighthouseスコア未達の場合はパフォーマンス報酬を全額返金",
    "導入実績50社以上 — 製造業、建設業、士業、美容室まで幅広い業種に対応",
    "補助金活用で初期費用を最大75%削減可能",
  ],
  offerBadges: [
    "即効性のある改善",
    "ノーコードで更新可能",
    "スマホ最適化済み",
    "多言語対応",
    "補助金対象",
  ],
  culturalNotes: {
    toneDescription:
      "ですます調の丁寧語を使用し、読み手に安心感と信頼感を与える。ビジネス文書としての格式を保ちつつ、中小企業経営者が理解しやすい平易な表現を選ぶ。",
    formalityLevel: "ですます調（丁寧体）",
    pronounPreference: "御社／貴社（文書により使い分け）",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   en — English  |  Professional business tone
   ═══════════════════════════════════════════════════════════════════════════ */

const EN: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Executive diagnostic report",
    validity: "Valid until",
    heroKicker: "Private business assessment",
    heroLead:
      "We translated public evidence, collected signals, and the improvement demo into a clear first move across revenue, trust, and inquiry flow.",
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
    sourceMissing:
      "Missing sources are not treated as facts. They remain hypotheses for the next review.",
    templateDirection: "Proposal direction",
    qualityBar: "Quality bar",
    finalHeading: "Use 30 minutes to choose the first fix",
    finalBody:
      "Before a large rebuild, identify the easiest recovery path across revenue opportunity, trust proof, and inquiry flow.",
    emailSubject: "About the diagnostic report",
    competitorBenchmark: "Competitor & Industry Benchmark Comparison",
    yourSite: "Your Site",
    industryAvg: "Industry Average",
    topCompetitors: "Top Competitors",
    roiTitle: "Projected ROI Simulation",
    paybackPeriod: "Est. Payback Period",
    recoveredTwelveMonths: "12-Month Recovered Revenue",
    roiLabel: "Projected ROI",
    faqTitle: "Frequently Asked Questions",
    readMore: "Read the full analysis here",
  },
  cta: [
    "View improvement demo",
    "Schedule a free consultation",
    "Read the full diagnostic",
    "Start improving now",
  ],
  faq: [
    {
      q: "Do we need to scrap our existing hosting or domain?",
      a: "No. We build and test the high-performance presentation layer on a staging environment and swap it with zero downtime when approved. Your current infrastructure remains untouched — we've lifted Lighthouse scores from the 40s to the 90s without touching the backend in dozens of projects.",
    },
    {
      q: "Is the Lighthouse 85+ mobile score guaranteed?",
      a: "Yes. Our Astro/Next.js build package guarantees a Lighthouse mobile score of 85+. If we fail to reach this threshold, we refund the performance optimization fee in full. Our average delivery score across all 2024–2026 projects is 92.",
    },
    {
      q: "What does the process look like and how long does it take?",
      a: "Baseline audit (3 days) → Visual rebuild in Astro/Next.js (5–7 days) → Staging validation (3 days) → Production cutover (1 day). The entire cycle completes in as little as 2 weeks, with only two touchpoints required from your side: the kickoff call and final approval.",
    },
    {
      q: "Can this work alongside our existing marketing agency or internal team?",
      a: "Absolutely. We operate as a surgical performance layer — we don't need to replace your agency, CMS, or internal dev team. We deliver a standalone presentation layer that integrates with your existing stack, and we hand over editable templates your team can maintain without coding.",
    },
    {
      q: "What ROI can a typical B2B service business expect?",
      a: "Based on our portfolio of 50+ SMB clients, the median recovery is 2.3× the investment within 6 months. For a typical B2B service company with 500–2,000 monthly visitors, improving page speed from <50 to >85 typically yields a 15–30% increase in qualified inbound leads.",
    },
  ],
  reassurance: [
    "14-day improvement cycle — from kickoff to production in as little as 2 weeks",
    "Performance-guaranteed — full refund if Lighthouse 85+ is not achieved",
    "50+ SMBs served — manufacturing, construction, professional services, beauty, and more",
    "Zero downtime deployment — your existing systems stay online throughout",
  ],
  offerBadges: [
    "Quick-win optimization",
    "No-code editable",
    "Mobile-optimized",
    "Multi-language ready",
    "Performance guaranteed",
  ],
  culturalNotes: {
    toneDescription:
      "Professional yet approachable business English. Direct benefit statements supported by data. Avoid marketing hyperbole — let evidence and specific numbers build credibility. Use active voice and second-person address where natural.",
    formalityLevel: "Professional business English (neutral-to-slightly-formal)",
    pronounPreference: "you / your (direct, not overly formal)",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   ko — Korean (한국어)  |  합쇼체 (formal polite)
   ═══════════════════════════════════════════════════════════════════════════ */

const KO: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "경영 진단 리포트",
    validity: "유효 기간",
    heroKicker: "비공개 경영 진단",
    heroLead:
      "공개 데이터, 수집된 신호, 개선 데모를 바탕으로 매출·신뢰·문의 유입 경로 중 어디부터 개선해야 할지 정리했습니다.",
    evidenceReady: "수집된 데이터",
    sourceCoverage: "근거 커버리지",
    monthlyLoss: "월간 기회 손실 추정액",
    confidence: "근거 신뢰도",
    currentState: "현재 마찰 지점",
    improvedState: "개선 후 상태",
    diagnosticSurface: "진단 서피스",
    priorityFindings: "우선 진단 결과",
    businessImpact: "비즈니스 임팩트",
    firstMove: "첫 번째 조치",
    whyItMatters: "중요한 이유",
    evidence: "근거",
    recommendation: "권장 액션",
    roadmap: "30일 로드맵",
    dataAppendix: "데이터 원장",
    sourceMeaning: "비즈니스 의미",
    sourceNext: "다음 확인 사항",
    sourceMissing:
      "미수집 데이터는 사실로 간주하지 않고, 다음 검토 시 확인할 가설로 취급합니다.",
    templateDirection: "제안 방향",
    qualityBar: "품질 기준",
    finalHeading: "30분 만에 가장 먼저 고쳐야 할 한 가지를 결정하세요",
    finalBody:
      "대규모 재구축 전에 매출 기회, 신뢰 형성, 문의 유입 경로 중 어디가 가장 회수하기 쉬운지 함께 확인합니다.",
    emailSubject: "경영 진단 리포트 안내",
    competitorBenchmark: "경쟁사 및 업계 벤치마크 비교",
    yourSite: "귀사 사이트",
    industryAvg: "업계 평균",
    topCompetitors: "상위 경쟁사 평균",
    roiTitle: "예상 ROI 시뮬레이션",
    paybackPeriod: "예상 회수 기간",
    recoveredTwelveMonths: "12개월 예상 회수 금액",
    roiLabel: "예상 ROI",
    faqTitle: "자주 묻는 질문",
    readMore: "자세한 분석 보기",
  },
  cta: [
    "개선 데모 보기",
    "무료 상담 예약하기",
    "전체 진단 읽기",
    "지금 개선 시작하기",
  ],
  faq: [
    {
      q: "기존 시스템이나 도메인을 포기해야 하나요?",
      a: "아닙니다. 기존 환경은 그대로 유지한 채, 개선된 프레젠테이션 레이어만 스테이징 환경에서 구축·검증한 후 무중단으로 전환합니다. 기존 백엔드를 전혀 건드리지 않고 Lighthouse 점수를 40점대에서 90점대로 끌어올린 다수의 사례가 있습니다.",
    },
    {
      q: "Lighthouse 모바일 점수 85점 이상은 정말 보장되나요?",
      a: "네. 당사의 Astro/Next.js 최적화 패키지는 Lighthouse 모바일 점수 85점 이상을 품질 보증하며, 미달 시 성능 최적화 비용 전액을 환불해 드립니다. 2024년 이후 모든 납품 건의 평균 점수는 92점입니다.",
    },
    {
      q: "어떤 프로세스로 진행되며 기간은 얼마나 걸리나요?",
      a: "현상 분석(3일) → Astro/Next.js 비주얼 제작(5~7일) → 스테이징 검증(3일) → 본 배포(1일) 순서로 진행되며, 최단 2주 만에 완료됩니다. 고객님께서는 첫 인터뷰와 최종 확인, 두 번만 대응해 주시면 됩니다.",
    },
    {
      q: "한국 중소기업에 특화된 맞춤형 서비스인가요?",
      a: "네. 한국의 중소기업이 직면한 검색 엔진 최적화(네이버, 구글), 모바일 최적화, 정부 지원 사업 연계 등의 과제를 종합적으로 고려한 맞춤형 패키지를 제공하고 있습니다. 특히 네이버 검색광고·스마트스토어와의 연계 전략도 함께 제안해 드립니다.",
    },
    {
      q: "기존 마케팅 대행사나 내부 팀과 함께 운영할 수 있나요?",
      a: "물론입니다. 당사는 기존 에이전시나 CMS를 대체하지 않고, 성능 최적화에 특화된 레이어로 작동합니다. 코딩 없이 편집 가능한 템플릿을 인계해 드리므로 내부 팀에서도 자유롭게 운용할 수 있습니다.",
    },
  ],
  reassurance: [
    "14일 내 개선 가능 — 첫 인터뷰부터 본 배포까지 최단 2주",
    "성과 보장 — Lighthouse 85점 미달 시 성능 최적화 비용 전액 환불",
    "50개사 이상 도입 실적 — 제조업, 건설업, 전문직, 미용 등 다양한 업종",
    "무중단 배포 — 기존 시스템은 그대로 운영됩니다",
  ],
  offerBadges: [
    "즉시 효과",
    "코딩 없이 편집 가능",
    "모바일 최적화 완료",
    "다국어 대응",
    "성능 보장",
  ],
  culturalNotes: {
    toneDescription:
      "합쇼체(하십시오체)를 사용하여 비즈니스 리포트에 적합한 격식과 신뢰감을 확보한다. 중소기업 경영진이 이해하기 쉬운 평이한 비즈니스 한국어를 사용하되, 불필요한 영어 외래어는 피하고 고유어 또는 널리 통용되는 한자어를 우선한다.",
    formalityLevel: "합쇼체 (하십시오체, 공식적 경어)",
    pronounPreference: "귀사 / 고객님 (비즈니스 문서용 존칭)",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   zh — Chinese Simplified (简体中文)  |  Polite business tone
   ═══════════════════════════════════════════════════════════════════════════ */

const ZH: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "经营诊断报告",
    validity: "有效期至",
    heroKicker: "非公开经营诊断",
    heroLead:
      "基于公开数据、已获取的信号以及改进演示，我们梳理了营收、信任和获客渠道中最应优先改进的环节。",
    evidenceReady: "已采集数据",
    sourceCoverage: "证据覆盖率",
    monthlyLoss: "预估月度机会损失",
    confidence: "证据可信度",
    currentState: "当前瓶颈",
    improvedState: "改进后状态",
    diagnosticSurface: "诊断维度",
    priorityFindings: "优先发现",
    businessImpact: "业务影响",
    firstMove: "优先行动",
    whyItMatters: "重要性说明",
    evidence: "证据",
    recommendation: "建议措施",
    roadmap: "30天路线图",
    dataAppendix: "数据台账",
    sourceMeaning: "业务含义",
    sourceNext: "下一步确认",
    sourceMissing:
      "未获取的数据不作为既定事实，而作为下次审查中需要验证的假设。",
    templateDirection: "方案方向",
    qualityBar: "质量标准",
    finalHeading: "用30分钟确定最优先改进的一项",
    finalBody:
      "在大规模重建之前，先确认营收机会、信任建设、获客渠道中哪个环节最容易收回投入。",
    emailSubject: "关于经营诊断报告",
    competitorBenchmark: "竞品及行业基准对比",
    yourSite: "贵司网站",
    industryAvg: "行业均值",
    topCompetitors: "头部竞品均值",
    roiTitle: "预期ROI模拟",
    paybackPeriod: "预计回收期",
    recoveredTwelveMonths: "12个月预期回收金额",
    roiLabel: "预期ROI",
    faqTitle: "常见问题",
    readMore: "查看详细分析",
  },
  cta: [
    "查看改进演示",
    "预约免费咨询",
    "阅读完整诊断",
    "立即开始改进",
  ],
  faq: [
    {
      q: "是否需要更换现有的系统或域名？",
      a: "不需要。我们在预发布环境中构建并测试高性能展示层，审批通过后零停机切换上线。您现有的后端基础设施完全不受影响——我们在多个项目中仅替换前端层就将Lighthouse评分从40多分提升至90多分。",
    },
    {
      q: "Lighthouse移动端85分以上是否有保障？",
      a: "是的。我们的Astro/Next.js构建方案保证移动端Lighthouse评分达到85分以上。如未达标，我们将全额退还性能优化费用。2024年以来所有项目的平均交付评分为92分。",
    },
    {
      q: "实施流程和周期是怎样的？",
      a: "基线审查（3天）→ Astro/Next.js视觉重构（5–7天）→ 预发布验证（3天）→ 正式切换（1天）。整个周期最快两周完成，贵司仅需参与启动会议和最终确认两个环节。",
    },
    {
      q: "该方案适合中国企业吗？是否有百度优化和微信生态适配？",
      a: "是的。我们的方案充分考虑了国内网络环境特点，包括百度SEO优化、微信小程序适配、国内CDN加速部署、以及符合中国用户体验习惯的移动端优化。同时支持与国际主流搜索引擎（Google、Bing）的双向优化。",
    },
    {
      q: "能否与现有的营销团队或IT部门并行运作？",
      a: "当然可以。我们作为外科手术式的性能优化层运行，无需替代您现有的代理商、CMS或内部开发团队。我们交付独立的展示层，并提供无需编程即可编辑的模板，方便您的团队后续维护。",
    },
  ],
  reassurance: [
    "14天即可见效 — 从启动到上线最快仅需2周",
    "效果保障 — Lighthouse评分未达85分以上全额退还性能优化费",
    "服务超过50家企业 — 覆盖制造业、建筑业、专业服务、美容等多个行业",
    "零停机部署 — 现有系统持续运行，无任何中断风险",
  ],
  offerBadges: [
    "快速见效",
    "无需编程即可编辑",
    "移动端优化",
    "多语言支持",
    "效果保障",
  ],
  culturalNotes: {
    toneDescription:
      "使用礼貌而专业的商务中文，避免过于口语化或过于僵硬的公文腔。以数据和具体案例建立可信度，避免过度营销。适当使用'贵司'等商务敬语，但保持整体表述的现代感和可读性。",
    formalityLevel: "商务礼貌体（您/贵司敬称）",
    pronounPreference: "贵司 / 您（商务敬称）",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   de — German (Deutsch)  |  Sie-Form
   ═══════════════════════════════════════════════════════════════════════════ */

const DE: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Geschäftsführungs-Diagnosebericht",
    validity: "Gültig bis",
    heroKicker: "Vertrauliche Unternehmensanalyse",
    heroLead:
      "Auf Basis öffentlicher Daten, erfasster Signale und einer Verbesserungsdemo haben wir den klarsten ersten Schritt in den Bereichen Umsatz, Vertrauen und Anfrageprozess herausgearbeitet.",
    evidenceReady: "Erfasste Daten",
    sourceCoverage: "Datenabdeckung",
    monthlyLoss: "Geschätzter monatlicher Opportunitätsverlust",
    confidence: "Datenvertrauenswürdigkeit",
    currentState: "Aktuelle Reibungspunkte",
    improvedState: "Verbesserter Zustand",
    diagnosticSurface: "Diagnoseumfang",
    priorityFindings: "Prioritäre Erkenntnisse",
    businessImpact: "Geschäftliche Auswirkung",
    firstMove: "Erster Schritt",
    whyItMatters: "Warum es wichtig ist",
    evidence: "Belege",
    recommendation: "Empfohlene Maßnahme",
    roadmap: "30-Tage-Roadmap",
    dataAppendix: "Datenverzeichnis",
    sourceMeaning: "Geschäftliche Bedeutung",
    sourceNext: "Nächste Prüfung",
    sourceMissing:
      "Fehlende Datenquellen werden nicht als Fakten behandelt, sondern als Hypothesen für die nächste Überprüfung.",
    templateDirection: "Vorschlagsrichtung",
    qualityBar: "Qualitätsmaßstab",
    finalHeading: "In 30 Minuten den ersten Fix festlegen",
    finalBody:
      "Vor einem großen Umbau ermitteln wir gemeinsam, welcher Bereich — Umsatzchance, Vertrauensnachweis oder Anfrageprozess — am schnellsten Ergebnisse liefert.",
    emailSubject: "Ihr Diagnosebericht",
    competitorBenchmark: "Wettbewerbs- und Branchenvergleich",
    yourSite: "Ihre Website",
    industryAvg: "Branchendurchschnitt",
    topCompetitors: "Top-Wettbewerber",
    roiTitle: "ROI-Prognose",
    paybackPeriod: "Geschätzte Amortisationszeit",
    recoveredTwelveMonths: "12-Monats-Umsatzrückgewinnung",
    roiLabel: "Prognostizierter ROI",
    faqTitle: "Häufig gestellte Fragen",
    readMore: "Detaillierte Analyse lesen",
  },
  cta: [
    "Verbesserungsdemo ansehen",
    "Kostenlose Beratung vereinbaren",
    "Vollständige Diagnose lesen",
    "Jetzt Verbesserung starten",
  ],
  faq: [
    {
      q: "Müssen wir unser bestehendes Hosting oder unsere Domain aufgeben?",
      a: "Nein. Wir bauen und testen die leistungsoptimierte Präsentationsschicht in einer Staging-Umgebung und wechseln sie nach Freigabe ohne Ausfallzeit live. Ihre bestehende Infrastruktur bleibt unverändert — wir haben Lighthouse-Scores von 40 auf über 90 Punkte gesteigert, ohne das Backend anzutasten.",
    },
    {
      q: "Ist der mobile Lighthouse-Score von 85+ garantiert?",
      a: "Ja. Unser Astro/Next.js-Optimierungspaket garantiert einen mobilen Lighthouse-Score von mindestens 85 Punkten. Wird dieser Wert nicht erreicht, erstatten wir die Performance-Optimierungsgebühr vollständig zurück. Der Durchschnitt aller Projekte seit 2024 liegt bei 92 Punkten.",
    },
    {
      q: "Wie sieht der Ablauf aus und wie lange dauert es?",
      a: "Ist-Analyse (3 Tage) → Visueller Neuaufbau mit Astro/Next.js (5–7 Tage) → Staging-Validierung (3 Tage) → Live-Schaltung (1 Tag). Der gesamte Zyklus kann in nur 2 Wochen abgeschlossen werden. Von Ihrer Seite sind nur zwei Termine erforderlich: das Kick-off-Gespräch und die finale Freigabe.",
    },
    {
      q: "Funktioniert das auch mit unserer bestehenden Agentur oder IT-Abteilung?",
      a: "Selbstverständlich. Wir agieren als chirurgische Performance-Schicht — wir müssen weder Ihre Agentur noch Ihr CMS oder Ihr internes Entwicklerteam ersetzen. Wir liefern eine eigenständige Präsentationsschicht, die sich nahtlos integriert, und übergeben bearbeitbare Templates für die Pflege durch Ihr Team.",
    },
    {
      q: "Welche spezifischen Anforderungen deutscher KMU werden berücksichtigt?",
      a: "Unser Paket berücksichtigt gezielt die Anforderungen des deutschen Mittelstands: DSGVO-konforme Cookie-freie Analyse, Impressumspflicht-Optimierung, Barrierefreiheit nach BITV/WCAG, sowie regionale SEO für DACH-Märkte. Darüber hinaus unterstützen wir die Integration mit gängigen deutschen Shopsystemen und ERP-Lösungen.",
    },
  ],
  reassurance: [
    "14 Tage bis zur Verbesserung — vom Kick-off bis zum Go-Live in nur 2 Wochen",
    "Leistungsgarantie — vollständige Rückerstattung bei Nichterreichen des Lighthouse 85+-Ziels",
    "Über 50 betreute KMU — aus Fertigung, Bau, Dienstleistung, Beauty und mehr",
    "Zero-Downtime-Deployment — Ihre bestehenden Systeme bleiben durchgängig online",
  ],
  offerBadges: [
    "Schnell wirksame Optimierung",
    "Ohne Code editierbar",
    "Mobil optimiert",
    "DSGVO-konform",
    "Leistungsgarantie",
  ],
  culturalNotes: {
    toneDescription:
      "Durchgängige Sie-Form im gesamten Bericht. Formelle, aber nicht verstaubte Geschäftssprache. Deutsche KMU-Entscheider schätzen präzise, faktenbasierte Aussagen — kein Marketing-Buzzword. Substantive und Komposita korrekt verwenden, anglizismen auf ein Minimum reduzieren.",
    formalityLevel: "Sie-Form (formelle Höflichkeitsform)",
    pronounPreference: "Sie / Ihr (geschäftlich-formell)",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   fr — French (Français)  |  Vouvoiement (vous form)
   ═══════════════════════════════════════════════════════════════════════════ */

const FR: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Rapport de diagnostic stratégique",
    validity: "Valable jusqu'au",
    heroKicker: "Diagnostic stratégique confidentiel",
    heroLead:
      "À partir des données publiques, des signaux collectés et d'une démo d'amélioration, nous avons identifié le premier levier à actionner parmi le chiffre d'affaires, la confiance et le parcours de contact.",
    evidenceReady: "Données collectées",
    sourceCoverage: "Couverture des données",
    monthlyLoss: "Perte d'opportunité mensuelle estimée",
    confidence: "Fiabilité des données",
    currentState: "Frictions actuelles",
    improvedState: "État après amélioration",
    diagnosticSurface: "Périmètre du diagnostic",
    priorityFindings: "Constatations prioritaires",
    businessImpact: "Impact commercial",
    firstMove: "Première action",
    whyItMatters: "Pourquoi c'est important",
    evidence: "Preuves",
    recommendation: "Action recommandée",
    roadmap: "Feuille de route 30 jours",
    dataAppendix: "Registre des données",
    sourceMeaning: "Signification commerciale",
    sourceNext: "Prochaine vérification",
    sourceMissing:
      "Les sources manquantes ne sont pas traitées comme des faits, mais comme des hypothèses à vérifier lors de la prochaine revue.",
    templateDirection: "Orientation de la proposition",
    qualityBar: "Barre de qualité",
    finalHeading: "30 minutes pour choisir la première correction",
    finalBody:
      "Avant une refonte complète, identifions ensemble le levier le plus rentable entre opportunité de chiffre d'affaires, preuve de confiance et parcours de contact.",
    emailSubject: "À propos du rapport de diagnostic",
    competitorBenchmark: "Comparatif concurrents et secteur",
    yourSite: "Votre site",
    industryAvg: "Moyenne du secteur",
    topCompetitors: "Top concurrents",
    roiTitle: "Simulation du retour sur investissement",
    paybackPeriod: "Délai de récupération estimé",
    recoveredTwelveMonths: "Chiffre d'affaires récupéré sur 12 mois",
    roiLabel: "ROI projeté",
    faqTitle: "Questions fréquentes",
    readMore: "Lire l'analyse détaillée",
  },
  cta: [
    "Voir la démo d'amélioration",
    "Réserver une consultation gratuite",
    "Lire le diagnostic complet",
    "Commencer l'amélioration",
  ],
  faq: [
    {
      q: "Devons-nous abandonner notre hébergement ou notre domaine actuel ?",
      a: "Non. Nous construisons et testons la couche de présentation optimisée dans un environnement de staging, puis la basculons en production sans interruption de service. Votre infrastructure existante reste intacte — nous avons fait passer des scores Lighthouse de 40 à plus de 90 points sans modifier le backend dans de nombreux projets.",
    },
    {
      q: "Le score Lighthouse mobile de 85+ est-il vraiment garanti ?",
      a: "Oui. Notre package d'optimisation Astro/Next.js garantit un score Lighthouse mobile de 85 points minimum. Si ce seuil n'est pas atteint, nous remboursons intégralement les frais d'optimisation de performance. La moyenne de tous nos projets depuis 2024 est de 92 points.",
    },
    {
      q: "Quel est le processus et combien de temps cela prend-il ?",
      a: "Audit initial (3 jours) → Reconstruction visuelle en Astro/Next.js (5–7 jours) → Validation en staging (3 jours) → Mise en production (1 jour). Le cycle complet peut être réalisé en seulement 2 semaines. Seuls deux points de contact sont nécessaires de votre côté : la réunion de lancement et la validation finale.",
    },
    {
      q: "Cela fonctionne-t-il avec notre agence ou notre équipe interne existante ?",
      a: "Absolument. Nous intervenons comme une couche de performance chirurgicale — nous ne remplaçons ni votre agence, ni votre CMS, ni votre équipe technique interne. Nous livrons une couche de présentation autonome qui s'intègre parfaitement à votre stack existante et fournissons des templates éditables sans code.",
    },
    {
      q: "Quelles sont les spécificités pour les PME françaises ?",
      a: "Notre offre prend en compte les exigences propres aux PME françaises : conformité RGPD, mentions légales obligatoires, accessibilité RGAA, intégration avec les solutions de paiement françaises, et SEO local pour le marché francophone. Nous vous aidons également à valoriser vos labels et certifications (Qualiopi, French Tech, etc.).",
    },
  ],
  reassurance: [
    "14 jours pour des résultats visibles — du lancement à la mise en ligne en 2 semaines",
    "Garantie de performance — remboursement intégral si le score Lighthouse 85+ n'est pas atteint",
    "Plus de 50 PME accompagnées — industrie, BTP, services, beauté et bien d'autres",
    "Déploiement sans interruption — vos systèmes restent en ligne pendant toute l'opération",
  ],
  offerBadges: [
    "Résultats rapides",
    "Éditable sans code",
    "Optimisé mobile",
    "Conforme RGPD",
    "Performance garantie",
  ],
  culturalNotes: {
    toneDescription:
      "Vouvoiement systématique ('vous' et non 'tu'). Français professionnel clair et concis, sans anglicismes superflus. Les décideurs français apprécient la rigueur et la transparence — privilégier les faits et chiffres précis au storytelling excessif. Utiliser les guillemets français (« ») et les espaces insécables selon les règles typographiques.",
    formalityLevel: "Vouvoiement (forme de politesse standard)",
    pronounPreference: "vous / votre (tutoiement exclu)",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   es — Spanish (Español)  |  Tratamiento de usted
   ═══════════════════════════════════════════════════════════════════════════ */

const ES: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Informe de diagnóstico ejecutivo",
    validity: "Válido hasta",
    heroKicker: "Diagnóstico empresarial confidencial",
    heroLead:
      "A partir de datos públicos, señales recopiladas y una demo de mejora, hemos identificado el primer paso más claro entre ingresos, confianza y flujo de consultas.",
    evidenceReady: "Datos recopilados",
    sourceCoverage: "Cobertura de evidencia",
    monthlyLoss: "Pérdida de oportunidad mensual estimada",
    confidence: "Confiabilidad de los datos",
    currentState: "Fricción actual",
    improvedState: "Estado mejorado",
    diagnosticSurface: "Alcance del diagnóstico",
    priorityFindings: "Hallazgos prioritarios",
    businessImpact: "Impacto en el negocio",
    firstMove: "Primera acción",
    whyItMatters: "Por qué es importante",
    evidence: "Evidencia",
    recommendation: "Acción recomendada",
    roadmap: "Hoja de ruta de 30 días",
    dataAppendix: "Registro de datos",
    sourceMeaning: "Significado comercial",
    sourceNext: "Próxima verificación",
    sourceMissing:
      "Las fuentes faltantes no se tratan como hechos, sino como hipótesis para la próxima revisión.",
    templateDirection: "Dirección de la propuesta",
    qualityBar: "Estándar de calidad",
    finalHeading: "En 30 minutos, elija la primera mejora",
    finalBody:
      "Antes de una reconstrucción completa, identifiquemos juntos qué palanca — oportunidad de ingresos, prueba de confianza o flujo de consultas — ofrece el retorno más rápido.",
    emailSubject: "Sobre el informe de diagnóstico",
    competitorBenchmark: "Comparativa de competidores y sector",
    yourSite: "Su sitio web",
    industryAvg: "Media del sector",
    topCompetitors: "Principales competidores",
    roiTitle: "Simulación de ROI proyectado",
    paybackPeriod: "Período de recuperación estimado",
    recoveredTwelveMonths: "Ingresos recuperados en 12 meses",
    roiLabel: "ROI proyectado",
    faqTitle: "Preguntas frecuentes",
    readMore: "Leer el análisis detallado",
  },
  cta: [
    "Ver demo de mejora",
    "Agendar consulta gratuita",
    "Leer el diagnóstico completo",
    "Comenzar la mejora ahora",
  ],
  faq: [
    {
      q: "¿Tenemos que abandonar nuestro hosting o dominio actual?",
      a: "No. Construimos y probamos la capa de presentación optimizada en un entorno de staging y la intercambiamos sin tiempo de inactividad cuando está aprobada. Su infraestructura actual no se modifica — hemos elevado puntuaciones Lighthouse de 40 a más de 90 puntos sin tocar el backend en decenas de proyectos.",
    },
    {
      q: "¿Está realmente garantizada la puntuación Lighthouse móvil de 85+?",
      a: "Sí. Nuestro paquete de optimización Astro/Next.js garantiza una puntuación Lighthouse móvil de 85 como mínimo. Si no alcanzamos este umbral, reembolsamos íntegramente los honorarios de optimización de rendimiento. La media de entrega de todos nuestros proyectos desde 2024 es de 92 puntos.",
    },
    {
      q: "¿Cómo es el proceso y cuánto tiempo lleva?",
      a: "Auditoría inicial (3 días) → Reconstrucción visual en Astro/Next.js (5–7 días) → Validación en staging (3 días) → Puesta en producción (1 día). El ciclo completo se completa en tan solo 2 semanas. Solo necesita participar en dos momentos: la reunión de inicio y la aprobación final.",
    },
    {
      q: "¿Funciona con nuestra agencia o equipo interno actual?",
      a: "Por supuesto. Actuamos como una capa quirúrgica de rendimiento — no reemplazamos a su agencia, CMS ni equipo de desarrollo. Entregamos una capa de presentación independiente que se integra perfectamente y proporcionamos plantillas editables sin código para que su equipo las mantenga.",
    },
    {
      q: "¿Qué aspectos específicos para PyMEs hispanohablantes cubre el servicio?",
      a: "Nuestro servicio incluye optimización para los mercados de habla hispana: SEO local para España y Latinoamérica, cumplimiento de la LOPD/RGPD, adaptación a las preferencias de consumo digital por país, integración con pasarelas de pago locales (Mercado Pago, Clip, Redsys) y optimización para los buscadores y plataformas más utilizados en cada región.",
    },
  ],
  reassurance: [
    "14 días para ver resultados — del inicio a la publicación en tan solo 2 semanas",
    "Rendimiento garantizado — reembolso completo si no se alcanza Lighthouse 85+",
    "Más de 50 empresas atendidas — manufactura, construcción, servicios profesionales, belleza, etc.",
    "Despliegue sin interrupciones — sus sistemas siguen funcionando durante todo el proceso",
  ],
  offerBadges: [
    "Resultados inmediatos",
    "Editable sin código",
    "Optimizado para móviles",
    "Multi-idioma",
    "Rendimiento garantizado",
  ],
  culturalNotes: {
    toneDescription:
      "Tratamiento formal de 'usted' en todo el informe. Lenguaje profesional pero cercano, adaptado al contexto empresarial hispanohablante. Evitar regionalismos marcados — usar español neutro internacional comprensible tanto en España como en Latinoamérica. Incluir apertura de signos de exclamación e interrogación (¡!) y acentos correctamente.",
    formalityLevel: "Tratamiento de usted (formal)",
    pronounPreference: "usted / su (formal, no tuteo)",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   pt — Portuguese (Português - Brasil)  |  Tratamento formal
   ═══════════════════════════════════════════════════════════════════════════ */

const PT: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Relatório de diagnóstico executivo",
    validity: "Válido até",
    heroKicker: "Diagnóstico empresarial confidencial",
    heroLead:
      "Com base em dados públicos, sinais coletados e uma demonstração de melhoria, organizamos o primeiro passo mais claro entre receita, confiança e fluxo de consultas.",
    evidenceReady: "Dados coletados",
    sourceCoverage: "Cobertura de evidências",
    monthlyLoss: "Perda de oportunidade mensal estimada",
    confidence: "Confiabilidade dos dados",
    currentState: "Fricção atual",
    improvedState: "Estado após melhoria",
    diagnosticSurface: "Escopo do diagnóstico",
    priorityFindings: "Conclusões prioritárias",
    businessImpact: "Impacto no negócio",
    firstMove: "Primeira ação",
    whyItMatters: "Por que é importante",
    evidence: "Evidências",
    recommendation: "Ação recomendada",
    roadmap: "Roteiro de 30 dias",
    dataAppendix: "Registro de dados",
    sourceMeaning: "Significado para o negócio",
    sourceNext: "Próxima verificação",
    sourceMissing:
      "Fontes ausentes não são tratadas como fatos, mas como hipóteses para a próxima revisão.",
    templateDirection: "Direção da proposta",
    qualityBar: "Padrão de qualidade",
    finalHeading: "Em 30 minutos, defina a primeira melhoria",
    finalBody:
      "Antes de uma grande reconstrução, identifique o caminho de recuperação mais fácil entre oportunidade de receita, prova de confiança e fluxo de consultas.",
    emailSubject: "Sobre o relatório de diagnóstico",
    competitorBenchmark: "Comparativo de concorrentes e setor",
    yourSite: "Seu site",
    industryAvg: "Média do setor",
    topCompetitors: "Principais concorrentes",
    roiTitle: "Simulação de ROI projetado",
    paybackPeriod: "Prazo de retorno estimado",
    recoveredTwelveMonths: "Receita recuperada em 12 meses",
    roiLabel: "ROI projetado",
    faqTitle: "Perguntas frequentes",
    readMore: "Ler análise detalhada",
  },
  cta: [
    "Ver demonstração de melhoria",
    "Agendar consultoria gratuita",
    "Ler o diagnóstico completo",
    "Começar a melhoria agora",
  ],
  faq: [
    {
      q: "Precisamos descartar nossa hospedagem ou domínio atuais?",
      a: "Não. Construímos e testamos a camada de apresentação otimizada em um ambiente de staging e a trocamos sem nenhum tempo de inatividade após a aprovação. Sua infraestrutura atual permanece intacta — já elevamos pontuações Lighthouse de 40 para mais de 90 pontos sem modificar o backend em dezenas de projetos.",
    },
    {
      q: "A pontuação Lighthouse mobile 85+ é realmente garantida?",
      a: "Sim. Nosso pacote de otimização Astro/Next.js garante uma pontuação Lighthouse mobile mínima de 85 pontos. Se não atingirmos esse patamar, reembolsamos integralmente os honorários de otimização de desempenho. A média de entrega de todos os projetos desde 2024 é de 92 pontos.",
    },
    {
      q: "Como funciona o processo e quanto tempo leva?",
      a: "Auditoria inicial (3 dias) → Reconstrução visual em Astro/Next.js (5–7 dias) → Validação em staging (3 dias) → Publicação em produção (1 dia). O ciclo completo é concluído em apenas 2 semanas. De sua parte, são necessários apenas dois momentos: a reunião inicial e a aprovação final.",
    },
    {
      q: "Funciona com nossa agência ou equipe interna atual?",
      a: "Com certeza. Atuamos como uma camada cirúrgica de desempenho — não substituímos sua agência, CMS ou equipe de desenvolvimento. Entregamos uma camada de apresentação independente que se integra perfeitamente e fornecemos templates editáveis sem código para manutenção pela sua equipe.",
    },
    {
      q: "Quais aspectos específicos para PMEs brasileiras são considerados?",
      a: "Nosso serviço contempla as necessidades do mercado brasileiro: otimização para o Google Brasil, conformidade com a LGPD, integração com meios de pagamento locais (PIX, boleto, cartão nacional), adaptação para a realidade mobile-first do Brasil, e estratégias para marketplaces regionais. Também consideramos as particularidades fiscais e de comunicação do ambiente de negócios brasileiro.",
    },
  ],
  reassurance: [
    "14 dias para ver resultados — do início à publicação em apenas 2 semanas",
    "Desempenho garantido — reembolso total se o Lighthouse 85+ não for atingido",
    "Mais de 50 empresas atendidas — indústria, construção, serviços, beleza e outros",
    "Implantação sem interrupção — seus sistemas continuam funcionando durante todo o processo",
  ],
  offerBadges: [
    "Resultados rápidos",
    "Editável sem código",
    "Otimizado para mobile",
    "Compatível com LGPD",
    "Desempenho garantido",
  ],
  culturalNotes: {
    toneDescription:
      "Português brasileiro formal usando 'você' e tratamento respeitoso consistente. Linguagem empresarial clara e direta, evitando anglicismos desnecessários. O mercado brasileiro valoriza transparência e objetividade — usar dados concretos em vez de promessas vagas. Atenção à ortografia do Acordo Ortográfico vigente e às convenções de formatação de números e moeda brasileiras.",
    formalityLevel: "Tratamento formal com você (padrão empresarial brasileiro)",
    pronounPreference: "você / seu (formal, uso consistente de 'você' e não 'tu')",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   ru — Russian (Русский)  |  Формальное Вы
   ═══════════════════════════════════════════════════════════════════════════ */

const RU: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Диагностический отчет для руководства",
    validity: "Действителен до",
    heroKicker: "Конфиденциальная бизнес-диагностика",
    heroLead:
      "На основе открытых данных, собранных сигналов и демонстрации улучшений мы определили наиболее эффективный первый шаг — в доходах, доверии или воронке обращений.",
    evidenceReady: "Собранные данные",
    sourceCoverage: "Охват данных",
    monthlyLoss: "Оценка месячных потерь возможностей",
    confidence: "Достоверность данных",
    currentState: "Текущие проблемы",
    improvedState: "Состояние после улучшения",
    diagnosticSurface: "Область диагностики",
    priorityFindings: "Приоритетные выводы",
    businessImpact: "Влияние на бизнес",
    firstMove: "Первый шаг",
    whyItMatters: "Почему это важно",
    evidence: "Доказательства",
    recommendation: "Рекомендуемое действие",
    roadmap: "План на 30 дней",
    dataAppendix: "Реестр данных",
    sourceMeaning: "Значение для бизнеса",
    sourceNext: "Следующая проверка",
    sourceMissing:
      "Отсутствующие источники не рассматриваются как факты, а считаются гипотезами для следующей проверки.",
    templateDirection: "Направление предложения",
    qualityBar: "Стандарт качества",
    finalHeading: "За 30 минут определите первое исправление",
    finalBody:
      "Перед масштабной перестройкой определите самый быстрый путь к возврату инвестиций — через доходы, доказательство доверия или воронку обращений.",
    emailSubject: "О диагностическом отчете",
    competitorBenchmark: "Сравнение с конкурентами и отраслевыми показателями",
    yourSite: "Ваш сайт",
    industryAvg: "Среднее по отрасли",
    topCompetitors: "Лучшие конкуренты",
    roiTitle: "Прогнозируемый ROI",
    paybackPeriod: "Ожидаемый срок окупаемости",
    recoveredTwelveMonths: "Возврат за 12 месяцев",
    roiLabel: "Прогноз ROI",
    faqTitle: "Часто задаваемые вопросы",
    readMore: "Читать подробный анализ",
  },
  cta: [
    "Посмотреть демо улучшений",
    "Записаться на бесплатную консультацию",
    "Читать полную диагностику",
    "Начать улучшение сейчас",
  ],
  faq: [
    {
      q: "Нужно ли отказываться от текущего хостинга или домена?",
      a: "Нет. Мы создаем и тестируем оптимизированный презентационный слой в staging-окружении и заменяем его без перерыва в работе после утверждения. Ваша текущая инфраструктура не затрагивается — мы неоднократно поднимали показатели Lighthouse с 40 до более чем 90 баллов, не изменяя бэкенд.",
    },
    {
      q: "Действительно ли гарантируется мобильный показатель Lighthouse 85+?",
      a: "Да. Наш пакет оптимизации Astro/Next.js гарантирует мобильный показатель Lighthouse не ниже 85 баллов. Если этот порог не будет достигнут, мы полностью возвращаем стоимость услуг по оптимизации производительности. Средний показатель всех проектов с 2024 года составляет 92 балла.",
    },
    {
      q: "Как выглядит процесс и сколько времени он занимает?",
      a: "Базовый аудит (3 дня) → Визуальная перестройка на Astro/Next.js (5–7 дней) → Проверка на staging (3 дня) → Запуск в продакшен (1 день). Полный цикл занимает всего 2 недели. С вашей стороны потребуется участие только в двух точках: стартовое совещание и финальное утверждение.",
    },
    {
      q: "Работает ли это с нашим текущим агентством или внутренней командой?",
      a: "Безусловно. Мы действуем как точечный слой производительности — нам не нужно заменять ваше агентство, CMS или команду разработчиков. Мы поставляем независимый презентационный слой, который легко интегрируется, и передаем редактируемые шаблоны, с которыми ваша команда может работать без программирования.",
    },
    {
      q: "Какие особенности российского рынка учитываются в услуге?",
      a: "Наш сервис адаптирован к российским реалиям: оптимизация под Яндекс и Mail.ru, соответствие требованиям 152-ФЗ о персональных данных, интеграция с российскими платежными системами, адаптация под особенности локального хостинга и CDN, а также учет поведенческих особенностей российских пользователей и предпринимателей.",
    },
  ],
  reassurance: [
    "14 дней до результата — от запуска до публикации всего 2 недели",
    "Гарантия результата — полный возврат средств при недостижении Lighthouse 85+",
    "Более 50 компаний — производство, строительство, услуги, бьюти-сфера и другие",
    "Развертывание без простоя — ваши системы продолжают работать в течение всего процесса",
  ],
  offerBadges: [
    "Быстрый результат",
    "Редактирование без кода",
    "Оптимизация для мобильных",
    "Мультиязычность",
    "Гарантия качества",
  ],
  culturalNotes: {
    toneDescription:
      "Последовательное использование 'Вы' с заглавной буквы как форма обращения к одному лицу в деловой переписке. Формальный, но не канцелярский деловой русский язык. Российские предприниматели ценят конкретику, цифры и отсутствие 'воды'. Избегать излишних американизмов и маркетинговых клише — предпочтение отдается фактам и измеримым показателям.",
    formalityLevel: "Формальное Вы (деловой русский, уважительное обращение)",
    pronounPreference: "Вы / Ваш (с заглавной буквы, формально-деловой стиль)",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   ar — Arabic (العربية)  |  Modern Standard Arabic (الفصحى)
   ═══════════════════════════════════════════════════════════════════════════ */

const AR: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "تقرير التشخيص التنفيذي",
    validity: "صالح حتى",
    heroKicker: "تقييم أعمال خاص",
    heroLead:
      "بناءً على البيانات العامة والإشارات المجمعة والعرض التوضيحي للتحسين، قمنا بتحديد الخطوة الأولى الأكثر وضوحًا عبر الإيرادات والثقة وتدفق الاستفسارات.",
    evidenceReady: "البيانات المجمعة",
    sourceCoverage: "تغطية الأدلة",
    monthlyLoss: "الخسارة الشهرية المقدرة للفرص",
    confidence: "موثوقية الأدلة",
    currentState: "الاحتكاك الحالي",
    improvedState: "الحالة بعد التحسين",
    diagnosticSurface: "نطاق التشخيص",
    priorityFindings: "النتائج ذات الأولوية",
    businessImpact: "الأثر التجاري",
    firstMove: "الخطوة الأولى",
    whyItMatters: "أهميتها",
    evidence: "الأدلة",
    recommendation: "الإجراء الموصى به",
    roadmap: "خارطة طريق ٣٠ يومًا",
    dataAppendix: "سجل البيانات",
    sourceMeaning: "المعنى التجاري",
    sourceNext: "التحقق التالي",
    sourceMissing:
      "لا تُعامل المصادر المفقودة كحقائق، بل تُعتبر فرضيات للمراجعة القادمة.",
    templateDirection: "اتجاه الاقتراح",
    qualityBar: "معيار الجودة",
    finalHeading: "٣٠ دقيقة لاختيار التحسين الأول",
    finalBody:
      "قبل إعادة البناء الشاملة، حدد أسهل مسار للاسترداد بين فرصة الإيرادات وإثبات الثقة وتدفق الاستفسارات.",
    emailSubject: "بخصوص تقرير التشخيص",
    competitorBenchmark: "مقارنة المنافسين ومعايير القطاع",
    yourSite: "موقعكم",
    industryAvg: "متوسط القطاع",
    topCompetitors: "أبرز المنافسين",
    roiTitle: "محاكاة العائد على الاستثمار المتوقع",
    paybackPeriod: "فترة الاسترداد المقدرة",
    recoveredTwelveMonths: "الإيرادات المستردة خلال ١٢ شهرًا",
    roiLabel: "العائد المتوقع على الاستثمار",
    faqTitle: "الأسئلة الشائعة",
    readMore: "قراءة التحليل المفصل",
  },
  cta: [
    "مشاهدة العرض التوضيحي للتحسين",
    "حجز استشارة مجانية",
    "قراءة التشخيص الكامل",
    "بدء التحسين الآن",
  ],
  faq: [
    {
      q: "هل نحتاج إلى التخلي عن الاستضافة أو النطاق الحالي؟",
      a: "لا. نقوم ببناء واختبار طبقة العرض المحسّنة في بيئة تجريبية واستبدالها دون أي توقف بعد الموافقة. البنية التحتية الحالية لديكم تبقى دون تغيير — لقد قمنا برفع درجات Lighthouse من ٤٠ إلى أكثر من ٩٠ نقطة دون لمس النظام الخلفي في عشرات المشاريع.",
    },
    {
      q: "هل نتيجة Lighthouse للجوال ٨٥+ مضمونة فعلاً؟",
      a: "نعم. تضمن حزمة التحسين Astro/Next.js الخاصة بنا حصول موقعكم على ٨٥ نقطة كحد أدنى في اختبار Lighthouse للجوال. إذا لم نصل إلى هذا المستوى، نقوم برد رسوم تحسين الأداء بالكامل. متوسط نتائج جميع مشاريعنا منذ ٢٠٢٤ هو ٩٢ نقطة.",
    },
    {
      q: "كيف تتم العملية وكم تستغرق من الوقت؟",
      a: "التدقيق الأساسي (٣ أيام) → إعادة البناء البصري باستخدام Astro/Next.js (٥–٧ أيام) → التحقق في البيئة التجريبية (٣ أيام) → النشر النهائي (يوم واحد). تكتمل الدورة الكاملة في أسبوعين فقط. لا تحتاجون سوى المشاركة في نقطتين: اجتماع البداية والموافقة النهائية.",
    },
    {
      q: "هل يتوافق هذا مع وكالتنا أو فريقنا الداخلي الحالي؟",
      a: "بالتأكيد. نحن نعمل كطبقة أداء جراحية — لسنا بحاجة لاستبدال وكالتكم أو نظام إدارة المحتوى أو فريق التطوير الداخلي. نقدم طبقة عرض مستقلة تتكامل بسلاسة مع بيئتكم الحالية ونقوم بتسليم قوالب قابلة للتعديل بدون برمجة.",
    },
    {
      q: "ما هي الاعتبارات الخاصة بالشركات الصغيرة والمتوسطة في الشرق الأوسط؟",
      a: "خدمتنا تأخذ في الاعتبار خصوصيات السوق في الشرق الأوسط: دعم كامل للغة العربية والتصميم من اليمين لليسار (RTL)، التوافق مع أنظمة الدفع المحلية، تحسين محركات البحث للمحتوى العربي، واحترام الخصوصيات الثقافية والتجارية. كما نراعي مواسم الذروة التجارية المحلية واختلاف سلوك المستهلك بين دول الخليج وبلاد الشام وشمال أفريقيا.",
    },
  ],
  reassurance: [
    "١٤ يومًا للتحسين — من البداية إلى النشر خلال أسبوعين فقط",
    "أداء مضمون — استرداد كامل للرسوم إذا لم نحقق نتيجة Lighthouse ٨٥+",
    "أكثر من ٥٠ شركة — التصنيع والبناء والخدمات المهنية وقطاع التجميل وغيرها",
    "نشر بدون انقطاع — أنظمتكم الحالية تبقى عاملة طوال فترة العمل",
  ],
  offerBadges: [
    "نتائج سريعة",
    "قابل للتعديل بدون برمجة",
    "محسّن للجوال",
    "دعم كامل للغة العربية",
    "أداء مضمون",
  ],
  culturalNotes: {
    toneDescription:
      "استخدام اللغة العربية الفصحى المعاصرة (Modern Standard Arabic) بأسلوب مهني محترم. تجنب العامية الإقليمية لضمان الفهم عبر جميع الدول العربية. استخدام صيغ الجمع للاحترام في المخاطبة الرسمية. مراعاة اتجاه النص من اليمين لليسار (RTL) في التصميم والتنسيق.",
    formalityLevel: "العربية الفصحى المعاصرة (Modern Standard Arabic)",
    pronounPreference: "حضرتكم / أنتم (صيغة الجمع للاحترام في المخاطبة الرسمية)",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   vi — Vietnamese (Tiếng Việt)  |  Kính ngữ (respectful tone)
   ═══════════════════════════════════════════════════════════════════════════ */

const VI: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Báo cáo chẩn đoán điều hành",
    validity: "Có hiệu lực đến",
    heroKicker: "Đánh giá kinh doanh riêng tư",
    heroLead:
      "Dựa trên dữ liệu công khai, tín hiệu thu thập được và bản demo cải thiện, chúng tôi đã xác định bước đầu tiên rõ ràng nhất giữa doanh thu, niềm tin và luồng yêu cầu.",
    evidenceReady: "Dữ liệu đã thu thập",
    sourceCoverage: "Phạm vi bằng chứng",
    monthlyLoss: "Tổn thất cơ hội hàng tháng ước tính",
    confidence: "Độ tin cậy của bằng chứng",
    currentState: "Điểm ma sát hiện tại",
    improvedState: "Trạng thái sau cải thiện",
    diagnosticSurface: "Phạm vi chẩn đoán",
    priorityFindings: "Phát hiện ưu tiên",
    businessImpact: "Tác động kinh doanh",
    firstMove: "Hành động đầu tiên",
    whyItMatters: "Tại sao quan trọng",
    evidence: "Bằng chứng",
    recommendation: "Hành động đề xuất",
    roadmap: "Lộ trình 30 ngày",
    dataAppendix: "Sổ dữ liệu",
    sourceMeaning: "Ý nghĩa kinh doanh",
    sourceNext: "Bước kiểm tra tiếp theo",
    sourceMissing:
      "Các nguồn dữ liệu còn thiếu không được coi là sự thật, mà là giả thuyết cần xác minh trong lần đánh giá tiếp theo.",
    templateDirection: "Hướng đề xuất",
    qualityBar: "Tiêu chuẩn chất lượng",
    finalHeading: "Dành 30 phút để chọn cải thiện đầu tiên",
    finalBody:
      "Trước khi xây dựng lại toàn diện, hãy xác định đường dẫn phục hồi dễ nhất giữa cơ hội doanh thu, bằng chứng niềm tin và luồng yêu cầu.",
    emailSubject: "Về báo cáo chẩn đoán",
    competitorBenchmark: "So sánh đối thủ cạnh tranh và ngành",
    yourSite: "Trang web của Quý vị",
    industryAvg: "Trung bình ngành",
    topCompetitors: "Đối thủ hàng đầu",
    roiTitle: "Mô phỏng ROI dự kiến",
    paybackPeriod: "Thời gian thu hồi vốn ước tính",
    recoveredTwelveMonths: "Doanh thu thu hồi trong 12 tháng",
    roiLabel: "ROI dự kiến",
    faqTitle: "Câu hỏi thường gặp",
    readMore: "Đọc phân tích chi tiết",
  },
  cta: [
    "Xem demo cải thiện",
    "Đặt lịch tư vấn miễn phí",
    "Đọc chẩn đoán đầy đủ",
    "Bắt đầu cải thiện ngay",
  ],
  faq: [
    {
      q: "Chúng tôi có cần từ bỏ hosting hoặc tên miền hiện tại không?",
      a: "Không. Chúng tôi xây dựng và kiểm thử lớp trình bày hiệu suất cao trong môi trường staging và hoán đổi không gián đoạn sau khi được phê duyệt. Cơ sở hạ tầng hiện tại của Quý vị không bị ảnh hưởng — chúng tôi đã nâng điểm Lighthouse từ 40 lên hơn 90 điểm mà không cần thay đổi backend trong hàng chục dự án.",
    },
    {
      q: "Điểm Lighthouse di động 85+ có thực sự được đảm bảo không?",
      a: "Có. Gói tối ưu hóa Astro/Next.js của chúng tôi đảm bảo điểm Lighthouse di động tối thiểu 85 điểm. Nếu không đạt được ngưỡng này, chúng tôi sẽ hoàn trả toàn bộ phí tối ưu hiệu suất. Điểm trung bình của tất cả dự án từ năm 2024 là 92 điểm.",
    },
    {
      q: "Quy trình diễn ra như thế nào và mất bao lâu?",
      a: "Kiểm tra cơ bản (3 ngày) → Xây dựng lại trực quan bằng Astro/Next.js (5–7 ngày) → Xác thực staging (3 ngày) → Triển khai chính thức (1 ngày). Toàn bộ chu kỳ hoàn thành trong vòng 2 tuần. Quý vị chỉ cần tham gia hai điểm: cuộc họp khởi động và phê duyệt cuối cùng.",
    },
    {
      q: "Dịch vụ này có hoạt động cùng với đại lý hoặc đội ngũ nội bộ hiện tại của chúng tôi không?",
      a: "Hoàn toàn có thể. Chúng tôi hoạt động như một lớp hiệu suất phẫu thuật — chúng tôi không cần thay thế đại lý, CMS hoặc đội ngũ phát triển nội bộ của Quý vị. Chúng tôi cung cấp một lớp trình bày độc lập tích hợp liền mạch và bàn giao các mẫu có thể chỉnh sửa mà không cần lập trình.",
    },
    {
      q: "Dịch vụ này có phù hợp với doanh nghiệp vừa và nhỏ tại Việt Nam không?",
      a: "Có. Gói dịch vụ của chúng tôi được thiết kế phù hợp với điều kiện thị trường Việt Nam: tối ưu hóa cho tốc độ mạng 3G/4G phổ biến, hỗ trợ đa nền tảng thanh toán nội địa (Momo, ZaloPay, VNPay), tích hợp với Zalo OA và Facebook cho doanh nghiệp, cùng chiến lược SEO phù hợp với hành vi tìm kiếm của người dùng Việt.",
    },
  ],
  reassurance: [
    "14 ngày để cải thiện — từ khởi động đến triển khai chỉ trong 2 tuần",
    "Hiệu suất được đảm bảo — hoàn tiền đầy đủ nếu không đạt Lighthouse 85+",
    "Hơn 50 doanh nghiệp đã phục vụ — sản xuất, xây dựng, dịch vụ chuyên nghiệp, làm đẹp và hơn thế nữa",
    "Triển khai không gián đoạn — hệ thống hiện tại vẫn hoạt động trong suốt quá trình",
  ],
  offerBadges: [
    "Kết quả nhanh chóng",
    "Chỉnh sửa không cần code",
    "Tối ưu cho di động",
    "Hỗ trợ đa ngôn ngữ",
    "Đảm bảo chất lượng",
  ],
  culturalNotes: {
    toneDescription:
      "Sử dụng kính ngữ trong toàn bộ báo cáo (Quý vị, Quý doanh nghiệp). Tiếng Việt trang trọng phù hợp với văn bản kinh doanh nhưng không quá cứng nhắc. Doanh nhân Việt Nam đánh giá cao sự tôn trọng, cụ thể và minh bạch. Tránh dùng từ địa phương — sử dụng tiếng Việt phổ thông dễ hiểu trên toàn quốc.",
    formalityLevel: "Kính ngữ (trang trọng, tôn trọng)",
    pronounPreference: "Quý vị / Quý doanh nghiệp (đại từ kính ngữ trong thương mại)",
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   id — Indonesian (Bahasa Indonesia)  |  Formal "Anda"
   ═══════════════════════════════════════════════════════════════════════════ */

const ID: ReportLocaleData = {
  ui: {
    brand: "Paradigm Revenue OS",
    privateReport: "Laporan diagnostik eksekutif",
    validity: "Berlaku hingga",
    heroKicker: "Penilaian bisnis privat",
    heroLead:
      "Berdasarkan data publik, sinyal yang terkumpul, dan demo perbaikan, kami telah mengidentifikasi langkah pertama yang paling jelas di antara pendapatan, kepercayaan, dan alur permintaan.",
    evidenceReady: "Data terkumpul",
    sourceCoverage: "Cakupan bukti",
    monthlyLoss: "Estimasi kehilangan peluang bulanan",
    confidence: "Tingkat kepercayaan bukti",
    currentState: "Gesekan saat ini",
    improvedState: "Kondisi setelah perbaikan",
    diagnosticSurface: "Cakupan diagnosis",
    priorityFindings: "Temuan prioritas",
    businessImpact: "Dampak bisnis",
    firstMove: "Langkah pertama",
    whyItMatters: "Mengapa penting",
    evidence: "Bukti",
    recommendation: "Tindakan yang direkomendasikan",
    roadmap: "Peta jalan 30 hari",
    dataAppendix: "Buku data",
    sourceMeaning: "Makna bisnis",
    sourceNext: "Pemeriksaan berikutnya",
    sourceMissing:
      "Sumber yang hilang tidak dianggap sebagai fakta, melainkan sebagai hipotesis untuk ditinjau pada pemeriksaan berikutnya.",
    templateDirection: "Arah proposal",
    qualityBar: "Standar kualitas",
    finalHeading: "Gunakan 30 menit untuk memilih perbaikan pertama",
    finalBody:
      "Sebelum pembangunan ulang besar, identifikasi jalur pemulihan termudah antara peluang pendapatan, bukti kepercayaan, dan alur permintaan.",
    emailSubject: "Tentang laporan diagnostik",
    competitorBenchmark: "Perbandingan pesaing dan tolok ukur industri",
    yourSite: "Situs Anda",
    industryAvg: "Rata-rata industri",
    topCompetitors: "Pesaing teratas",
    roiTitle: "Simulasi proyeksi ROI",
    paybackPeriod: "Estimasi periode pengembalian",
    recoveredTwelveMonths: "Pendapatan pulih dalam 12 bulan",
    roiLabel: "ROI yang diproyeksikan",
    faqTitle: "Pertanyaan umum",
    readMore: "Baca analisis selengkapnya",
  },
  cta: [
    "Lihat demo perbaikan",
    "Jadwalkan konsultasi gratis",
    "Baca diagnosis lengkap",
    "Mulai perbaikan sekarang",
  ],
  faq: [
    {
      q: "Apakah kami harus meninggalkan hosting atau domain yang ada?",
      a: "Tidak. Kami membangun dan menguji lapisan presentasi berkinerja tinggi di lingkungan staging dan menggantinya tanpa waktu henti setelah disetujui. Infrastruktur Anda saat ini tidak tersentuh — kami telah meningkatkan skor Lighthouse dari 40 ke lebih dari 90 tanpa menyentuh backend di puluhan proyek.",
    },
    {
      q: "Apakah skor Lighthouse seluler 85+ benar-benar dijamin?",
      a: "Ya. Paket optimalisasi Astro/Next.js kami menjamin skor Lighthouse seluler minimal 85 poin. Jika kami tidak mencapai ambang ini, kami mengembalikan penuh biaya optimalisasi performa. Rata-rata skor semua proyek sejak 2024 adalah 92 poin.",
    },
    {
      q: "Bagaimana prosesnya dan berapa lama waktu yang dibutuhkan?",
      a: "Audit awal (3 hari) → Pembangunan ulang visual menggunakan Astro/Next.js (5–7 hari) → Validasi staging (3 hari) → Peluncuran produksi (1 hari). Seluruh siklus selesai hanya dalam 2 minggu. Anda hanya perlu berpartisipasi dalam dua titik: rapat awal dan persetujuan akhir.",
    },
    {
      q: "Apakah ini bisa bekerja bersama agensi atau tim internal kami yang sudah ada?",
      a: "Tentu. Kami beroperasi sebagai lapisan performa bedah — kami tidak perlu mengganti agensi, CMS, atau tim pengembangan internal Anda. Kami memberikan lapisan presentasi mandiri yang terintegrasi dengan lancar dan menyerahkan template yang dapat diedit tanpa coding untuk dipelihara oleh tim Anda.",
    },
    {
      q: "Apakah layanan ini cocok untuk UKM di Indonesia?",
      a: "Ya. Paket kami dirancang dengan mempertimbangkan kondisi pasar Indonesia: optimalisasi untuk koneksi seluler yang dominan, integrasi dengan platform pembayaran lokal (GoPay, OVO, Dana, QRIS), dukungan untuk ekosistem e-commerce Indonesia, serta strategi SEO yang mempertimbangkan perilaku pencarian pengguna Indonesia di Google dan media sosial. Kami juga memahami pentingnya kehadiran di WhatsApp Business dan marketplace seperti Tokopedia dan Shopee.",
    },
  ],
  reassurance: [
    "14 hari menuju perbaikan — dari awal hingga peluncuran hanya dalam 2 minggu",
    "Performa dijamin — pengembalian dana penuh jika Lighthouse 85+ tidak tercapai",
    "Lebih dari 50 UKM telah dilayani — manufaktur, konstruksi, jasa profesional, kecantikan, dan lainnya",
    "Peluncuran tanpa downtime — sistem Anda tetap berjalan sepanjang proses",
  ],
  offerBadges: [
    "Hasil cepat",
    "Dapat diedit tanpa koding",
    "Dioptimalkan untuk seluler",
    "Dukungan multi-bahasa",
    "Performa dijamin",
  ],
  culturalNotes: {
    toneDescription:
      "Bahasa Indonesia formal dengan konsistensi penggunaan 'Anda' sebagai kata ganti orang kedua. Gaya bahasa bisnis Indonesia yang sopan, lugas, dan tidak bertele-tele. Pelaku UKM Indonesia menghargai penjelasan yang konkret, manfaat yang jelas, dan transparansi — hindari istilah teknis yang tidak perlu. Gunakan format angka dan mata uang sesuai konvensi Indonesia.",
    formalityLevel: "Bahasa Indonesia formal (Anda)",
    pronounPreference: "Anda (baku, formal, bentuk hormat standar bisnis)",
  },
}

/* ───── Exports ───── */

export const REPORT_I18N: Record<Locale, ReportLocaleData> = {
  ja: JA,
  en: EN,
  ko: KO,
  zh: ZH,
  de: DE,
  fr: FR,
  es: ES,
  pt: PT,
  ru: RU,
  ar: AR,
  vi: VI,
  id: ID,
}

export {
  JA,
  EN,
  KO,
  ZH,
  DE,
  FR,
  ES,
  PT,
  RU,
  AR,
  VI,
  ID,
}
