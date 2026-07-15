import { load } from "cheerio"

export interface FirstPartyProductEvidence {
  hubLinks: string[]
  detailLinks: string[]
  claims: string[]
}

const PRODUCT_HUB_PATH_RE = /^\/(?:products?|product-categories|shop|store|catalog(?:ue)?|purchase)\/?$/iu
const PRODUCT_DETAIL_PATH_RE = /^\/(?:products?|shop|store|purchase)\/[^/?#]+(?:\/[^/?#]+)?\/?$/iu
const NON_PRODUCT_DETAIL_RE = /(?:^|[-_])(?:services?|solutions?|support|consulting|development|industries|applications?|about|contact|resources?|news|blog)(?:$|[-_])/iu
const STRONG_PRODUCT_CLAIM_RE = /(?:\bwe\s+(?:design|develop|engineer|manufacture|produce|build)|\b(?:designs|develops|engineers|manufactures|produces))\b.{0,120}\b(?:products?|devices?|equipment|instruments?|materials?|hardware|compressors?|sensors?|batter(?:y|ies)|semiconductors?|surfactants?|molecules?|chemicals?|ingredients?|software platforms?)\b|\bmanufacturer of\b.{0,120}\b(?:products?|devices?|equipment|instruments?|materials?|hardware|compressors?|sensors?|batter(?:y|ies)|semiconductors?|surfactants?|molecules?|chemicals?|ingredients?)\b/iu

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean))]
}

function sameFirstPartyHost(left: string, right: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/^www\./, "")
  return normalize(left) === normalize(right)
}

export function extractFirstPartyProductEvidence(html: string, pageUrl: string): FirstPartyProductEvidence {
  const $ = load(html)
  const page = new URL(pageUrl)
  const hubLinks: string[] = []
  const detailLinks: string[] = []
  const claims: string[] = []

  $("a[href]").each((_index, element) => {
    const href = $(element).attr("href")?.trim()
    if (!href || href.startsWith("#") || /^(?:mailto|tel|javascript):/iu.test(href)) return
    try {
      const target = new URL(href, page)
      if (!["http:", "https:"].includes(target.protocol) || !sameFirstPartyHost(target.hostname, page.hostname)) return
      const path = target.pathname.replace(/\/{2,}/g, "/")
      if (PRODUCT_HUB_PATH_RE.test(path)) {
        hubLinks.push(path.replace(/\/$/, "") || "/")
        return
      }
      if (!PRODUCT_DETAIL_PATH_RE.test(path)) return
      const slug = path.split("/").filter(Boolean).slice(1).join("-")
      if (!slug || NON_PRODUCT_DETAIL_RE.test(slug)) return
      detailLinks.push(path.replace(/\/$/, ""))
    } catch (error) {
      console.warn("[lead-product-evidence] invalid product link skipped:", error)
    }
  })

  $("h1,h2,h3,p,li").each((_index, element) => {
    const snippet = $(element).text().replace(/\s+/g, " ").trim()
    if (snippet.length < 20 || snippet.length > 320 || !STRONG_PRODUCT_CLAIM_RE.test(snippet)) return
    if (/\b(?:consulting|consultants?|advisory|agency|services? for clients|custom product development)\b/iu.test(snippet)) return
    claims.push(snippet)
  })

  return {
    hubLinks: unique(hubLinks).slice(0, 5),
    detailLinks: unique(detailLinks).slice(0, 10),
    claims: unique(claims).slice(0, 5),
  }
}
