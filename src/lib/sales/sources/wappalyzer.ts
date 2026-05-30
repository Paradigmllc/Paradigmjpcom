const USER_AGENT = "Mozilla/5.0 (Paradigm Diagnostic Bot/1.2; +https://paradigmjp.com)"

type EvidenceSource = "html" | "script" | "meta" | "header" | "cookie"

interface Signature {
  name: string
  category: string
  patterns: RegExp[]
  headerPatterns?: RegExp[]
  cookiePatterns?: RegExp[]
  confidence: number
}

const SIGNATURES: Signature[] = [
  { name: "WordPress", category: "CMS", confidence: 92, patterns: [/wp-content|wp-includes|generator["'][^>]+wordpress|\/wp-json\//i] },
  { name: "Contact Form 7", category: "Form", confidence: 90, patterns: [/wpcf7|contact-form-7|_wpcf7/i] },
  { name: "WPForms", category: "Form", confidence: 88, patterns: [/wpforms|wpforms-field|wpforms-submit/i] },
  { name: "Gravity Forms", category: "Form", confidence: 88, patterns: [/gform_wrapper|gravityforms|gform_submit_button/i] },
  { name: "Drupal", category: "CMS", confidence: 88, patterns: [/sites\/default\/files|drupal\.js|drupal-settings-json/i] },
  { name: "Shopify", category: "EC", confidence: 92, patterns: [/cdn\.shopify\.com|shopify-section|Shopify\.theme/i] },
  { name: "BASE", category: "EC", confidence: 82, patterns: [/binc\.jp|thebase\.in|baseec-img/i] },
  { name: "STORES", category: "EC", confidence: 82, patterns: [/stores\.jp|stores\.dev/i] },
  { name: "Squarespace", category: "CMS", confidence: 84, patterns: [/squarespace-cdn|sqs-block|static1\.squarespace/i] },
  { name: "Wix", category: "CMS", confidence: 88, patterns: [/wixstatic\.com|wix-warmup|X-Wix-/i] },
  { name: "Jimdo", category: "CMS", confidence: 82, patterns: [/jimdo|jimstatic|cdn-jimdo/i] },
  { name: "Webflow", category: "CMS", confidence: 88, patterns: [/webflow\.js|assets\.website-files\.com|data-wf-page/i] },
  { name: "STUDIO", category: "CMS", confidence: 78, patterns: [/studio\.design|studio-cdn|data-studio/i] },
  { name: "Next.js", category: "Framework", confidence: 92, patterns: [/__NEXT_DATA__|_next\/static|next-route-announcer/i], headerPatterns: [/x-nextjs-cache/i] },
  { name: "Nuxt.js", category: "Framework", confidence: 88, patterns: [/__NUXT__|_nuxt\/|data-n-head/i] },
  { name: "Astro", category: "Framework", confidence: 84, patterns: [/astro-island|astro-slot|\/_astro\//i] },
  { name: "React", category: "Framework", confidence: 72, patterns: [/react-dom|react\.production|data-reactroot/i] },
  { name: "Vue.js", category: "Framework", confidence: 72, patterns: [/vue\.js|vue\.runtime|data-v-[a-f0-9]/i] },
  { name: "Laravel", category: "Framework", confidence: 80, patterns: [/laravel|csrf-token/i], cookiePatterns: [/laravel_session/i] },
  { name: "Google Analytics", category: "Analytics", confidence: 88, patterns: [/google-analytics\.com|gtag\/js|G-[A-Z0-9]{6,}/i] },
  { name: "Google Tag Manager", category: "Analytics", confidence: 90, patterns: [/googletagmanager\.com|GTM-[A-Z0-9]+/i] },
  { name: "Meta Pixel", category: "Analytics", confidence: 82, patterns: [/connect\.facebook\.net\/.*\/fbevents\.js|fbq\(/i] },
  { name: "Microsoft Clarity", category: "Analytics", confidence: 82, patterns: [/clarity\.ms\/tag|clarity\(/i] },
  { name: "Mixpanel", category: "Analytics", confidence: 80, patterns: [/mixpanel/i] },
  { name: "Hotjar", category: "Analytics", confidence: 84, patterns: [/hotjar\.com|static\.hotjar|hj\(/i] },
  { name: "Stripe", category: "Payment", confidence: 90, patterns: [/js\.stripe\.com|stripe-elements|card-number/i] },
  { name: "PayPal", category: "Payment", confidence: 88, patterns: [/paypal\.com\/sdk|paypalobjects\.com/i] },
  { name: "Square", category: "Payment", confidence: 80, patterns: [/squareup\.com|web-payments-sdk/i] },
  { name: "Intercom", category: "Chat", confidence: 86, patterns: [/widget\.intercom\.io|intercomSettings/i] },
  { name: "Chatwoot", category: "Chat", confidence: 86, patterns: [/chatwoot|window\.chatwootSDK/i] },
  { name: "HubSpot", category: "CRM", confidence: 88, patterns: [/js\.hs-scripts\.com|hsforms\.com|hubspotutk/i], cookiePatterns: [/hubspotutk/i] },
  { name: "Salesforce", category: "CRM", confidence: 84, patterns: [/force\.com|salesforceliveagent|pardot/i] },
  { name: "Marketo", category: "Marketing", confidence: 82, patterns: [/munchkin\.js|marketo|mktoForm/i] },
  { name: "Pardot", category: "Marketing", confidence: 82, patterns: [/pardot|pi\.pardot\.com/i] },
  { name: "Cloudflare", category: "CDN", confidence: 80, patterns: [/cloudflare|cf-ray|cdn-cgi/i], headerPatterns: [/cloudflare|cf-cache-status|cf-ray/i] },
  { name: "Cloudflare Turnstile", category: "Bot Protection", confidence: 95, patterns: [/cf-turnstile|challenges\.cloudflare\.com\/turnstile|turnstile\.render/i] },
  { name: "Cloudflare Challenge", category: "Bot Protection", confidence: 96, patterns: [/cdn-cgi\/challenge-platform|cf-chl-|cf-browser-verification|Attention Required! \| Cloudflare/i] },
  { name: "reCAPTCHA", category: "Bot Protection", confidence: 95, patterns: [/google\.com\/recaptcha|g-recaptcha|grecaptcha|recaptcha\/api\.js/i] },
  { name: "hCaptcha", category: "Bot Protection", confidence: 95, patterns: [/hcaptcha\.com|h-captcha/i] },
  { name: "DataDome", category: "Bot Protection", confidence: 90, patterns: [/datadome|ddcid/i], cookiePatterns: [/datadome/i] },
  { name: "Imperva", category: "Bot Protection", confidence: 86, patterns: [/incapsula|imperva|_Incapsula_Resource/i], cookiePatterns: [/incap_ses|visid_incap/i] },
  { name: "AWS CloudFront", category: "CDN", confidence: 82, patterns: [/cloudfront\.net/i], headerPatterns: [/cloudfront|x-amz-cf/i] },
  { name: "Vercel", category: "Hosting", confidence: 88, patterns: [/vercel-deployment|_vercel/i], headerPatterns: [/x-vercel|vercel/i] },
  { name: "Netlify", category: "Hosting", confidence: 88, patterns: [/netlify\.app|netlify-deploy/i], headerPatterns: [/netlify/i] },
  { name: "AWS", category: "Hosting", confidence: 72, patterns: [/amazonaws\.com|aws/i], headerPatterns: [/awselb|amazon/i] },
  { name: "Mailchimp", category: "Email", confidence: 84, patterns: [/mailchimp|mc\.js|list-manage\.com/i] },
  { name: "SendGrid", category: "Email", confidence: 78, patterns: [/sendgrid|sg-widget/i] },
  { name: "Cal.com", category: "Booking", confidence: 88, patterns: [/cal\.com\/embed|calendso/i] },
  { name: "Calendly", category: "Booking", confidence: 88, patterns: [/calendly\.com|calendly-inline-widget/i] },
]

export interface TechItem {
  name: string
  category: string
  confidence?: number
  evidence?: EvidenceSource[]
}

function headerText(headers: Headers): string {
  const out: string[] = []
  headers.forEach((value, key) => out.push(`${key}: ${value}`))
  return out.join("\n")
}

function cookieText(headers: Headers): string {
  const setCookie = headers.get("set-cookie") ?? ""
  return setCookie
}

function evidenceFor(sig: Signature, html: string, headers: string, cookies: string): EvidenceSource[] {
  const evidence: EvidenceSource[] = []
  if (sig.patterns.some((pattern) => pattern.test(html))) {
    evidence.push(/<script|\.js|cdn|api\.js/i.test(html) ? "script" : "html")
  }
  if (sig.headerPatterns?.some((pattern) => pattern.test(headers))) evidence.push("header")
  if (sig.cookiePatterns?.some((pattern) => pattern.test(cookies))) evidence.push("cookie")
  return [...new Set(evidence)]
}

export async function detectTechStack(url: string): Promise<{ tech: TechItem[]; server: string | null }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": USER_AGENT },
    })
    const html = await res.text()
    const headers = headerText(res.headers)
    const cookies = cookieText(res.headers)
    const server = res.headers.get("server")
    const tech = SIGNATURES
      .map((sig): TechItem | null => {
        const evidence = evidenceFor(sig, html, headers, cookies)
        if (evidence.length === 0) return null
        return { name: sig.name, category: sig.category, confidence: sig.confidence, evidence }
      })
      .filter((item): item is TechItem => item !== null)
    return { tech, server }
  } catch (error) {
    console.warn("[wappalyzer] technology detection failed:", error)
    return { tech: [], server: null }
  }
}
