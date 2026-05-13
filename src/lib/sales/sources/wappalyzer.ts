/**
 * lib/sales/sources/wappalyzer.ts — Sprint 15 技術スタック判定
 *
 * 役割: HTML を解析して使用技術 (CMS / フレームワーク / 解析ツール / 決済 / ホスティング) を抽出.
 *       OSS Wappalyzer の signature pattern を embed して fetch-only で動作 (外部 API 不要・無料).
 *
 * 簡易版: 主要 30 技術を regex 検出 (本格判定は webanalyze CLI を別 service で構築可).
 */

const SIGNATURES = [
  // CMS / Framework
  { name: "WordPress", category: "CMS", patterns: [/wp-content|wp-includes|generator.*wordpress/i] },
  { name: "Drupal", category: "CMS", patterns: [/sites\/default\/files|drupal\.js/i] },
  { name: "Shopify", category: "EC", patterns: [/cdn\.shopify\.com|shopify-section/i] },
  { name: "BASE", category: "EC", patterns: [/binc\.jp|thebase\.in/i] },
  { name: "STORES", category: "EC", patterns: [/stores\.jp/i] },
  { name: "Squarespace", category: "CMS", patterns: [/squarespace-cdn|sqs-block/i] },
  { name: "Wix", category: "CMS", patterns: [/wixstatic\.com|wix-warmup/i] },
  { name: "Jimdo", category: "CMS", patterns: [/jimdo|jimstatic/i] },
  { name: "Next.js", category: "Framework", patterns: [/__NEXT_DATA__|_next\/static/i] },
  { name: "Nuxt.js", category: "Framework", patterns: [/__NUXT__|_nuxt/i] },
  { name: "React", category: "Framework", patterns: [/react-dom|react\.production/i] },
  { name: "Vue.js", category: "Framework", patterns: [/vue\.js|vue\.runtime/i] },
  // Analytics
  { name: "Google Analytics", category: "Analytics", patterns: [/google-analytics\.com|gtag\/js/i] },
  { name: "Google Tag Manager", category: "Analytics", patterns: [/googletagmanager\.com/i] },
  { name: "Mixpanel", category: "Analytics", patterns: [/mixpanel/i] },
  { name: "Hotjar", category: "Analytics", patterns: [/hotjar\.com|static\.hotjar/i] },
  // Payment
  { name: "Stripe", category: "Payment", patterns: [/js\.stripe\.com/i] },
  { name: "PayPal", category: "Payment", patterns: [/paypal\.com\/sdk/i] },
  // Chat / CRM
  { name: "Intercom", category: "Chat", patterns: [/widget\.intercom\.io/i] },
  { name: "Chatwoot", category: "Chat", patterns: [/chatwoot/i] },
  { name: "HubSpot", category: "CRM", patterns: [/js\.hs-scripts\.com|hsforms\.com/i] },
  { name: "Salesforce", category: "CRM", patterns: [/force\.com|salesforceliveagent/i] },
  // CDN
  { name: "Cloudflare", category: "CDN", patterns: [/cloudflare|cf-ray/i] },
  { name: "AWS CloudFront", category: "CDN", patterns: [/cloudfront\.net/i] },
  // Hosting
  { name: "Vercel", category: "Hosting", patterns: [/vercel-deployment/i] },
  { name: "Netlify", category: "Hosting", patterns: [/netlify\.app|netlify-deploy/i] },
  // Email
  { name: "Mailchimp", category: "Email", patterns: [/mailchimp|mc\.js/i] },
  { name: "Sendgrid", category: "Email", patterns: [/sendgrid/i] },
  // Booking
  { name: "Cal.com", category: "Booking", patterns: [/cal\.com\/embed/i] },
  { name: "Calendly", category: "Booking", patterns: [/calendly/i] },
]

export interface TechItem {
  name: string
  category: string
}

export async function detectTechStack(url: string): Promise<{ tech: TechItem[]; server: string | null }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0 (Paradigm Diagnostic Bot/1.0)" },
    })
    const html = await res.text()
    const server = res.headers.get("server")
    const tech: TechItem[] = []
    for (const sig of SIGNATURES) {
      if (sig.patterns.some((p) => p.test(html))) {
        tech.push({ name: sig.name, category: sig.category })
      }
    }
    return { tech, server }
  } catch {
    return { tech: [], server: null }
  }
}
