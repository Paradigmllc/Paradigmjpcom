import type {
  DemoContentPage,
  DemoNarrativeModule,
  DemoServicesPage,
} from "./demo-site-types"

function sentence(value: string): string {
  const normalized = value.trim().replace(/[。．.!！?？]+$/u, "")
  return normalized ? `${normalized}。` : ""
}

function factSummary(facts: string[], fallback: string): string {
  const usable = facts.filter((fact) => fact.trim() && !/^https?:\/\//u.test(fact)).slice(0, 6)
  return usable.length > 0 ? usable.map(sentence).join("") : fallback
}

export function reviewedMediaFacts(meta: Record<string, unknown>): string[] {
  if (!Array.isArray(meta.demo_media)) return []
  return meta.demo_media.slice(0, 8).flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return []
    const item = entry as Record<string, unknown>
    if (!["owned", "licensed", "proposal_only"].includes(String(item.usage ?? ""))) return []
    const alt = typeof item.alt === "string" ? item.alt.trim() : ""
    const caption = typeof item.caption === "string" ? item.caption.trim() : ""
    return [alt, caption].filter((value) => value && !/paradigm/iu.test(value))
  })
}

export function fallbackNarrativeModules(input: {
  companyName: string
  facts: string[]
  services: DemoServicesPage["services"]
  locale: "ja" | "en"
  page: "home" | "about" | "services"
}): DemoNarrativeModule[] {
  const isJa = input.locale === "ja"
  const serviceNames = input.services.map((service) => service.title).filter(Boolean).slice(0, 5)
  const servicesText = serviceNames.join(isJa ? "、" : ", ")
  const factsText = factSummary(
    input.facts,
    isJa ? `${input.companyName}の事業内容は、正式公開前に確認します。` : `${input.companyName}'s business details require confirmation before publication.`,
  )
  const sharedPoints = input.facts.filter((fact) => fact.trim() && !/^https?:\/\//u.test(fact)).slice(0, 3)

  const modules = isJa ? [
    {
      eyebrow: input.page === "about" ? "BUSINESS" : "OVERVIEW",
      title: `${input.companyName}で確認できること`,
      body: `${factsText}初めて知る方が、事業の中心、場所、提供内容を一つの流れで理解できるように整理しています。変わる可能性がある情報は固定せず、現在の公式案内へつなぎます。`,
      points: sharedPoints,
    },
    {
      eyebrow: input.page === "services" ? "SELECTION" : "DETAILS",
      title: serviceNames.length > 0 ? `${servicesText}のご案内` : "提供内容を分かりやすく",
      body: serviceNames.length > 0
        ? `${input.companyName}では、確認済みの提供内容として${servicesText}をご案内しています。各項目の違いと関連する情報を分けて掲載し、目的に合うページへ迷わず進める構成にしています。`
        : "確認できる提供内容を項目ごとに分け、説明、関連情報、次に確認する内容を一つのまとまりとして掲載します。",
      points: serviceNames.slice(0, 4),
    },
    {
      eyebrow: "INFORMATION",
      title: "訪問・相談前の情報確認",
      body: "所在地、営業に関する案内、提供状況、正式な連絡方法は、利用前に確認したい重要な情報です。事実として確認できる内容と、公開前の確認が必要な内容を分け、誤解を生まない順序でご案内します。",
      points: ["所在地と地図", "現在の提供情報", "正式な案内窓口"],
    },
  ] : [
    {
      eyebrow: input.page === "about" ? "BUSINESS" : "OVERVIEW",
      title: `What visitors can verify about ${input.companyName}`,
      body: `${factsText} The information is organized so a first-time visitor can understand the business, location, and verified offer in one clear sequence. Details that may change are routed to current official information rather than presented as permanent facts.`,
      points: sharedPoints,
    },
    {
      eyebrow: input.page === "services" ? "SELECTION" : "DETAILS",
      title: serviceNames.length > 0 ? `A guide to ${servicesText}` : "A clear guide to the offer",
      body: serviceNames.length > 0
        ? `${input.companyName} currently presents ${servicesText} as verified areas of its offer. Each item is separated into its purpose, supporting details, and the next information a visitor may need.`
        : "Verified products and services are separated into clear sections with supporting details and the next information a visitor may need.",
      points: serviceNames.slice(0, 4),
    },
    {
      eyebrow: "INFORMATION",
      title: "What to check before visiting or inquiring",
      body: "Location, current operating information, availability, and the official contact route are important before taking the next step. Confirmed facts and items requiring operator review are deliberately separated to avoid ambiguity.",
      points: ["Location and map", "Current availability", "Official information route"],
    },
  ]

  return modules.map((module) => ({ ...module, points: module.points.length > 0 ? module.points : sharedPoints }))
}

export function fallbackWorksSections(input: {
  companyName: string
  facts: string[]
  services: DemoServicesPage["services"]
  locale: "ja" | "en"
}): DemoContentPage["sections"] {
  const isJa = input.locale === "ja"
  const source = [
    ...input.services.map((service) => ({ title: service.title, body: service.description, note: service.features.join(isJa ? " ／ " : " / ") })),
    ...input.facts.slice(0, 6).map((fact, index) => ({
      title: isJa ? `${input.companyName}の風景 ${index + 1}` : `${input.companyName} story ${index + 1}`,
      body: isJa ? `${sentence(fact)}確認できる写真と言葉を組み合わせ、事業や場所の特徴をご紹介します。` : `${sentence(fact)} Reviewed imagery and verified copy are combined to explain the business and place.`,
      note: "",
    })),
  ]
  const fallback = isJa
    ? { title: `${input.companyName}の仕事`, body: "確認できる提供内容と写真を組み合わせ、仕事の特徴を具体的にご紹介します。", note: "" }
    : { title: `${input.companyName} at work`, body: "Verified services and reviewed imagery are combined to explain the work in concrete terms.", note: "" }
  return Array.from({ length: Math.max(4, Math.min(6, source.length || 4)) }, (_, index) => {
    const item = source[index] ?? fallback
    return { id: `story-${index + 1}`, heading: item.title, body: item.body, ...(item.note ? { note: item.note } : {}) }
  })
}
