export type DemoLocale = "ja" | "en"

export type DemoArchetype =
  | "culinary"
  | "construction"
  | "clinical"
  | "beauty"
  | "commerce"
  | "advisory"
  | "localService"

export interface PremiumDemoProfile {
  slug: string
  locale: DemoLocale
  archetype: DemoArchetype
  companyName: string
  industryLabel: string
  badge: string
  heroTitle: string
  heroLead: string
  primaryCta: string
  secondaryCta: string
  calUrl: string
  accentColor: string
  accentColorDark: string
  accentColorLight: string
  imageUrl: string
  imageAlt: string
  proofTitle: string
  proofLead: string
  stats: Array<{ value: string; label: string }>
  signatureTitle: string
  signatureItems: Array<{ title: string; body: string }>
  processTitle: string
  process: Array<{ step: string; title: string; body: string }>
  ctaTitle: string
  ctaBody: string
}

interface PremiumInput {
  slug?: string
  title?: string
  meta?: Record<string, unknown>
  locale?: string
}

const archetypeByIndustry: Record<string, DemoArchetype> = {
  restaurant: "culinary",
  dining: "culinary",
  food: "culinary",
  cafe: "culinary",
  construction: "construction",
  architecture: "construction",
  builder: "construction",
  dental: "clinical",
  clinic: "clinical",
  medical: "clinical",
  healthcare: "clinical",
  beauty_salon: "beauty",
  salon: "beauty",
  spa: "beauty",
  retail: "commerce",
  ecommerce: "commerce",
  shop: "commerce",
  store: "commerce",
  cleaning: "localService",
  repair: "localService",
  local_service: "localService",
  accounting: "advisory",
  consulting: "advisory",
  advisory: "advisory",
  professional_service: "advisory",
}

const imageByArchetype: Record<DemoArchetype, string> = {
  culinary: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1800&q=84",
  construction: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1800&q=84",
  clinical: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1800&q=84",
  beauty: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1800&q=84",
  commerce: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=84",
  advisory: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=84",
  localService: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1800&q=84",
}

const industryLabelJa: Record<DemoArchetype, string> = {
  culinary: "飲食店・予約導線",
  construction: "建設・施工実績",
  clinical: "医療・安心設計",
  beauty: "美容・世界観訴求",
  commerce: "小売・商品訴求",
  advisory: "士業・専門性訴求",
  localService: "地域サービス・即時相談",
}

const industryLabelEn: Record<DemoArchetype, string> = {
  culinary: "Restaurant booking",
  construction: "Project proof",
  clinical: "Clinic trust",
  beauty: "Beauty branding",
  commerce: "Retail catalog",
  advisory: "Expert advisory",
  localService: "Local service",
}

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

