import type { ProductPublicationGate } from "./types"

export type PublicationGateInput = {
  status: string
  inventoryOnHand: number
  photoReady: number
  shopifyHandle: string | null
  supplierUrl: string | null
  primaryImageUrl: string | null
  originCountryCode: string | null
  hsCode: string | null
  fulfillmentDays: number
  supplierVerified: boolean
  sampleVerified: boolean
  imageRightsVerified: boolean
  complianceVerified: boolean
  fulfillmentVerified: boolean
}

function isHttpsUrl(value: string | null): boolean {
  if (!value) return false
  try {
    return new URL(value).protocol === "https:"
  } catch (error) {
    console.error("[shopify-product-gate] invalid URL:", error)
    return false
  }
}

function hasProductDestination(value: string | null): boolean {
  if (!value) return false
  return isHttpsUrl(value) || /^[a-z0-9][a-z0-9-]{0,254}$/i.test(value)
}

export function evaluateProductPublicationGate(input: PublicationGateInput): ProductPublicationGate {
  const checks = [
    { ready: ["listing_ready", "live"].includes(input.status), label: "商品状態を掲載準備完了にする" },
    { ready: input.inventoryOnHand > 0, label: "販売可能在庫を登録する" },
    { ready: input.photoReady > 0, label: "権利確認済みの商品写真を登録する" },
    { ready: hasProductDestination(input.shopifyHandle), label: "Shopify商品URLまたはハンドルを登録する" },
    { ready: isHttpsUrl(input.supplierUrl), label: "仕入先のHTTPS URLを登録する" },
    { ready: isHttpsUrl(input.primaryImageUrl), label: "公開画像のHTTPS URLを登録する" },
    { ready: /^[A-Z]{2}$/.test(input.originCountryCode ?? ""), label: "原産国コードを登録する" },
    { ready: (input.hsCode?.trim().length ?? 0) >= 4, label: "HSコードを登録する" },
    { ready: input.fulfillmentDays > 0, label: "出荷所要日数を登録する" },
    { ready: input.supplierVerified, label: "仕入先確認を完了する" },
    { ready: input.sampleVerified, label: "現物サンプル確認を完了する" },
    { ready: input.imageRightsVerified, label: "画像利用権確認を完了する" },
    { ready: input.complianceVerified, label: "輸出・表示コンプライアンス確認を完了する" },
    { ready: input.fulfillmentVerified, label: "梱包・出荷テストを完了する" },
  ]
  const completed = checks.filter((check) => check.ready).length
  return {
    ready: completed === checks.length,
    completed,
    total: checks.length,
    blockers: checks.filter((check) => !check.ready).map((check) => check.label),
  }
}

export function productDestinationUrl(shopifyHandle: string | null): string | null {
  if (!shopifyHandle) return null
  if (isHttpsUrl(shopifyHandle)) return shopifyHandle
  if (/^[a-z0-9][a-z0-9-]{0,254}$/i.test(shopifyHandle)) {
    return `https://sericia.com/products/${shopifyHandle}`
  }
  return null
}
