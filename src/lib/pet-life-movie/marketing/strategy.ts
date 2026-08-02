import type {
  PetMarketingLocale,
  PetMarketingMarket,
  PetMarketingPlatform,
  PetMarketingSlot,
  PlannedPetMarketingPost,
} from "./types"

const GLOBAL_CAMPAIGN = "pet_life_movie_global_launch"
const CONTENT_TYPES = ["memory", "privacy", "family", "preview"] as const
type ContentType = (typeof CONTENT_TYPES)[number]

export const PET_MARKETING_MARKETS: PetMarketingMarket[] = [
  { code: "JP", label: "Japan", locale: "ja", slot: "apac" },
  { code: "AU", label: "Australia", locale: "en", slot: "apac" },
  { code: "GB", label: "United Kingdom", locale: "en", slot: "europe" },
  { code: "ES", label: "Spain", locale: "es", slot: "europe" },
  { code: "PT", label: "Portugal", locale: "pt", slot: "europe" },
  { code: "US", label: "United States", locale: "en", slot: "americas" },
  { code: "MX", label: "Mexico", locale: "es", slot: "americas" },
  { code: "BR", label: "Brazil", locale: "pt", slot: "americas" },
]

type Copy = {
  hook: string
  body: string
  cta: string
  hashtags: string[]
}

const CONTENT: Record<PetMarketingLocale, Record<ContentType, Copy>> = {
  ja: {
    memory: {
      hook: "何気ない毎日こそ、いちばん残したい物語になる。",
      body: "5〜20枚の写真と、本当にあった思い出から。あの子らしさを守った、家族だけの短編映画をつくります。",
      cta: "カード登録なしで無料プレビューを始める",
      hashtags: ["PetLifeMovie", "ペットのいる暮らし", "犬との思い出", "猫との思い出", "家族の記録"],
    },
    privacy: {
      hook: "大切な写真だから、公開を前提にしない。",
      body: "限定リンク、事実だけの字幕、声の複製なし。写真は家族の物語をつくるためだけに扱います。",
      cta: "プライベート設計の制作体験を見る",
      hashtags: ["PetLifeMovie", "プライベート共有", "ペット動画", "思い出を残す"],
    },
    family: {
      hook: "家族それぞれが知っている『あの子らしさ』を、一つの映画へ。",
      body: "限定招待リンクから写真と思い出を追加。離れて暮らす家族とも、同じ作品を一緒につくれます。",
      cta: "家族でつくる無料プレビュー",
      hashtags: ["PetLifeMovie", "家族の思い出", "犬好きな人と繋がりたい", "猫好きな人と繋がりたい"],
    },
    preview: {
      hook: "写真を選ぶところから、もう作品づくりは始まっている。",
      body: "名前、過ごした時間、本当にあった出来事を3ステップで。難しい編集なしでストーリーを確かめられます。",
      cta: "無料プレビューをつくる",
      hashtags: ["PetLifeMovie", "ペットムービー", "メモリアルムービー", "写真から動画"],
    },
  },
  en: {
    memory: {
      hook: "The ordinary moments become the story worth keeping.",
      body: "Turn 5–20 photos and memories that really happened into a private short film that keeps everything unmistakably theirs.",
      cta: "Start a free preview — no card required",
      hashtags: ["PetLifeMovie", "DogMemories", "CatMemories", "PetParents", "FamilyStory"],
    },
    privacy: {
      hook: "Their most personal memories should not require a public feed.",
      body: "Private links, factual captions, no voice cloning, and a human final review. Built to protect the story as carefully as the photos.",
      cta: "See the private-by-design experience",
      hashtags: ["PetLifeMovie", "PrivateByDesign", "PetMemories", "ResponsibleAI"],
    },
    family: {
      hook: "Every family member remembers a different little thing.",
      body: "Invite the people who knew them best to add photos and real memories to one shared film project.",
      cta: "Create a family preview for free",
      hashtags: ["PetLifeMovie", "FamilyMemories", "DogFamily", "CatFamily", "PetLove"],
    },
    preview: {
      hook: "You do not need editing skills to tell their story well.",
      body: "Name, time together, real memories, and photos — guided in three calm steps before you decide whether to order.",
      cta: "Create the free preview",
      hashtags: ["PetLifeMovie", "PetVideo", "PetMemorial", "PhotoToFilm", "PetParents"],
    },
  },
  es: {
    memory: {
      hook: "Los momentos de cada día se convierten en la historia que merece quedarse.",
      body: "Convierte entre 5 y 20 fotos y recuerdos reales en una película privada que conserva todo lo que hacía único a tu compañero.",
      cta: "Crea una vista previa gratis, sin tarjeta",
      hashtags: ["PetLifeMovie", "RecuerdosDeMascotas", "FamiliaPerruna", "FamiliaGatuna", "AmorAnimal"],
    },
    privacy: {
      hook: "Los recuerdos más personales no deberían exigir una publicación pública.",
      body: "Enlaces privados, textos basados solo en hechos, sin clonación de voz y con revisión humana final.",
      cta: "Descubre la experiencia privada por diseño",
      hashtags: ["PetLifeMovie", "Privacidad", "RecuerdosDeMascotas", "IAResponsable"],
    },
    family: {
      hook: "Cada persona de la familia recuerda un pequeño detalle distinto.",
      body: "Invita a quienes mejor lo conocieron para añadir fotos y recuerdos reales al mismo proyecto.",
      cta: "Crea gratis una vista previa en familia",
      hashtags: ["PetLifeMovie", "RecuerdosEnFamilia", "Perros", "Gatos", "Mascotas"],
    },
    preview: {
      hook: "No necesitas saber editar para contar bien su historia.",
      body: "Nombre, tiempo juntos, recuerdos reales y fotos: tres pasos sencillos antes de decidir si quieres pedir la película.",
      cta: "Crea la vista previa gratis",
      hashtags: ["PetLifeMovie", "VideoDeMascotas", "HomenajeMascotas", "FotosAVideo"],
    },
  },
  pt: {
    memory: {
      hook: "Os momentos de todo dia viram a história que merece ser guardada.",
      body: "Transforme de 5 a 20 fotos e memórias reais em um filme privado que preserva tudo o que tornava seu companheiro único.",
      cta: "Crie uma prévia grátis, sem cartão",
      hashtags: ["PetLifeMovie", "MemóriasDePets", "FamíliaCanina", "FamíliaFelina", "AmorPet"],
    },
    privacy: {
      hook: "Memórias tão pessoais não precisam virar uma publicação aberta.",
      body: "Links privados, textos baseados apenas em fatos, sem clonagem de voz e com revisão humana final.",
      cta: "Conheça a experiência privada por design",
      hashtags: ["PetLifeMovie", "Privacidade", "MemóriasDePets", "IAResponsável"],
    },
    family: {
      hook: "Cada pessoa da família lembra de um pequeno detalhe diferente.",
      body: "Convide quem melhor conheceu seu pet para adicionar fotos e memórias reais ao mesmo projeto.",
      cta: "Crie uma prévia em família gratuitamente",
      hashtags: ["PetLifeMovie", "MemóriasEmFamília", "Cachorros", "Gatos", "MundoPet"],
    },
    preview: {
      hook: "Você não precisa saber editar para contar essa história com carinho.",
      body: "Nome, tempo juntos, memórias reais e fotos: três passos tranquilos antes de decidir se deseja fazer o pedido.",
      cta: "Crie a prévia grátis",
      hashtags: ["PetLifeMovie", "VídeoDePet", "HomenagemPet", "FotosParaVídeo"],
    },
  },
}

