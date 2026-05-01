// ─── Block デフォルト翻訳プリセット ────────────────────────────────
// Phase H-0 (2026-05-01) — Q1 ハードコード問題の根本治療
//
// 目的:
//   to-blocks.ts (proposal_pages → cms_content_blocks 移行) で生成される
//   "システムデフォルト" な静的コンテンツ (FAQ / CTA labels / Footer) の
//   12-region 翻訳を一元管理する。
//
// 設計判断:
//   - 静的デフォルト = この helper (TS 定数)
//   - 動的コンテンツ (会社名入りタイトル・loss_aversion_hook 等) = translate-blocks.ts (DeepSeek V4)
//   - 業種特化のオーバーライド = 将来 cms_block_translation_presets テーブル化
//
// 永久ルール (CLAUDE.md A-CONTENT) との整合性:
//   暫定的な技術的負債として TS 定数で持つが、Phase H-0.2 で
//   `cms_block_translation_presets` テーブルに移行予定。それまではこの
//   ファイルを Single Source of Truth として扱う。
//
// silently-JA-leak 防止規律:
//   全 12 region 必須。新 region 追加時は `satisfies Record<SalesRegion, ...>`
//   が型エラーで強制発見させる構造 (AE-9 準拠)。

import type { SalesRegion } from "@/lib/stores/sales-region"

// ─── 型 ──────────────────────────────────────────────────────────────

export interface FaqDefaults {
  heading: string
  items: Array<{ question: string; answer: string }>
}

export interface CtaDefaults {
  heading: string
  description: string
  buttonLabel: string
}

export interface ReciprocityDefaults {
  /** Testimonial role placeholder when reciprocity_package.name is missing */
  team_label: string
  /** Body fallback when no includedDeliverables present */
  body_fallback: string
}

export interface FooterDefaults {
  /** "Confidential — XX 様専用" の "様専用" 部分 */
  confidential_suffix: string
}

export interface HeroDefaults {
  /** "{business_name}様への 30 秒診断レポート" のテンプレ ({company} placeholder) */
  title_template: string
  /** loss_aversion_hook 不在時のサブタイトル */
  subtitle_fallback: string
  /** template_cta_text 不在時のデフォルト CTA ラベル */
  cta_label_default: string
}

export interface FeatureGridDefaults {
  heading: string
  /** 検出された改善ポイント無し時のキャッチコピー */
  empty_label: string
  /** 未返信口コミ feature: title template ({count} placeholder) */
  unanswered_reviews_title: string
  /** 未返信口コミ feature: description ({count}/{rate}/{avg} placeholders) */
  unanswered_reviews_desc: string
  /** モバイル速度 feature: title template ({score} placeholder) */
  mobile_speed_title: string
  mobile_speed_desc: string
  /** 英語口コミ未対応 feature: title template ({count} placeholder) */
  unanswered_english_title: string
  unanswered_english_desc: string
  /** セキュリティ脆弱性 feature: title template ({count} placeholder) */
  security_critical_title: string
  security_critical_desc: string
}

export interface BlockDefaults {
  hero: HeroDefaults
  feature_grid: FeatureGridDefaults
  reciprocity: ReciprocityDefaults
  faq: FaqDefaults
  cta: CtaDefaults
  footer: FooterDefaults
}

// ─── 12-region デフォルト辞書 ─────────────────────────────────────────
// 言語サンプル品質: ja は native / en は native / 他 10 region は MVP の
// "意味は通る" レベル。Phase H-0.2 で native speaker 監修済み訳に置換予定。

