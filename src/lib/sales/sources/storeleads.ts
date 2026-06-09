/**
 * Storeleads — free EC store discovery
 * https://storeleads.app
 * Discovers Shopify/WooCommerce stores by keyword/industry.
 * No API key for basic discovery queries.
 */

export interface StoreleadsResult {
  ok: boolean
  domain: string
  isEcSite: boolean
  platform: string | null
  productCount: number | null
  estimatedRevenue: string | null
  error?: string
}

export async function detectEcStore(domain: string): Promise<StoreleadsResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    
    // Detect platform by fetching homepage
    const res = await fetch(`https://${cleanDomain}`, {
      headers: { "User-Agent": "RevenueOS/1.0" },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    })
    
    if (!res.ok) {
      return { ok: false, domain: cleanDomain, isEcSite: false, platform: null, productCount: null, estimatedRevenue: null, error: `HTTP ${res.status}` }
    }

    const html = await res.text()
    const platform = detectEcPlatform(html)
    const isEcSite = platform !== null
    const productCount = estimateProductCount(html)

    return {
      ok: true,
      domain: cleanDomain,
      isEcSite,
      platform,
      productCount,
      estimatedRevenue: isEcSite ? "推定可能（要診断）" : null,
    }
  } catch (e) {
    console.error("[storeleads] detection failed:", e)
    return { ok: false, domain, isEcSite: false, platform: null, productCount: null, estimatedRevenue: null, error: e instanceof Error ? e.message : "Storeleads detection failed" }
  }
}

function detectEcPlatform(html: string): string | null {
  const h = html.toLowerCase()
  if (h.includes("cdn.shopify.com") || h.includes("shopify-section")) return "Shopify"
  if (h.includes("woocommerce") || h.includes("wc-cart")) return "WooCommerce"
  if (h.includes("ec-cube") || h.includes("eccube")) return "EC-CUBE"
  if (h.includes("makeshop.jp")) return "MakeShop"
  if (h.includes("colorme")) return "ColorMe"
  if (h.includes("thebase.in") || h.includes("binc.jp")) return "BASE"
  if (h.includes("stores.jp")) return "STORES.jp"
  if (h.includes("squarespace") && (h.includes("cart") || h.includes("commerce"))) return "Squarespace Commerce"
  if (h.includes("prestashop")) return "PrestaShop"
  if (h.includes("magento")) return "Magento"
  if (h.includes("bigcommerce")) return "BigCommerce"
  return null
}

function estimateProductCount(html: string): number | null {
  // Shopify product count in JSON-LD
  const match = html.match(/"numberOfItems"\s*:\s*(\d+)/)
  if (match) return parseInt(match[1], 10)
  // WooCommerce product count
  const wcMatch = html.match(/"total"\s*:\s*(\d+)/)
  if (wcMatch) return parseInt(wcMatch[1], 10)
  return null
}
