import * as cheerio from "cheerio"

const cityCodes = process.env.CITY_CODES_JSON ? JSON.parse(process.env.CITY_CODES_JSON) as string[] : []
const genreCodes = ["0201", "0104", "0503", "0552", "0612"]
const pagesPerArea = Number(process.env.PAGES_PER_AREA ?? "4")
const maxListings = Number(process.env.MAX_LISTINGS ?? "5000")
const apiHeaders = { "user-agent": "Mozilla/5.0 (compatible; ParadigmJapanSMBResearch/1.0)", accept: "application/json" }

interface PortalCard {
  listingUrl: string
  companyName: string
  category: string
  description: string
  address: string | null
  images: Array<{ url: string; alt: string }>
  source: "ekiten"
}

async function fetchPage(genreCode: string, cityCode: string, page: number): Promise<string> {
  const params = new URLSearchParams({
    smallGenreCode: genreCode,
    serviceType: "inShop",
    cityCode,
    orderBy: "recommend",
    isFreeWordPage: "0",
  })
  const response = await fetch(`https://www.ekiten.jp/api/shops/shopList/p${page}/?${params.toString()}`, { headers: apiHeaders })
  if (!response.ok) throw new Error(`${response.status} ${genreCode}/${cityCode}/p${page}`)
  const body = await response.json() as { data?: { nextPage?: string } }
  return body.data?.nextPage ?? ""
}

function readCards(markup: string): PortalCard[] {
  const $ = cheerio.load(markup)
  return $(".ll-o-shopCassette").toArray().flatMap((element) => {
    const card = $(element)
    const listingUrl = card.find("a.ll-o-shopCassette__link").attr("href")
    const companyName = card.find("h2").first().text().replace(/\s+/gu, " ").trim()
    if (!listingUrl || !companyName || !/^https:\/\/www\.ekiten\.jp\/shop_\d+\/$/u.test(listingUrl)) return []
    const category = card.find(".ll-o-shopCassette__body a[href*='/g']").first().text().replace(/\s+/gu, " ").trim() || "地域サービス"
    const description = card.text().replace(/\s+/gu, " ").trim().slice(0, 1000)
    const addressItem = card.find("dl .ll-m-definitionList__item").filter((_i, item) => $(item).find("dt").text().includes("住所")).first()
    const address = addressItem.length > 0 ? addressItem.find("dd").text().replace(/\s+/gu, " ").trim() || null : null
    const images = card.find("img[src]").toArray().flatMap((image, imageIndex) => {
      const url = $(image).attr("src") ?? ""
      if (!/^https:\/\/image\.ekiten\.jp\/(?:contribution|shop)\//u.test(url)) return []
      return [{ url, alt: $(image).attr("alt")?.trim() || `${companyName}の掲載写真 ${imageIndex + 1}` }]
    }).filter((image, imageIndex, all) => all.findIndex((other) => other.url === image.url) === imageIndex).slice(0, 20)
    return [{ listingUrl, companyName, category, description, address, images, source: "ekiten" as const }]
  })
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  async function run(): Promise<void> {
    while (true) {
      const index = next++
      if (index >= items.length) return
      try {
        results[index] = await worker(items[index])
      } catch (error) {
        console.error("[ekiten-api] request failed:", error instanceof Error ? error.message : String(error))
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()))
  return results
}

async function main(): Promise<void> {
  if (cityCodes.length === 0) throw new Error("CITY_CODES_JSON is required")
  const requests = cityCodes.flatMap((cityCode) => genreCodes.flatMap((genreCode) => Array.from({ length: pagesPerArea }, (_, index) => ({ cityCode, genreCode, page: index + 1 }))))
  const pages = await mapWithConcurrency(requests, 8, (request) => fetchPage(request.genreCode, request.cityCode, request.page))
  const unique = new Map<string, PortalCard>()
  for (const markup of pages) {
    for (const card of readCards(markup ?? "")) {
      if (card.images.length >= 3 && !unique.has(card.listingUrl)) unique.set(card.listingUrl, card)
      if (unique.size >= maxListings) break
    }
    if (unique.size >= maxListings) break
  }
  console.error(`[ekiten-api] requests=${requests.length} pages=${pages.filter(Boolean).length} listings=${unique.size}`)
  console.log(JSON.stringify({ source: "ekiten", listingCount: unique.size, cards: [...unique.values()] }, null, 2))
}

main().catch((error) => {
  console.error("[ekiten-api] fatal:", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
