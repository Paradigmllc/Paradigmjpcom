#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js"
import { readCoolifyApplicationEnvs } from "./lib/coolify-env.mjs"

const USER_AGENT = "Mozilla/5.0 (Paradigm Wappalyzer Scan/1.0; +https://paradigmjp.com)"

const SIGNATURES = [
  sig("WordPress", "CMS", 92, [/wp-content|wp-includes|generator["'][^>]+wordpress|\/wp-json\//i]),
  sig("Contact Form 7", "Form", 90, [/wpcf7|contact-form-7|_wpcf7/i]),
  sig("WPForms", "Form", 88, [/wpforms|wpforms-field|wpforms-submit/i]),
  sig("Gravity Forms", "Form", 88, [/gform_wrapper|gravityforms|gform_submit_button/i]),
  sig("Drupal", "CMS", 88, [/sites\/default\/files|drupal\.js|drupal-settings-json/i]),
  sig("Shopify", "EC", 92, [/cdn\.shopify\.com|shopify-section|Shopify\.theme/i]),
  sig("BASE", "EC", 82, [/binc\.jp|thebase\.in|baseec-img/i]),
  sig("STORES", "EC", 82, [/stores\.jp|stores\.dev/i]),
  sig("Squarespace", "CMS", 84, [/squarespace-cdn|sqs-block|static1\.squarespace/i]),
  sig("Wix", "CMS", 88, [/wixstatic\.com|wix-warmup|X-Wix-/i]),
  sig("Webflow", "CMS", 88, [/webflow\.js|assets\.website-files\.com|data-wf-page/i]),
  sig("Next.js", "Framework", 92, [/__NEXT_DATA__|_next\/static|next-route-announcer/i], [/x-nextjs-cache/i]),
  sig("Nuxt.js", "Framework", 88, [/__NUXT__|_nuxt\/|data-n-head/i]),
  sig("Astro", "Framework", 84, [/astro-island|astro-slot|\/_astro\//i]),
  sig("React", "Framework", 72, [/react-dom|react\.production|data-reactroot/i]),
  sig("Vue.js", "Framework", 72, [/vue\.js|vue\.runtime|data-v-[a-f0-9]/i]),
  sig("Laravel", "Framework", 80, [/laravel|csrf-token/i], [], [/laravel_session/i]),
  sig("Google Analytics", "Analytics", 88, [/google-analytics\.com|gtag\/js|G-[A-Z0-9]{6,}/i]),
  sig("Google Tag Manager", "Analytics", 90, [/googletagmanager\.com|GTM-[A-Z0-9]+/i]),
  sig("Meta Pixel", "Analytics", 82, [/connect\.facebook\.net\/.*\/fbevents\.js|fbq\(/i]),
  sig("TikTok Pixel", "Analytics", 82, [/analytics\.tiktok\.com\/i18n\/pixel|ttq\.load|ttq\.track|TikTokAnalyticsObject/i]),
  sig("Klaviyo", "Marketing", 84, [/static\.klaviyo\.com|klaviyo\.js|learnq\.push|_learnq/i], [], [/__kla_id/i]),
  sig("Microsoft Clarity", "Analytics", 82, [/clarity\.ms\/tag|clarity\(/i]),
  sig("Hotjar", "Analytics", 84, [/hotjar\.com|static\.hotjar|hj\(/i]),
  sig("Stripe", "Payment", 90, [/js\.stripe\.com|stripe-elements|card-number/i]),
  sig("PayPal", "Payment", 88, [/paypal\.com\/sdk|paypalobjects\.com/i]),
  sig("Intercom", "Chat", 86, [/widget\.intercom\.io|intercomSettings/i]),
  sig("Chatwoot", "Chat", 86, [/chatwoot|window\.chatwootSDK/i]),
  sig("HubSpot", "CRM", 88, [/js\.hs-scripts\.com|hsforms\.com|hubspotutk/i], [], [/hubspotutk/i]),
  sig("Salesforce", "CRM", 84, [/force\.com|salesforceliveagent|pardot/i]),
  sig("Marketo", "Marketing", 82, [/munchkin\.js|marketo|mktoForm/i]),
  sig("Cloudflare", "CDN", 80, [/cloudflare|cf-ray|cdn-cgi/i], [/cloudflare|cf-cache-status|cf-ray/i]),
  sig("Cloudflare Turnstile", "Bot Protection", 95, [/cf-turnstile|challenges\.cloudflare\.com\/turnstile|turnstile\.render/i]),
  sig("Cloudflare Challenge", "Bot Protection", 96, [/cdn-cgi\/challenge-platform|cf-chl-|cf-browser-verification|Attention Required! \| Cloudflare/i]),
  sig("reCAPTCHA", "Bot Protection", 95, [/google\.com\/recaptcha|g-recaptcha|grecaptcha|recaptcha\/api\.js/i]),
  sig("hCaptcha", "Bot Protection", 95, [/hcaptcha\.com|h-captcha/i]),
  sig("DataDome", "Bot Protection", 90, [/datadome|ddcid/i], [], [/datadome/i]),
  sig("Imperva", "Bot Protection", 86, [/incapsula|imperva|_Incapsula_Resource/i], [], [/incap_ses|visid_incap/i]),
  sig("AWS CloudFront", "CDN", 82, [/cloudfront\.net/i], [/cloudfront|x-amz-cf/i]),
  sig("Vercel", "Hosting", 88, [/vercel-deployment|_vercel/i], [/x-vercel|vercel/i]),
  sig("Netlify", "Hosting", 88, [/netlify\.app|netlify-deploy/i], [/netlify/i]),
  sig("Cal.com", "Booking", 88, [/cal\.com\/embed|calendso/i]),
  sig("Calendly", "Booking", 88, [/calendly\.com|calendly-inline-widget/i]),
]

function sig(name, category, confidence, patterns, headerPatterns = [], cookiePatterns = []) {
  return { name, category, confidence, patterns, headerPatterns, cookiePatterns }
}

function normalizeTechnologySlug(name) {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "unknown"
}

function normalizeUrl(domain) {
  const clean = String(domain ?? "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
  if (!clean) return null
  return `https://${clean}`
}

function headersText(headers) {
  const out = []
  headers.forEach((value, key) => out.push(`${key}: ${value}`))
  return out.join("\n")
}

function evidenceFor(signature, html, headers, cookies) {
  const evidence = []
  if (signature.patterns.some((pattern) => pattern.test(html))) evidence.push("html")
  if (signature.headerPatterns.some((pattern) => pattern.test(headers))) evidence.push("header")
  if (signature.cookiePatterns.some((pattern) => pattern.test(cookies))) evidence.push("cookie")
  return [...new Set(evidence)]
}

async function detectTechStack(domain) {
  const url = normalizeUrl(domain)
  if (!url) return { ok: false, tech: [], server: null, error: "domain is empty" }
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": USER_AGENT },
    })
    const html = await res.text()
    const headers = headersText(res.headers)
    const cookies = res.headers.get("set-cookie") ?? ""
    const tech = SIGNATURES.map((signature) => {
      const evidence = evidenceFor(signature, html, headers, cookies)
      if (evidence.length === 0) return null
      return {
        name: signature.name,
        category: signature.category,
        confidence: signature.confidence,
        evidence,
      }
    }).filter(Boolean)
    return { ok: res.ok, tech, server: res.headers.get("server"), status: res.status }
  } catch (error) {
    return {
      ok: false,
      tech: [],
      server: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

function mergeMeta(meta, detected) {
  const base = meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {}
  return {
    ...base,
    tech: {
      ...(base.tech && typeof base.tech === "object" && !Array.isArray(base.tech) ? base.tech : {}),
      stack: detected.tech,
      server: detected.server,
      scanned_at: new Date().toISOString(),
    },
  }
}

async function main() {
  const limitArg = Number(process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1] ?? "100")
  const limit = Number.isFinite(limitArg) ? Math.max(1, Math.min(limitArg, 500)) : 100
  const envs = await readCoolifyApplicationEnvs()
  const url = envs.SALES_SUPABASE_URL ?? process.env.SALES_SUPABASE_URL
  const key = envs.SALES_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SALES_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("SALES_SUPABASE_URL or SALES_SUPABASE_SERVICE_ROLE_KEY is missing")

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await sb
    .from("sales_companies")
    .select("id, company_name, domain, meta")
    .not("domain", "is", null)
    .limit(limit)

  if (error) throw new Error(`sales_companies read failed: ${error.message}`)

  let scanned = 0
  let detectedCount = 0
  let sourceRows = 0
  const failures = []
  const warnings = []

  for (const company of data ?? []) {
    const detected = await detectTechStack(company.domain)
    scanned += 1
    detectedCount += detected.tech.length
    const measuredAt = new Date().toISOString()

    const { error: sourceError } = await sb.from("sales_source_runs").upsert(
      {
        company_id: company.id,
        source_slug: "wappalyzer",
        category: "analysis",
        status: detected.tech.length > 0 ? "collected" : detected.ok ? "missing" : "error",
        score: detected.tech.length > 0 ? 90 : detected.ok ? 20 : 0,
        details: {
          label: "Wappalyzer / local signatures",
          domain: company.domain,
          status: detected.status ?? null,
          technologies: detected.tech.map((item) => item.name),
          error: detected.error ?? null,
        },
        measured_at: measuredAt,
      },
      { onConflict: "company_id,source_slug" },
    )
    if (sourceError) failures.push(`${company.domain}: source_runs ${sourceError.message}`)
    else sourceRows += 1

    const { error: updateError } = await sb
      .from("sales_companies")
      .update({ meta: mergeMeta(company.meta, detected) })
      .eq("id", company.id)
    if (updateError) failures.push(`${company.domain}: company meta ${updateError.message}`)

    if (detected.tech.length > 0) {
      const rows = detected.tech.map((item) => ({
        company_id: company.id,
        technology_name: item.name,
        technology_slug: normalizeTechnologySlug(item.name),
        category: item.category,
        confidence: item.confidence,
        evidence: item.evidence,
        source_slug: "wappalyzer",
        server_header: detected.server,
        detected_at: measuredAt,
      }))
      const { error: techError } = await sb
        .from("sales_tech_stack_detections")
        .upsert(rows, { onConflict: "company_id,technology_slug,category,source_slug" })
      if (techError) {
        warnings.push(`${company.domain}: tech_stack ${techError.message}`)
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: failures.length === 0,
        scanned,
        detected: detectedCount,
        sourceRows,
        normalizedTableWrites: Math.max(0, detectedCount - warnings.length),
        warnings: warnings.slice(0, 10),
        failures: failures.slice(0, 10),
      },
      null,
      2,
    ),
  )
  if (failures.length > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