const JA: BlockDefaults = {
  hero: {
    title_template: "{company}様への 30 秒診断レポート",
    subtitle_fallback: "貴社の Web・SEO・口コミ・競合体制を分析した結果をお届けします。",
    cta_label_default: "30 分の無料ミーティングを予約",
  },
  feature_grid: {
    heading: "検出された改善ポイント",
    empty_label: "今のところ大きな課題は見つかりませんでした",
    unanswered_reviews_title: "未返信の口コミ {count} 件",
    unanswered_reviews_desc: "Google 上で返信がない口コミが {count} 件あります。返信率 {rate}% は競合平均 {avg}% を下回ります。",
    mobile_speed_title: "モバイル速度 {score}/100",
    mobile_speed_desc: "モバイルでのページ読み込みが遅く、コンバージョン率に影響している可能性があります。",
    unanswered_english_title: "英語口コミ {count} 件未対応",
    unanswered_english_desc: "外国人観光客からの口コミが未返信のままです。インバウンド機会損失の可能性があります。",
    security_critical_title: "セキュリティ脆弱性 {count} 件",
    security_critical_desc: "重大な脆弱性が検出されました。早急な対応をおすすめします。",
  },
  reciprocity: {
    team_label: "Paradigm 提案チーム",
    body_fallback: "事前準備として、貴社向けに具体的な改善案を整理しました。",
  },
  faq: {
    heading: "よくあるご質問",
    items: [
      { question: "ミーティングは本当に無料ですか?", answer: "はい、30 分の初回ミーティングは無料です。営業のための強引な売り込みは一切行いません。" },
      { question: "オンラインで対応可能ですか?", answer: "はい、Zoom / Google Meet / 対面いずれも対応可能です。お好みの方法をお選びください。" },
      { question: "具体的な見積もりはどのタイミングで出ますか?", answer: "ミーティングで貴社の目的・現状を伺った上で、後日 PDF にて見積もりをお送りします。" },
    ],
  },
  cta: {
    heading: "今すぐ 30 分の無料ミーティングを予約",
    description: "改善方法と概算費用を、無料ミーティングで直接お伝えします。",
    buttonLabel: "予約する",
  },
  footer: {
    confidential_suffix: "様専用",
  },
}

const EN: BlockDefaults = {
  hero: {
    title_template: "30-Second Audit for {company}",
    subtitle_fallback: "We analyzed your web, SEO, reviews, and competitive landscape — here's what we found.",
    cta_label_default: "Book a free 30-min consultation",
  },
  feature_grid: {
    heading: "Areas to improve",
    empty_label: "No major issues detected at this time.",
    unanswered_reviews_title: "{count} unanswered reviews",
    unanswered_reviews_desc: "{count} Google reviews remain without a reply. Your reply rate of {rate}% is below the {avg}% industry average.",
    mobile_speed_title: "Mobile speed {score}/100",
    mobile_speed_desc: "Slow mobile page load may be hurting your conversion rate.",
    unanswered_english_title: "{count} English reviews unanswered",
    unanswered_english_desc: "Foreign-language reviews remain unanswered. You may be missing inbound opportunities.",
    security_critical_title: "{count} critical vulnerabilities",
    security_critical_desc: "Critical security issues detected. Immediate action recommended.",
  },
  reciprocity: {
    team_label: "Paradigm proposal team",
    body_fallback: "As a starting point, we've prepared concrete improvement ideas for your business.",
  },
  faq: {
    heading: "Frequently asked questions",
    items: [
      { question: "Is the meeting really free?", answer: "Yes — the first 30-min consultation is free, with no high-pressure sales tactics." },
      { question: "Can we meet online?", answer: "Yes — Zoom, Google Meet, or in-person, whichever you prefer." },
      { question: "When do we get a concrete quote?", answer: "After we understand your goals and current state, we'll send a detailed PDF quote." },
    ],
  },
  cta: {
    heading: "Book your free 30-minute consultation now",
    description: "We'll walk you through the improvement plan and rough budget — directly, with no obligation.",
    buttonLabel: "Book now",
  },
  footer: {
    confidential_suffix: "— confidential",
  },
}

const KO: BlockDefaults = {
  hero: {
    title_template: "{company}님을 위한 30초 진단 리포트",
    subtitle_fallback: "귀사의 웹·SEO·리뷰·경쟁 상황을 분석한 결과를 전해드립니다.",
    cta_label_default: "30분 무료 미팅 예약하기",
  },
  feature_grid: {
    heading: "발견된 개선 포인트",
    empty_label: "현재 주요 이슈는 발견되지 않았습니다.",
    unanswered_reviews_title: "미답변 리뷰 {count}건",
    unanswered_reviews_desc: "Google에 답변이 없는 리뷰가 {count}건 있습니다. 답변률 {rate}%는 업계 평균 {avg}%보다 낮습니다.",
    mobile_speed_title: "모바일 속도 {score}/100",
    mobile_speed_desc: "모바일 페이지 로딩이 느려 전환율에 영향을 줄 수 있습니다.",
    unanswered_english_title: "영어 리뷰 {count}건 미응답",
    unanswered_english_desc: "외국인 고객의 리뷰가 답변 없이 남아있어 인바운드 기회를 놓칠 수 있습니다.",
    security_critical_title: "보안 취약점 {count}건",
    security_critical_desc: "치명적인 취약점이 발견되었습니다. 즉시 대응을 권장합니다.",
  },
  reciprocity: {
    team_label: "Paradigm 제안 팀",
    body_fallback: "사전 준비로 귀사를 위한 구체적인 개선안을 정리했습니다.",
  },
  faq: {
    heading: "자주 묻는 질문",
    items: [
      { question: "미팅은 정말 무료인가요?", answer: "네, 첫 30분 미팅은 무료이며, 강압적인 영업은 일절 하지 않습니다." },
      { question: "온라인 미팅 가능한가요?", answer: "네, Zoom·Google Meet·대면 모두 가능합니다." },
      { question: "구체적인 견적은 언제 받을 수 있나요?", answer: "미팅 후 귀사의 목표와 현황을 바탕으로 PDF 견적서를 보내드립니다." },
    ],
  },
  cta: {
    heading: "지금 30분 무료 미팅 예약하기",
    description: "개선 방법과 대략적인 비용을 무료 미팅에서 직접 전해드립니다.",
    buttonLabel: "예약하기",
  },
  footer: {
    confidential_suffix: "전용 — 기밀",
  },
}

