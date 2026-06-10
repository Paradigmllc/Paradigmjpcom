/**
 * report-i18n-ko-zh.ts — Korean (한국어) + Chinese Simplified (简体中文)
 * ko: 합쇼체 (formal polite)
 * zh: Polite business tone
 */

import type { ReportLocaleData } from "./report-i18n-shared"

/* ═══════════════════════════════════════════════════════════════════════════
   ko — Korean (한국어)  |  합쇼체 (formal polite)
   ═══════════════════════════════════════════════════════════════════════════ */

export const KO: ReportLocaleData = {
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

export const ZH: ReportLocaleData = {
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
