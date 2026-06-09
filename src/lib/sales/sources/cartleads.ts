/**
 * CartLeads — EC cart platform detection (complement to Storeleads)
 * Detects Shopify cart, WooCommerce cart, BigCommerce, Magento checkout.
 * Free, no API key. Uses HTTP patterns to identify cart platforms.
 */

export interface CartLeadsResult {
  ok: boolean
  domain: string
  hasCart: boolean
  cartPlatform: string | null
  cartUrl: string | null
  checkoutPlatform: string | null
  error?: string
}

export async function detectCartPlatform(domain: string): Promise<CartLeadsResult> {
  try {
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    
    // Check common cart paths
    const cartPaths = ["/cart", "/checkout", "/cart.php", "/basket", "/order", "/shop/checkout"]
    let hasCart = false
    let cartUrl: string | null = null
    let cartPlatform: string | null = null
    let checkoutPlatform: string | null = null

    for (const path of cartPaths) {
      try {
        const res = await fetch(`https://${cleanDomain}${path}`, {
          headers: { "User-Agent": "RevenueOS/1.0" },
          signal: AbortSignal.timeout(8_000),
          redirect: "follow",
        })
        if (res.ok) {
          hasCart = true
          cartUrl = `https://${cleanDomain}${path}`
          const html = await res.text()
          cartPlatform = detectCartPlatformFromHtml(html)
          if (cartPlatform) break
        }
      } catch (e) {
        console.warn("[cartleads] cart path check failed:", e)
      }
    }

    // Also check homepage for cart indicators
    try {
      const homeRes = await fetch(`https://${cleanDomain}`, {
        headers: { "User-Agent": "RevenueOS/1.0" },
        signal: AbortSignal.timeout(8_000),
        redirect: "follow",
      })
      if (homeRes.ok) {
        const homeHtml = await homeRes.text()
        if (!cartPlatform) cartPlatform = detectCartPlatformFromHtml(homeHtml)
        checkoutPlatform = detectCheckoutPlatform(homeHtml)
      }
    } catch (e) {
      console.error("[cartleads] homepage fetch failed:", e)
    }

    return {
      ok: true,
      domain: cleanDomain,
      hasCart,
      cartPlatform: cartPlatform || checkoutPlatform,
      cartUrl,
      checkoutPlatform,
    }
  } catch (e) {
    console.error("[cartleads] detection failed:", e)
    return { ok: false, domain, hasCart: false, cartPlatform: null, cartUrl: null, checkoutPlatform: null, error: e instanceof Error ? e.message : "CartLeads detection failed" }
  }
}

function detectCartPlatformFromHtml(html: string): string | null {
  const h = html.toLowerCase()
  if (h.includes("shopify") && (h.includes("/cart") || h.includes("cart.js"))) return "Shopify"
  if (h.includes("woocommerce") || h.includes("wc-cart-fragments")) return "WooCommerce"
  if (h.includes("bigcommerce") || h.includes("bigcommerce.com")) return "BigCommerce"
  if (h.includes("magento") && h.includes("checkout")) return "Magento"
  if (h.includes("prestashop")) return "PrestaShop"
  if (h.includes("squarespace") && h.includes("commerce")) return "Squarespace Commerce"
  if (h.includes("ec-cube") || h.includes("eccube")) return "EC-CUBE"
  if (h.includes("makeshop.jp")) return "MakeShop"
  if (h.includes("thebase.in") || h.includes("binc.jp")) return "BASE"
  if (h.includes("stores.jp")) return "STORES.jp"
  if (h.includes("colorme") || h.includes("shop-pro.jp")) return "ColorMe"
  return null
}

function detectCheckoutPlatform(html: string): string | null {
  const h = html.toLowerCase()
  if (h.includes("shopify") && h.includes("checkout")) return "Shopify Checkout"
  if (h.includes("stripe.com") || h.includes("js.stripe.com")) return "Stripe"
  if (h.includes("paypal.com") || h.includes("paypalobjects")) return "PayPal"
  if (h.includes("pay.jp") || h.includes("payjp")) return "Pay.jp"
  if (h.includes("paidy")) return "Paidy"
  return null
}