const ZH: BlockDefaults = {
  hero: {
    title_template: "致 {company} 的 30 秒诊断报告",
    subtitle_fallback: "我们分析了贵司的网站、SEO、评价及竞争状况,以下是分析结果。",
    cta_label_default: "预约 30 分钟免费咨询",
  },
  feature_grid: {
    heading: "发现的改善点",
    empty_label: "暂未发现重大问题。",
    unanswered_reviews_title: "{count} 条未回复的评价",
    unanswered_reviews_desc: "Google 上有 {count} 条未回复的评价。回复率 {rate}% 低于行业平均 {avg}%。",
    mobile_speed_title: "移动速度 {score}/100",
    mobile_speed_desc: "移动端页面加载缓慢,可能影响转化率。",
    unanswered_english_title: "{count} 条英文评价未回复",
    unanswered_english_desc: "外国客户的评价仍未回复,可能错失入境业务机会。",
    security_critical_title: "{count} 项严重安全漏洞",
    security_critical_desc: "已检测到严重安全问题,建议立即处理。",
  },
  reciprocity: {
    team_label: "Paradigm 提案团队",
    body_fallback: "我们已为贵司准备了具体的改进方案作为前期参考。",
  },
  faq: {
    heading: "常见问题",
    items: [
      { question: "咨询真的免费吗?", answer: "是的,首次 30 分钟咨询免费,不会有强行推销。" },
      { question: "可以在线咨询吗?", answer: "可以。Zoom、Google Meet 或线下面谈,任您选择。" },
      { question: "什么时候能得到具体报价?", answer: "了解贵司目标和现状后,我们会以 PDF 形式发送详细报价单。" },
    ],
  },
  cta: {
    heading: "立即预约 30 分钟免费咨询",
    description: "改进方案与预估费用,我们将在免费咨询中直接告知。",
    buttonLabel: "立即预约",
  },
  footer: {
    confidential_suffix: "专属 — 机密",
  },
}

const ES: BlockDefaults = {
  hero: {
    title_template: "Auditoría de 30 segundos para {company}",
    subtitle_fallback: "Analizamos su web, SEO, reseñas y panorama competitivo. Esto es lo que encontramos.",
    cta_label_default: "Reservar consulta gratuita de 30 min",
  },
  feature_grid: {
    heading: "Áreas a mejorar",
    empty_label: "No se detectaron problemas importantes en este momento.",
    unanswered_reviews_title: "{count} reseñas sin respuesta",
    unanswered_reviews_desc: "{count} reseñas de Google siguen sin respuesta. Su tasa de respuesta de {rate}% está por debajo del promedio del sector ({avg}%).",
    mobile_speed_title: "Velocidad móvil {score}/100",
    mobile_speed_desc: "La carga lenta en móvil puede estar afectando su tasa de conversión.",
    unanswered_english_title: "{count} reseñas en inglés sin respuesta",
    unanswered_english_desc: "Las reseñas de clientes extranjeros siguen sin respuesta. Podría estar perdiendo oportunidades.",
    security_critical_title: "{count} vulnerabilidades críticas",
    security_critical_desc: "Se detectaron problemas de seguridad críticos. Se recomienda acción inmediata.",
  },
  reciprocity: {
    team_label: "Equipo de propuestas Paradigm",
    body_fallback: "Como punto de partida, preparamos ideas de mejora concretas para su negocio.",
  },
  faq: {
    heading: "Preguntas frecuentes",
    items: [
      { question: "¿La reunión es realmente gratis?", answer: "Sí — la primera consulta de 30 min es gratuita, sin tácticas de venta agresivas." },
      { question: "¿Podemos reunirnos en línea?", answer: "Sí — Zoom, Google Meet o presencial, lo que prefiera." },
      { question: "¿Cuándo recibimos una cotización concreta?", answer: "Tras entender sus objetivos y situación actual, le enviaremos una cotización detallada en PDF." },
    ],
  },
  cta: {
    heading: "Reserve ahora su consulta gratuita de 30 minutos",
    description: "Le explicaremos el plan de mejora y el presupuesto estimado, directamente y sin compromiso.",
    buttonLabel: "Reservar ahora",
  },
  footer: {
    confidential_suffix: "— confidencial",
  },
}