export function inferDemoArchetype(input: PremiumInput): DemoArchetype {
  const raw = [
    input.meta?.industry,
    input.meta?.template_variant,
    input.meta?.industry_slug,
    input.meta?.company_name,
    input.slug,
    input.title,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ")

  for (const [keyword, archetype] of Object.entries(archetypeByIndustry)) {
    if (raw.includes(keyword)) return archetype
  }
  return "advisory"
}

function localizedCopy(archetype: DemoArchetype, locale: DemoLocale) {
  const isJa = locale === "ja"
  const titleJa: Record<DemoArchetype, string> = {
    culinary: "予約したくなる、体験主役のレストランサイト。",
    construction: "施工実績で選ばれる、信頼型コーポレートサイト。",
    clinical: "初診前の不安をほどく、クリニック予約サイト。",
    beauty: "世界観と技術で選ばれる、サロンブランディングサイト。",
    commerce: "商品を探し、比べ、買いたくなるストアサイト。",
    advisory: "専門性が信頼に変わる、士業・相談型サイト。",
    localService: "すぐ相談できる、地域サービスサイト。",
  }
  const titleEn: Record<DemoArchetype, string> = {
    culinary: "A restaurant site built for reservations.",
    construction: "A construction site that wins on proof.",
    clinical: "A clinic site that makes booking feel safe.",
    beauty: "A salon site chosen for its point of view.",
    commerce: "A store site that makes products easy to choose.",
    advisory: "An advisory site that turns expertise into trust.",
    localService: "A local service site built for fast inquiries.",
  }
  const leadJa: Record<DemoArchetype, string> = {
    culinary: "料理、空間、口コミ、予約導線をひとつの体験として設計。来店前に期待が高まる構成です。",
    construction: "施工写真、工程、保証、見積もり導線を整理し、比較検討中の不安を先回りして解消します。",
    clinical: "医師紹介、診療内容、初診の流れ、予約を落ち着いたトーンでつなぎ、安心して一歩を踏み出せるサイトにします。",
    beauty: "スタイル写真、スタッフ、料金、予約空き状況を一貫した世界観で見せ、指名予約につなげます。",
    commerce: "商品カテゴリ、選び方、レビュー、購入導線を近くに置き、迷わず選べる購買体験を作ります。",
    advisory: "実績、専門領域、相談範囲、費用感を明確化し、問い合わせ前の心理的ハードルを下げます。",
    localService: "対応エリア、料金目安、作業事例、当日相談導線を即座に見せ、緊急性の高い問い合わせを逃しません。",
  }
  const leadEn: Record<DemoArchetype, string> = {
    culinary: "Menu, ambience, reviews, and booking are composed as one conversion journey.",
    construction: "Project records, process clarity, warranties, and quote flows help serious buyers move.",
    clinical: "Trust, doctor profiles, treatment clarity, and appointment flow are designed as one calm journey.",
    beauty: "A visual-first journey that turns style, proof, staff, and availability into bookings.",
    commerce: "Catalog discovery, product proof, and purchase intent are kept close together.",
    advisory: "Insight, credibility, and qualification cues build a high-trust inquiry path.",
    localService: "Service areas, pricing clarity, proof, and response expectations are visible upfront.",
  }
  const signatureJa: Record<DemoArchetype, string[]> = {
    culinary: ["季節メニュー", "貸切・記念日", "口コミ・予約"],
    construction: ["施工実績台帳", "工程と保証", "見積もり導線"],
    clinical: ["診療案内", "医師プロフィール", "初診フロー"],
    beauty: ["スタイルギャラリー", "スタッフ紹介", "予約導線"],
    commerce: ["カテゴリ編集", "商品比較", "リピート導線"],
    advisory: ["専門領域", "事例・実績", "相談前チェック"],
    localService: ["対応エリア", "作業事例", "即時問い合わせ"],
  }
  const signatureEn: Record<DemoArchetype, string[]> = {
    culinary: ["Seasonal menu", "Private booking", "Review proof"],
    construction: ["Project ledger", "Process clarity", "Quote request"],
    clinical: ["Treatment guide", "Doctor profile", "First visit flow"],
    beauty: ["Style gallery", "Staff story", "Reservation flow"],
    commerce: ["Category edit", "Product comparison", "Repeat offer"],
    advisory: ["Expertise index", "Proof library", "Consultation brief"],
    localService: ["Service area", "Before/after", "Same-day inquiry"],
  }

  return {
    heroTitle: isJa ? titleJa[archetype] : titleEn[archetype],
    heroLead: isJa ? leadJa[archetype] : leadEn[archetype],
    proofTitle: isJa ? "最初の画面で伝えるべき証拠を設計" : "Proof buyers see before they scroll",
    proofLead: isJa
      ? "業種ごとに顧客が見たい順番は違います。写真、実績、料金、予約、問い合わせを並べ替え、比較検討で負けない情報設計にします。"
      : "Each industry gets its own information order, visual tone, and conversion path.",
    signatureTitle: isJa ? "この業種専用の見せ場" : "Signature sections for this industry",
    signatureItems: (isJa ? signatureJa[archetype] : signatureEn[archetype]).map((title, index) => ({
      title,
      body: isJa
        ? [
            "写真・実績・CTAを近くに置き、判断に必要な材料を一画面で伝えます。",
            "比較検討中の不安を先回りして、問い合わせ前の迷いを減らします。",
            "意欲が高まった瞬間に予約・相談へ進める導線を配置します。",
          ][index]
        : [
            "Visual proof and action stay in the same decision frame.",
            "Buyer hesitation is answered before it becomes friction.",
            "The final CTA is placed where intent is highest.",
          ][index],
    })),
    processTitle: isJa ? "納品品質まで仕上げる制作フロー" : "Production-grade demo flow",
  }
}

export function getPremiumDemoProfile(input: PremiumInput): PremiumDemoProfile {
  const meta = input.meta ?? {}
  const locale: DemoLocale = input.locale === "en" || meta.locale === "en" ? "en" : "ja"
  const isJa = locale === "ja"
  const archetype = inferDemoArchetype(input)
  const companyName = asText(meta.company_name, isJa ? "サンプル企業" : "Sample Company")
  const copy = localizedCopy(archetype, locale)

  return {
    slug: input.slug ?? "demo",
    locale,
    archetype,
    companyName,
    industryLabel: isJa ? industryLabelJa[archetype] : industryLabelEn[archetype],
    badge: isJa ? "職人仕上げの業種別デモ" : "Hand-crafted industry demo",
    heroTitle: copy.heroTitle,
    heroLead: copy.heroLead,
    primaryCta: isJa ? "見せ場を見る" : "See proof",
    secondaryCta: isJa ? "構成を見る" : "View sections",
    calUrl: asText(meta.calBookingUrl, "https://cal.com/paradigm-jp/15min"),
    accentColor: asText(meta.accentColor, "#7c3aed"),
    accentColorDark: asText(meta.accentColorDark, "#5b21b6"),
    accentColorLight: asText(meta.accentColorLight, "#a78bfa"),
    imageUrl: imageByArchetype[archetype],
    imageAlt: `${companyName} ${isJa ? industryLabelJa[archetype] : industryLabelEn[archetype]}`,
    proofTitle: copy.proofTitle,
    proofLead: copy.proofLead,
    stats: [
      { value: "01", label: isJa ? "業種専用構成" : "Industry layout" },
      { value: "8P", label: isJa ? "下層込みのHP" : "Full site pages" },
      { value: isJa ? "即相談" : "Fast intent", label: isJa ? "問い合わせ導線" : "Inquiry path" },
    ],
    signatureTitle: copy.signatureTitle,
    signatureItems: copy.signatureItems,
    processTitle: copy.processTitle,
    process: [
      {
        step: "01",
        title: isJa ? "業種の勝ち筋を決める" : "Set the category angle",
        body: isJa ? "何を先に見せると選ばれるかを、業種と顧客心理から固定します。" : "Define what buyers must see first in this category.",
      },
      {
        step: "02",
        title: isJa ? "写真と証拠を主役にする" : "Lead with visual proof",
        body: isJa ? "テンプレ感を消し、実績・空間・商品を中心にした画面へ組み立てます。" : "Use proof, space, and product cues as the design anchor.",
      },
      {
        step: "03",
        title: isJa ? "問い合わせ前の不安を消す" : "Remove pre-inquiry friction",
        body: isJa ? "料金、流れ、対応範囲をCTAの近くに置き、迷わず相談できる状態にします。" : "Keep price, process, and scope near the final CTA.",
      },
    ],
    ctaTitle: isJa ? "この方向で本番用デモまで磨き込む" : "Polish this direction into a production demo",
    ctaBody: isJa
      ? "構成、写真、コピー、フォーム導線まで業種ごとに変え、顧客にそのまま見せられる品質へ寄せます。"
      : "Layout, imagery, copy, and form flow are tailored per industry so the demo feels client-ready.",
  }
}
