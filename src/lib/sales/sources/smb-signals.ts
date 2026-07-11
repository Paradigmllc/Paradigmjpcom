import { cleanDomain as canonicalDomain } from "@/lib/sales/japan-readiness-utils"
import type { MarketVisibilityIndex, MarketVisibilityInput } from "../market-visibility"
import { buildMarketVisibilityIndex } from "../market-visibility"

/**
 * SMB market signals — free public signals for prospect qualification.
 * These are not traffic or revenue measurements and must not be presented as
 * such.
 * 
 * Signals:
 * 1. Public web footprint — Common Crawl/sitemap/rank signals
 * 2. Social presence — public links only, not follower counts
 * 3. Technology tier — observable stack signals
 * 4. Email provider — DNS MX signal
 */

export interface SmbSignalsResult {
  ok: boolean
  domain: string
  googleIndexCount: number | null
  socialFollowers: { instagram: number | null; twitter: number | null; facebook: number | null }
  reviewCount: number | null
  techTier: "basic" | "standard" | "advanced" | "unknown"
  emailProvider: string | null
  businessMaturity: "early" | "growing" | "established" | "unknown"
  estimatedMonthlyVisits: null
  marketVisibility: MarketVisibilityIndex
  error?: string
}

export async function collectSmbSignals(
  domain: string,
  wappalyzerTech: string[],
  dnsMxRecords: Array<{ exchange: string }>,
  publicSources: Omit<MarketVisibilityInput, "domain"> = {},
): Promise<SmbSignalsResult> {
  try {
    const cleanDomain = canonicalDomain(domain)
    
    const [googleCount, social, techTier, emailProvider] = await Promise.all([
      checkGoogleIndex(cleanDomain),
      checkSocialPresence(cleanDomain),
      classifyTechTier(wappalyzerTech),
      detectEmailProvider(dnsMxRecords),
    ])

    // Estimate business maturity
    let maturity: SmbSignalsResult["businessMaturity"] = "unknown"
    const signalScore = 
      (googleCount ? (googleCount > 500 ? 3 : googleCount > 50 ? 2 : 1) : 0) +
      (social.instagram ? 2 : 0) + (social.twitter ? 1 : 0) + (social.facebook ? 1 : 0) +
      (techTier === "advanced" ? 3 : techTier === "standard" ? 2 : 1) +
      (emailProvider?.includes("Google") ? 2 : emailProvider?.includes("Microsoft") ? 2 : 0) +
      0

    if (signalScore >= 10) maturity = "established"
    else if (signalScore >= 5) maturity = "growing"
    else maturity = "early"

    const marketVisibility = buildMarketVisibilityIndex({
      domain: cleanDomain,
      ...publicSources,
    })

    return {
      ok: true,
      domain: cleanDomain,
      googleIndexCount: googleCount,
      socialFollowers: social,
      reviewCount: null,
      techTier,
      emailProvider,
      businessMaturity: maturity,
      estimatedMonthlyVisits: null,
      marketVisibility,
    }
  } catch (e) {
    console.error("[smb-signals] failed:", e)
    return {
      ok: false,
      domain,
      googleIndexCount: null,
      socialFollowers: { instagram: null, twitter: null, facebook: null },
      reviewCount: null,
      techTier: "unknown",
      emailProvider: null,
      businessMaturity: "unknown",
      estimatedMonthlyVisits: null,
      marketVisibility: buildMarketVisibilityIndex({ domain }),
      error: e instanceof Error ? e.message : "SMB signals collection failed",
    }
  }
}

async function checkGoogleIndex(domain: string): Promise<number | null> {
  // Google scraping removed per compliance — use official API or skip this signal
  return null
}

async function checkSocialPresence(domain: string): Promise<SmbSignalsResult["socialFollowers"]> {
  const result = { instagram: null as number | null, twitter: null as number | null, facebook: null as number | null }
  
  // Check homepage for social links
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { "User-Agent": "RevenueOS/1.0" },
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    })
    if (!res.ok) return result
    const html = await res.text()
    
    // Extract Instagram follower count (if embedded)
    const igMatch = html.match(/instagram\.com\/([^/"\s]+)/i)
    if (igMatch) result.instagram = 1 // At least they have Instagram
    
    // Twitter/X presence
    const twMatch = html.match(/(?:twitter\.com|x\.com)\/([^/"\s]+)/i)
    if (twMatch) result.twitter = 1
    
    // Facebook presence
    const fbMatch = html.match(/facebook\.com\/([^/"\s]+)/i)
    if (fbMatch && !fbMatch[1].startsWith("share")) result.facebook = 1
  } catch (e) {
    console.error("[smb-signals] social presence check failed:", e)
  }
  
  return result
}

function classifyTechTier(tech: string[]): SmbSignalsResult["techTier"] {
  const advancedSignals = ["Stripe", "Shopify", "Intercom", "HubSpot", "Salesforce", "Marketo", "Next.js", "Vercel"]
  const standardSignals = ["WordPress", "WooCommerce", "Google Analytics", "Cloudflare", "Wix", "Squarespace"]
  
  const hasAdvanced = tech.some(t => advancedSignals.includes(t))
  const hasStandard = tech.some(t => standardSignals.includes(t))
  
  if (hasAdvanced) return "advanced"
  if (hasStandard) return "standard"
  return "basic"
}

function detectEmailProvider(mxRecords: Array<{ exchange: string }>): string | null {
  const mx = mxRecords.map(r => r.exchange.toLowerCase()).join(" ")
  if (mx.includes("google") || mx.includes("aspmx")) return "Google Workspace"
  if (mx.includes("outlook") || mx.includes("protection.outlook")) return "Microsoft 365"
  if (mx.includes("zoho")) return "Zoho"
  if (mx.includes("sendgrid")) return "SendGrid"
  if (mx.includes("mailgun")) return "Mailgun"
  if (mx.includes("amazonses")) return "Amazon SES"
  return null
}