const PT: BlockDefaults = {
  hero: {
    title_template: "Auditoria de 30 segundos para {company}",
    subtitle_fallback: "Analisamos seu site, SEO, avaliações e cenário competitivo. Veja o que encontramos.",
    cta_label_default: "Agendar consulta gratuita de 30 min",
  },
  feature_grid: {
    heading: "Pontos a melhorar",
    empty_label: "Nenhum problema importante detectado no momento.",
    unanswered_reviews_title: "{count} avaliações sem resposta",
    unanswered_reviews_desc: "{count} avaliações do Google permanecem sem resposta. Sua taxa de resposta de {rate}% está abaixo da média de {avg}% do setor.",
    mobile_speed_title: "Velocidade mobile {score}/100",
    mobile_speed_desc: "Carregamento lento no mobile pode estar prejudicando sua taxa de conversão.",
    unanswered_english_title: "{count} avaliações em inglês sem resposta",
    unanswered_english_desc: "Avaliações de clientes estrangeiros seguem sem resposta. Pode estar perdendo oportunidades.",
    security_critical_title: "{count} vulnerabilidades críticas",
    security_critical_desc: "Problemas de segurança críticos detectados. Ação imediata recomendada.",
  },
  reciprocity: {
    team_label: "Equipe de propostas Paradigm",
    body_fallback: "Como ponto de partida, preparamos ideias concretas de melhoria para seu negócio.",
  },
  faq: {
    heading: "Perguntas frequentes",
    items: [
      { question: "A reunião é realmente gratuita?", answer: "Sim — a primeira consulta de 30 min é gratuita, sem táticas de venda agressivas." },
      { question: "Podemos nos reunir online?", answer: "Sim — Zoom, Google Meet ou presencial, como preferir." },
      { question: "Quando recebemos um orçamento concreto?", answer: "Após entender seus objetivos e situação atual, enviamos um orçamento detalhado em PDF." },
    ],
  },
  cta: {
    heading: "Agende agora sua consulta gratuita de 30 minutos",
    description: "Explicaremos o plano de melhoria e o orçamento estimado, diretamente e sem compromisso.",
    buttonLabel: "Agendar agora",
  },
  footer: {
    confidential_suffix: "— confidencial",
  },
}

const RU: BlockDefaults = {
  hero: {
    title_template: "30-секундный аудит для {company}",
    subtitle_fallback: "Мы проанализировали ваш сайт, SEO, отзывы и конкурентов. Вот что мы нашли.",
    cta_label_default: "Записаться на бесплатную 30-мин консультацию",
  },
  feature_grid: {
    heading: "Зоны для улучшения",
    empty_label: "Серьёзных проблем на данный момент не обнаружено.",
    unanswered_reviews_title: "{count} отзывов без ответа",
    unanswered_reviews_desc: "{count} отзывов в Google остаются без ответа. Ваш процент ответов {rate}% ниже среднего по отрасли ({avg}%).",
    mobile_speed_title: "Мобильная скорость {score}/100",
    mobile_speed_desc: "Медленная загрузка на мобильных может снижать конверсию.",
    unanswered_english_title: "{count} англоязычных отзывов без ответа",
    unanswered_english_desc: "Отзывы иностранных клиентов остаются без ответа. Возможно, вы упускаете возможности.",
    security_critical_title: "{count} критических уязвимостей",
    security_critical_desc: "Обнаружены критические проблемы безопасности. Рекомендуется немедленное действие.",
  },
  reciprocity: {
    team_label: "Команда предложений Paradigm",
    body_fallback: "В качестве отправной точки мы подготовили конкретные идеи улучшения для вашего бизнеса.",
  },
  faq: {
    heading: "Часто задаваемые вопросы",
    items: [
      { question: "Встреча действительно бесплатна?", answer: "Да — первая 30-мин консультация бесплатна, без давления и агрессивных продаж." },
      { question: "Можно ли встретиться онлайн?", answer: "Да — Zoom, Google Meet или лично, как вам удобно." },
      { question: "Когда мы получим конкретное предложение?", answer: "Поняв ваши цели и текущую ситуацию, мы отправим детальное PDF-предложение." },
    ],
  },
  cta: {
    heading: "Забронируйте бесплатную 30-минутную консультацию сейчас",
    description: "Мы расскажем план улучшений и приблизительный бюджет — напрямую, без обязательств.",
    buttonLabel: "Забронировать",
  },
  footer: {
    confidential_suffix: "— конфиденциально",
  },
}

