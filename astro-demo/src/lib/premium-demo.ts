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
  food: "culinary",
  cafe: "culinary",
  construction: "construction",
  architecture: "construction",
  dental: "clinical",
  clinic: "clinical",
  medical: "clinical",
  beauty_salon: "beauty",
  salon: "beauty",
  spa: "beauty",
  retail: "commerce",
  ecommerce: "commerce",
  shop: "commerce",
  cleaning: "localService",
  local_service: "localService",
  accounting: "advisory",
  consulting: "advisory",
  professional_service: "advisory",
}

const imageByArchetype: Record<DemoArchetype, string> = {
  culinary: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=82",
  construction: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=82",
  clinical: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1600&q=82",
  beauty: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=82",
  commerce: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=82",
  advisory: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=82",
  localService: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=82",
}

const labelJa: Record<DemoArchetype, string> = {
  culinary: "飲食・予約導線",
  construction: "建設・実績訴求",
  clinical: "医療・安心設計",
  beauty: "美容・世界観訴求",
  commerce: "小売・商品導線",
  advisory: "士業・専門性訴求",
  localService: "地域サービス・即時相談",
}

const labelEn: Record<DemoArchetype, string> = {
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

function inferArchetype(input: PremiumInput): DemoArchetype {
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
  if (raw.includes("restaurant") || raw.includes("dining") || raw.includes("cafe")) return "culinary"
  if (raw.includes("construct") || raw.includes("builder") || raw.includes("real estate")) return "construction"
  if (raw.includes("clinic") || raw.includes("dental") || raw.includes("health")) return "clinical"
  if (raw.includes("beauty") || raw.includes("salon") || raw.includes("spa")) return "beauty"
  if (raw.includes("shop") || raw.includes("store") || raw.includes("ecomm")) return "commerce"
  if (raw.includes("clean") || raw.includes("repair") || raw.includes("service")) return "localService"
  return "advisory"
}

function copyFor(archetype: DemoArchetype, locale: DemoLocale, companyName: string) {
  const isJa = locale === "ja"
  const jaTitles: Record<DemoArchetype, string> = {
    culinary: "予約したくなる飲食店サイト。",
    construction: "実績で選ばれる建設会社サイト。",
    clinical: "安心して予約できるクリニックサイト。",
    beauty: "世界観で選ばれるサロンサイト。",
    commerce: "商品が欲しくなるストアサイト。",
    advisory: "専門性が信頼に変わる事務所サイト。",
    localService: "すぐ相談できる地域サービスサイト。",
  }
  const enTitles: Record<DemoArchetype, string> = {
    culinary: "A restaurant site built for reservations.",
    construction: "A construction site that wins on proof.",
    clinical: "A clinic site that makes booking feel safe.",
    beauty: "A salon site chosen for its point of view.",
    commerce: "A store site that makes products easy to choose.",
    advisory: "An advisory site that turns expertise into trust.",
    localService: "A local service site built for fast inquiries.",
  }
  const copies: Record<DemoArchetype, ReturnType<typeof makeCopy>> = {
    culinary: makeCopy(
      "予約したくなる余白、料理が主役になる動線。",
      "Menu, ambience, booking, and reviews are composed as one conversion path.",
      ["Seasonal menu", "Private booking", "Google reviews"],
    ),
    construction: makeCopy(
      "施工実績と信頼材料で、相談前の不安を減らす。",
      "Project records, process clarity, and quote flows make serious buyers move.",
      ["Project ledger", "Site process", "Quote request"],
    ),
    clinical: makeCopy(
      "清潔感と説明責任を、初診予約まで途切れさせない。",
      "Trust, treatment clarity, and appointment flow are designed as one calm journey.",
      ["Treatment guide", "Doctor profile", "First visit flow"],
    ),
    beauty: makeCopy(
      "世界観、技術、予約導線まで一貫したサロン体験。",
      "A visual-first journey that turns style, proof, and availability into bookings.",
      ["Style gallery", "Staff story", "Reservation flow"],
    ),
    commerce: makeCopy(
      "商品を探す、比べる、買うまでの迷いを削る。",
      "Catalog discovery, product proof, and purchase intent are kept close together.",
      ["Category edit", "Product proof", "Repeat offer"],
    ),
    advisory: makeCopy(
      "専門性を読み物で終わらせず、相談の理由に変える。",
      "Insight, credibility, and qualification cues build a high-trust inquiry path.",
      ["Insight index", "Proof library", "Consultation brief"],
    ),
    localService: makeCopy(
      "地域、料金、空き状況をすぐ確認できる相談導線。",
      "Service areas, pricing clarity, and response expectations are visible upfront.",
      ["Service area", "Before/after", "Same-day inquiry"],
    ),
  }
  const copy = copies[archetype]
  return {
    heroTitle: isJa ? jaTitles[archetype] : enTitles[archetype],
    heroLead: isJa ? copy.jaLead : copy.enLead,
    proofTitle: isJa ? "最初の1画面で伝えるべき証拠" : "Proof buyers see before they scroll",
    proofLead: isJa
      ? "TCDテーマのデモのように、業種ごとに見せる順番と温度感を変えています。"
      : "Each industry gets its own information order, visual tone, and conversion path.",
    signatureTitle: isJa ? "この業種専用の見せ場" : "Signature sections for this industry",
    signatureItems: copy.items.map((item, index) => ({
      title: item,
      body: isJa
        ? ["写真・実績・導線が同じ画面内で判断できる構成です。", "比較検討中の不安を先回りして解消します。", "問い合わせ直前の迷いを減らすCTAを配置します。"][index]
        : ["Visual proof and action stay in the same decision frame.", "Buyer hesitation is answered before it becomes friction.", "The final CTA is placed where intent is highest."][index],
    })),
    processTitle: isJa ? "制作物としての完成度を上げる流れ" : "Production-grade demo flow",
  }
}

function makeCopy(jaLead: string, enLead: string, items: string[]) {
  return { jaLead, enLead, items }
}

export function getPremiumDemoProfile(input: PremiumInput): PremiumDemoProfile {
  const meta = input.meta ?? {}
  const locale: DemoLocale = input.locale === "en" || meta.locale === "en" ? "en" : "ja"
  const isJa = locale === "ja"
  const archetype = inferArchetype(input)
  const companyName = asText(meta.company_name, isJa ? "サンプル企業" : "Sample Company")
  const industryLabel = isJa ? labelJa[archetype] : labelEn[archetype]
  const copy = copyFor(archetype, locale, companyName)

  return {
    slug: input.slug ?? "demo",
    locale,
    archetype,
    companyName,
    industryLabel,
    badge: isJa ? "職人仕上げの業種別デモ" : "Hand-crafted industry demo",
    heroTitle: copy.heroTitle,
    heroLead: copy.heroLead,
    primaryCta: isJa ? "相談導線を見る" : "See inquiry path",
    secondaryCta: isJa ? "見せ場を見る" : "View signature sections",
    calUrl: asText(meta.calBookingUrl, "https://cal.com/paradigm-jp/15min"),
    accentColor: asText(meta.accentColor, "#7c3aed"),
    accentColorDark: asText(meta.accentColorDark, "#5b21b6"),
    accentColorLight: asText(meta.accentColorLight, "#a78bfa"),
    imageUrl: imageByArchetype[archetype],
    imageAlt: `${companyName} ${industryLabel}`,
    proofTitle: copy.proofTitle,
    proofLead: copy.proofLead,
    stats: [
      { value: isJa ? "01" : "1", label: isJa ? "業種専用構成" : "Industry layout" },
      { value: isJa ? "3層" : "3 layers", label: isJa ? "写真・証拠・CTA" : "Visual, proof, CTA" },
      { value: isJa ? "即相談" : "Fast intent", label: isJa ? "問い合わせ導線" : "Inquiry path" },
    ],
    signatureTitle: copy.signatureTitle,
    signatureItems: copy.signatureItems,
    processTitle: copy.processTitle,
    process: [
      {
        step: "01",
        title: isJa ? "業種の勝ち筋を決める" : "Set the category angle",
        body: isJa ? "何を先に見せると選ばれるかを、業種ごとに固定します。" : "Define what buyers must see first in this category.",
      },
      {
        step: "02",
        title: isJa ? "写真と証拠を主役にする" : "Lead with visual proof",
        body: isJa ? "テンプレ感が出ないよう、実績・空間・商品を中心に組みます。" : "Use proof, space, and product cues as the design anchor.",
      },
      {
        step: "03",
        title: isJa ? "相談直前の不安を消す" : "Remove pre-inquiry friction",
        body: isJa ? "料金、流れ、対応範囲をCTAの近くに置きます。" : "Keep price, process, and scope near the final CTA.",
      },
    ],
    ctaTitle: isJa ? "この方向で本番用デモまで磨き込む" : "Polish this direction into a production demo",
    ctaBody: isJa
      ? "構成、写真、コピー、フォーム導線まで業種ごとに変え、顧客にそのまま見せられる品質へ寄せます。"
      : "Layout, imagery, copy, and form flow are tailored per industry so the demo feels client-ready.",
  }
}