const SLOT_DISTRIBUTION: Record<PetMarketingSlot, Array<{
  platform: PetMarketingPlatform
  locale: PetMarketingLocale
  market: string
}>> = {
  apac: [
    { platform: "instagram", locale: "ja", market: "JP" },
    { platform: "pinterest", locale: "en", market: "AU" },
    { platform: "tiktok", locale: "ja", market: "JP" },
  ],
  europe: [
    { platform: "instagram", locale: "en", market: "GB" },
    { platform: "pinterest", locale: "es", market: "ES" },
    { platform: "youtube", locale: "pt", market: "PT" },
  ],
  americas: [
    { platform: "instagram", locale: "en", market: "US" },
    { platform: "pinterest", locale: "pt", market: "BR" },
    { platform: "tiktok", locale: "es", market: "MX" },
    { platform: "youtube", locale: "pt", market: "BR" },
  ],
}

function dateNumber(runDate: string): number {
  const value = Number(runDate.replaceAll("-", ""))
  return Number.isFinite(value) ? value : 0
}

function destinationUrl(input: {
  destinationPath: string
  locale: PetMarketingLocale
  market: string
  platform: PetMarketingPlatform
  contentType: ContentType
}): string {
  const url = new URL(`https://paradigmjp.com/${input.locale}${input.destinationPath}`)
  url.searchParams.set("market", input.market)
  url.searchParams.set("utm_source", input.platform)
  url.searchParams.set("utm_medium", "organic_social")
  url.searchParams.set("utm_campaign", GLOBAL_CAMPAIGN)
  url.searchParams.set("utm_content", `${input.contentType}_${input.market.toLowerCase()}_${input.platform}`)
  return url.toString()
}

export function planPetMarketingPosts(input: {
  campaignKey: string
  destinationPath: string
  mediaUrl: string
  slot: PetMarketingSlot
  runDate: string
  scheduledFor?: string
}): PlannedPetMarketingPost[] {
  const scheduledFor = input.scheduledFor ?? new Date().toISOString()
  const rotation = dateNumber(input.runDate) % CONTENT_TYPES.length
  return SLOT_DISTRIBUTION[input.slot].map((target, index) => {
    const contentType = CONTENT_TYPES[(rotation + index) % CONTENT_TYPES.length]
    const copy = CONTENT[target.locale][contentType]
    const utmContent = `${contentType}_${target.market.toLowerCase()}_${target.platform}`
    const link = destinationUrl({ ...target, destinationPath: input.destinationPath, contentType })
    const hashtags = copy.hashtags.map((tag) => `#${tag.replaceAll(" ", "")}`)
    const caption = `${copy.hook}\n\n${copy.body}\n\n${copy.cta}\n${link}\n\n${hashtags.join(" ")}`
    return {
      postKey: `${input.campaignKey}:${input.runDate}:${input.slot}:${target.platform}:${target.market}:${contentType}`,
      platform: target.platform,
      locale: target.locale,
      market: target.market,
      contentType,
      hook: copy.hook,
      caption,
      hashtags,
      mediaUrl: input.mediaUrl,
      destinationUrl: link,
      utmSource: target.platform,
      utmMedium: "organic_social",
      utmCampaign: GLOBAL_CAMPAIGN,
      utmContent,
      scheduledFor,
      directPublishingEligible: target.platform === "instagram" || target.platform === "pinterest",
    }
  })
}