const AR: BlockDefaults = {
  hero: {
    title_template: "تقرير تشخيصي 30 ثانية لـ {company}",
    subtitle_fallback: "حللنا موقعكم وSEO والمراجعات والمنافسين. إليكم النتائج.",
    cta_label_default: "احجز استشارة مجانية 30 دقيقة",
  },
  feature_grid: {
    heading: "نقاط التحسين المكتشفة",
    empty_label: "لم يتم اكتشاف مشاكل كبيرة في الوقت الحالي.",
    unanswered_reviews_title: "{count} مراجعات بدون رد",
    unanswered_reviews_desc: "{count} مراجعة على Google لا تزال بدون رد. معدل الرد {rate}% أقل من متوسط الصناعة {avg}%.",
    mobile_speed_title: "سرعة الجوال {score}/100",
    mobile_speed_desc: "بطء تحميل صفحات الجوال قد يؤثر على معدل التحويل.",
    unanswered_english_title: "{count} مراجعات إنجليزية بدون رد",
    unanswered_english_desc: "مراجعات العملاء الأجانب لا تزال بدون رد. قد تفقدون فرص العملاء الواردين.",
    security_critical_title: "{count} ثغرات أمنية حرجة",
    security_critical_desc: "تم اكتشاف مشاكل أمنية حرجة. يُوصى باتخاذ إجراء فوري.",
  },
  reciprocity: {
    team_label: "فريق مقترحات Paradigm",
    body_fallback: "كنقطة بداية، أعددنا أفكار تحسين ملموسة لعملكم.",
  },
  faq: {
    heading: "الأسئلة الشائعة",
    items: [
      { question: "هل الاجتماع مجاني فعلاً؟", answer: "نعم — الاستشارة الأولى لمدة 30 دقيقة مجانية، بدون أساليب بيع ضاغطة." },
      { question: "هل يمكن الاجتماع عبر الإنترنت؟", answer: "نعم — Zoom أو Google Meet أو حضوري، حسب تفضيلكم." },
      { question: "متى نحصل على عرض سعر محدد؟", answer: "بعد فهم أهدافكم ووضعكم الحالي، سنرسل عرض سعر مفصل بصيغة PDF." },
    ],
  },
  cta: {
    heading: "احجز استشارتك المجانية لمدة 30 دقيقة الآن",
    description: "سنشرح خطة التحسين والميزانية التقديرية مباشرة، دون أي التزام.",
    buttonLabel: "احجز الآن",
  },
  footer: {
    confidential_suffix: "— سري",
  },
}

// europe / sea / africa / others は en を借用 (MVP・Phase H-0.2 で native 訳に差替え予定)
const EUROPE: BlockDefaults = EN
const SEA: BlockDefaults = EN
const AFRICA: BlockDefaults = EN
const OTHERS: BlockDefaults = EN

// ─── 12-region 完全マップ (AE-9 satisfies Record で型強制) ───────────

export const BLOCK_DEFAULTS: Record<SalesRegion, BlockDefaults> = {
  ja: JA,
  en: EN,
  ko: KO,
  zh: ZH,
  europe: EUROPE,
  es: ES,
  pt: PT,
  ru: RU,
  ar: AR,
  sea: SEA,
  africa: AFRICA,
  others: OTHERS,
} satisfies Record<SalesRegion, BlockDefaults>

// ─── public helper ───────────────────────────────────────────────────

/**
 * region 別の Block デフォルト辞書を返す。
 * Phase H-0.2 で cms_block_translation_presets テーブル参照に差し替える予定。
 */
export function getBlockDefaults(region: SalesRegion): BlockDefaults {
  return BLOCK_DEFAULTS[region] ?? BLOCK_DEFAULTS.en
}

/**
 * Hero タイトルテンプレに会社名を埋め込む。
 * `{company}` placeholder を置換。
 */
export function formatHeroTitle(template: string, company: string): string {
  return template.replace(/\{company\}/g, company)
}
