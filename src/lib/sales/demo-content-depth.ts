import type {
  DemoContentPage,
  DemoNarrativeModule,
  DemoServicesPage,
} from "./demo-site-types"

function sentence(value: string): string {
  const normalized = value.trim().replace(/[。．.!！?？]+$/u, "")
  return normalized ? `${normalized}。` : ""
}

const SOURCE_METADATA_PATTERNS = [
  /(?:^|\s)https?:\/\//iu,
  /404/u,
  /business\.site/iu,
  /登録公式URL/u,
  /エキテン公式店舗/u,
  /(?:取得|確認|更新)(?:日|日時)/u,
  /現在確認できる情報の一つ/u,
  /正式公開前/u,
  /事業者確認/u,
  /source\s*(?:url|updated|date)/iu,
]

/**
 * Convert evidence records into short facts that can safely appear in customer
 * copy. Source-health notes, timestamps, URLs, and phone-listing fragments are
 * evidence for the pipeline, not prose for the finished website.
 */
export function curateEditorialFacts(facts: string[]): string[] {
  const seen = new Set<string>()
  return facts.flatMap((fact) => fact.split(/[。．.!！?？]+/u))
    .map((fact) => fact
      .replace(/https?:\/\/\S+/giu, "")
      .replace(/0\d{1,4}-\d{1,4}-\d{3,4}/gu, "")
      .replace(/^[\s、,，・:：]+|[\s、,，・:：]+$/gu, "")
      .replace(/\s+/gu, " ")
      .trim())
    .filter((fact) => fact.length >= 8 && fact.length <= 180)
    .filter((fact) => !SOURCE_METADATA_PATTERNS.some((pattern) => pattern.test(fact)))
    .filter((fact) => {
      const key = fact.toLocaleLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 12)
}

function factSummary(facts: string[], fallback: string): string {
  const usable = curateEditorialFacts(facts).slice(0, 2)
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

export function expandGroundedBody(input: {
  body: string
  companyName: string
  facts: string[]
  services: Array<{ title: string; description: string }>
  index: number
  locale: "ja" | "en"
  context: "home" | "about" | "services" | "works"
  targetLength: number
}): string {
  const initial = input.body.trim()
  if (initial.length >= input.targetLength) return initial
  const isJa = input.locale === "ja"
  const facts = curateEditorialFacts(input.facts)
  const fact = facts.length > 0 ? facts[input.index % facts.length] : ""
  const service = input.services.length > 0 ? input.services[input.index % input.services.length] : undefined
  const jaContextCopy = {
    home: [
      `${input.companyName}を初めて知る方にも、場所の雰囲気と提供内容が自然につながる順序でご紹介します。`,
      "写真と言葉の間に余白を持たせ、日々の利用場面を想像しながら読み進められる構成にしています。",
      "特徴を短い見出しだけで終わらせず、選ぶ前に知りたい背景まで丁寧に掘り下げています。",
    ],
    about: [
      `${input.companyName}が地域や利用者とどのように向き合ってきたかを、事業の歩みとともにたどります。`,
      "仕事の姿勢、空間づくり、提供内容を章ごとに分け、ブランドの輪郭が伝わる読み物にしています。",
      "一つひとつの情報を急いで並べず、選ばれる理由が自然に積み重なる編集設計です。",
    ],
    services: [
      "各メニューの特徴と利用場面を分けて紹介し、自分に合う選択肢を落ち着いて比較できます。",
      "サービス名だけでは伝わりにくい違いを、内容、相談の流れ、関連する案内まで含めて整理しています。",
      "初めて利用する方が迷わないよう、提供内容から次に見るべき情報までを一つの流れにまとめています。",
    ],
    works: [
      "写真を単なる一覧にせず、空間や仕事の特徴が伝わる小さなストーリーとして編集しています。",
      "視線の高さや道具の置かれ方まで丁寧に見せ、訪れる前からその場の空気を想像できる構成です。",
      "提供内容と空間の関係を言葉で補い、一枚ごとの写真に読み進める理由を持たせています。",
    ],
  } as const
  const enContextCopy = {
    home: [
      `${input.companyName} is introduced in a sequence that connects the atmosphere, the offer, and the details a first-time visitor wants to understand.`,
      "Photography and copy are given room to breathe so visitors can imagine the experience rather than scan a compressed list of claims.",
      "Each highlight develops beyond a short heading and explains the context that helps a visitor make a considered choice.",
    ],
    about: [
      `The story traces how ${input.companyName} approaches its work, its community, and the people who use its services.`,
      "Working principles, place, and offer are separated into editorial chapters that give the brand a clear and memorable shape.",
      "Information is paced deliberately so the reasons to choose the business build naturally from one chapter to the next.",
    ],
    services: [
      "Each service is explained through its purpose and likely use, allowing visitors to compare the available options without guesswork.",
      "The guide develops the differences between services through supporting detail and a clear route to the next relevant information.",
      "The offer and the next step are arranged as one continuous journey for people encountering the business for the first time.",
    ],
    works: [
      "Images are edited as short visual stories so the character of the place and the work can be understood beyond a simple gallery grid.",
      "Details of the space and tools are given context, helping visitors imagine the experience before they arrive.",
      "Copy connects the offer with the imagery so every frame gives the visitor a reason to continue through the story.",
    ],
  } as const
  const contextCopy = (isJa ? jaContextCopy : enContextCopy)[input.context][input.index % 3]
  const candidates = [
    ...(service ? [isJa
      ? `${sentence(service.title)}${sentence(service.description)}`
      : `${sentence(service.title)} ${sentence(service.description)}`] : []),
    contextCopy,
    fact ? sentence(fact) : "",
    isJa
      ? "必要な情報を探し回らなくてよいよう、関連する内容を同じ章の中で読みやすくつないでいます。"
      : "Related information is kept within the same chapter so visitors can continue without hunting through disconnected fragments.",
    isJa
      ? `${input.companyName}らしさが見た目だけで終わらないよう、背景、提供内容、利用する方の視点を重ねて構成しています。`
      : `The presentation layers context, offer, and visitor perspective so the character of ${input.companyName} is expressed through more than appearance alone.`,
    isJa
      ? "短い紹介文の寄せ集めではなく、前後の章がつながる読み物として、必要な情報を十分な余白とともに届けます。"
      : "Rather than a collection of short promotional fragments, the chapters connect as one considered story with enough space for the information to register.",
  ]
  let expanded = initial
  for (const candidate of candidates) {
    const normalized = candidate.trim()
    if (!normalized || expanded.includes(normalized)) continue
    expanded = `${expanded}\n\n${normalized}`
    if (expanded.length >= input.targetLength) break
  }
  return expanded
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
  const sharedPoints = curateEditorialFacts(input.facts).slice(0, 3)

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
    ...curateEditorialFacts(input.facts).slice(0, 6).map((fact, index) => ({
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
