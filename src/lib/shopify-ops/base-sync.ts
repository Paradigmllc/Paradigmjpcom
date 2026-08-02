import type { BaseSyncPreviewItem } from "./types"

export type BaseVariation = {
  variation_id: number
  variation: string
  variation_stock: number
  variation_identifier: string | null
  barcode: string | null
}

export type BaseItem = {
  item_id: number
  title: string
  detail: string
  price: number
  proper_price: number | null
  item_tax_type: 1 | 2
  stock: number
  visible: 0 | 1
  identifier: string | null
  modified: number
  variations: BaseVariation[]
  [key: string]: unknown
}

export type SericiaCollectionHandle = BaseSyncPreviewItem["collectionHandle"]

export type NormalizedBaseProduct = BaseSyncPreviewItem & {
  descriptionHtml: string
  compareAtPriceJpy: number | null
  images: string[]
  variations: Array<{
    baseVariationId: number | null
    name: string
    sku: string
    barcode: string | null
    inventory: number
  }>
  modifiedAt: string
}

const COLLECTION_RULES: Array<{ handle: SericiaCollectionHandle; words: string[] }> = [
  { handle: "tableware", words: ["器", "皿", "茶", "カップ", "グラス", "箸", "plate", "bowl", "cup", "table"] },
  { handle: "craft", words: ["工芸", "手仕事", "和紙", "染", "陶", "木工", "金継", "craft", "handmade"] },
  { handle: "gifts", words: ["ギフト", "贈", "プレゼント", "アクセサリー", "小物", "gift", "accessory"] },
]

function integer(value: unknown, minimum = 0): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? Math.max(minimum, Math.trunc(parsed)) : minimum
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function imageUrls(item: BaseItem): string[] {
  const urls: string[] = []
  for (let index = 1; index <= 20; index += 1) {
    const value = text(item[`img${index}_origin`])
    if (!value) continue
    try {
      const url = new URL(value)
      const allowedHost = url.hostname.endsWith(".akamaized.net") || url.hostname.endsWith(".amazonaws.com")
      if (url.protocol === "https:" && allowedHost && !urls.includes(url.toString())) urls.push(url.toString())
    } catch (error) {
      console.warn("[base-sync] invalid BASE image URL skipped:", error)
    }
  }
  return urls
}

export function classifyBaseItem(item: Pick<BaseItem, "title" | "detail">): SericiaCollectionHandle {
  const searchable = `${item.title} ${item.detail}`.toLocaleLowerCase("ja")
  return COLLECTION_RULES.find((rule) => rule.words.some((word) => searchable.includes(word.toLocaleLowerCase("ja"))))?.handle ?? "living"
}

export function normalizeBaseItem(raw: BaseItem): NormalizedBaseProduct {
  const baseItemId = integer(raw.item_id)
  if (baseItemId <= 0) throw new Error("BASE商品IDが不正です")
  const title = text(raw.title)
  if (!title) throw new Error(`BASE商品 ${baseItemId} の商品名が空です`)
  const priceJpy = integer(raw.price)
  const stock = integer(raw.stock)
  const fallbackSku = `BASE-${baseItemId}`
  const sourceVariations = Array.isArray(raw.variations) ? raw.variations : []
  const variationNameCounts = new Map<string, number>()
  const variations = sourceVariations.length > 0
    ? sourceVariations.map((variation) => {
        const variationId = integer(variation.variation_id)
        const baseName = (text(variation.variation) || `Variation ${variationId}`).slice(0, 240)
        const occurrence = (variationNameCounts.get(baseName) ?? 0) + 1
        variationNameCounts.set(baseName, occurrence)
        return {
          baseVariationId: variationId,
          name: occurrence === 1 ? baseName : `${baseName} (${occurrence})`,
          sku: text(variation.variation_identifier) || `${fallbackSku}-${variationId}`,
          barcode: text(variation.barcode) || null,
          inventory: integer(variation.variation_stock),
        }
      })
    : [{
        baseVariationId: null,
        name: "Default Title",
        sku: text(raw.identifier) || fallbackSku,
        barcode: null,
        inventory: stock,
      }]
  const images = imageUrls(raw)
  const compareAtPrice = raw.proper_price === null ? null : integer(raw.proper_price)

  return {
    baseItemId,
    title,
    sku: text(raw.identifier) || fallbackSku,
    priceJpy,
    compareAtPriceJpy: compareAtPrice !== null && compareAtPrice > priceJpy ? compareAtPrice : null,
    inventory: variations.reduce((total, variation) => total + variation.inventory, 0),
    imageCount: images.length,
    variationCount: sourceVariations.length,
    collectionHandle: classifyBaseItem(raw),
    visibleInBase: raw.visible === 1,
    descriptionHtml: escapeHtml(text(raw.detail)).replaceAll(/\r?\n/g, "<br>"),
    images,
    variations,
    modifiedAt: new Date(integer(raw.modified) * 1_000).toISOString(),
  }
}

export function buildShopifyProductSetInput(product: NormalizedBaseProduct, locationId: string, collectionId: string) {
  const hasVariations = product.variations.some((variation) => variation.baseVariationId !== null)
  const optionName = hasVariations ? "Variation" : "Title"
  return {
    title: product.title,
    handle: `base-${product.baseItemId}`,
    descriptionHtml: product.descriptionHtml,
    vendor: "SERICIA",
    productType: product.collectionHandle,
    status: "DRAFT",
    collections: [collectionId],
    tags: ["BASE sync", `base-item-${product.baseItemId}`, product.collectionHandle],
    productOptions: [{ name: optionName, position: 1, values: product.variations.map((variation) => ({ name: variation.name })) }],
    files: product.images.map((originalSource, index) => ({
      originalSource,
      alt: `${product.title} ${index + 1}`,
      filename: `base-${product.baseItemId}-${index + 1}.jpg`,
      contentType: "IMAGE",
    })),
    variants: product.variations.map((variation) => ({
      optionValues: [{ optionName, name: variation.name }],
      price: product.priceJpy,
      compareAtPrice: product.compareAtPriceJpy,
      sku: variation.sku,
      barcode: variation.barcode,
      taxable: true,
      inventoryPolicy: "DENY",
      inventoryItem: { sku: variation.sku, tracked: true, requiresShipping: true, countryCodeOfOrigin: "JP" },
      inventoryQuantities: [{ locationId, name: "available", quantity: variation.inventory }],
    })),
  }
}
