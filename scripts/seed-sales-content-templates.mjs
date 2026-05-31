#!/usr/bin/env node
/**
 * Seed professional Sales OS content templates into Supabase.
 * Secrets are read from env only and are never printed.
 */

import { readFileSync } from "node:fs"

const LOCALE_COPY = JSON.parse(
  readFileSync(new URL("../src/lib/sales/content-template-locales.json", import.meta.url), "utf8"),
)

const ASSET_TYPES = ["diagnostic_report", "astro_demo_site", "sales_deck", "sales_video"]
const INDUSTRIES = ["beauty_salon", "dental", "restaurant", "construction", "accounting", "retail", "cleaning", "consulting"]
const LOCALES = ["ja", "en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"]
const ANGLES = {
  ja: ["revenue_recovery", "trust_authority", "speed_conversion", "automation_dx"],
  en: ["japan_entry", "trust_authority", "speed_conversion", "video_retention"],
  ko: ["japan_entry"],
  zh: ["japan_entry"],
  de: ["japan_entry"],
  fr: ["japan_entry"],
  es: ["japan_entry"],
  pt: ["japan_entry"],
  ru: ["japan_entry"],
  ar: ["japan_entry"],
  vi: ["japan_entry"],
  id: ["japan_entry"],
}

const COUNTRY_BY_LOCALE = {
  ja: "JP",
  en: "US",
  ko: "KR",
  zh: "CN",
  de: "DE",
  fr: "FR",
  es: "ES",
  pt: "BR",
  ru: "RU",
  ar: "AE",
  vi: "VN",
  id: "ID",
}

function countryForLocale(locale) {
  return COUNTRY_BY_LOCALE[locale] ?? "US"
}

const INDUSTRY_LABELS = LOCALE_COPY.industries
const ASSET_LABELS = LOCALE_COPY.assets
const ANGLE_LABELS = LOCALE_COPY.appeals

const OFFER_BY_ANGLE = {
  revenue_recovery: { code: "jp_web_production", variant: "website_diagnostic" },
  trust_authority: { code: "jp_web_production", variant: "website_diagnostic" },
  speed_conversion: { code: "jp_web_production", variant: "website_diagnostic" },
  automation_dx: { code: "jp_dx_package", variant: "outreach" },
  japan_entry: { code: "global_jaas", variant: "japan_entry" },
  video_retention: { code: "global_video_subscription", variant: "video_subscription" },
}

const TOOLCHAIN = {
  diagnostic_report: { primary: "Next.js", support: ["Dify", "DeepSeek V4", "PageSpeed", "Wappalyzer", "gBizInfo", "Google Places"] },
  astro_demo_site: { primary: "Astro", support: ["Dify", "Playwright screenshot", "Cloudflare R2"] },
  sales_deck: { primary: "Slidev", support: ["Gotenberg", "Dify", "Tavily", "Serp API"] },
  sales_video: { primary: "HyperFrames", support: ["ComfyUI", "Remotion", "Faster Whisper", "MoviePy", "Cloudflare R2"] },
}

const CONTRACT = {
  diagnostic_report: { format: "json", required: ["executive_summary", "evidence", "business_impact", "proposal", "cta"] },
  astro_demo_site: { format: "astro_sections", required: ["hero", "proof_bar", "service_path", "case_preview", "booking_cta"] },
  sales_deck: { format: "slidev_markdown", required: ["title", "why_now", "evidence", "proposal", "timeline", "price_logic", "cta"] },
  sales_video: { format: "video_brief", required: ["hook", "scenes", "voiceover", "visual_prompts", "cta"] },
}

function lang(locale) {
  return LOCALES.includes(locale) ? locale : "en"
}

function title(locale, industry, asset, angle) {
  const l = lang(locale)
  return `${INDUSTRY_LABELS[industry][l]} | ${ANGLE_LABELS[angle][l]} | ${ASSET_LABELS[asset][l]}`
}

function purpose(locale, asset, angle) {
  if (asset === "sales_video" && angle === "video_retention") return LOCALE_COPY.purpose.sales_video_retention[locale]
  return LOCALE_COPY.purpose[asset][locale]
}

function quality(locale, asset) {
  return LOCALE_COPY.quality[asset][locale]
}

function prompt(locale, industry, asset, angle) {
  const industryName = INDUSTRY_LABELS[industry][lang(locale)]
  const promptCopy = LOCALE_COPY.prompt
  const base = [
    promptCopy.intro[locale].replace("{industry}", industryName),
    promptCopy.evidence[locale],
    promptCopy.tone[locale],
    promptCopy.claimGuard[locale],
  ]
  return [
    ...base,
    `${promptCopy.appealPrefix[locale]}: ${ANGLE_LABELS[angle][lang(locale)]}`,
    promptCopy.assetInstruction[asset][locale],
    promptCopy.urlGuard[locale],
  ].join("\n")
}

function structure(asset, angle) {
  const common = { angle, personalization_inputs: ["company_name", "industry", "pain_points", "source_runs", "report_url", "demo_url"] }
  if (asset === "diagnostic_report") return { ...common, sections: ["hero", "evidence", "business_impact", "proposal", "cta"] }
  if (asset === "astro_demo_site") return { ...common, sections: ["hero", "proof_bar", "service_path", "case_preview", "booking_cta"] }
  if (asset === "sales_deck") return { ...common, slides: ["title", "why_now", "evidence", "demo", "proposal", "timeline", "price_logic", "next_step"] }
  return { ...common, scenes: ["personal_hook", "evidence_reveal", "pain_to_solution", "demo_glimpse", "cta"] }
}

function selectionRule(locale, industry, asset, angle) {
  const selection = LOCALE_COPY.selection
  const l = lang(locale)
  return [
    `${selection.language[locale]}=${locale}`,
    `${selection.country[locale]}=${countryForLocale(locale)}`,
    `${selection.industry[locale]}=${INDUSTRY_LABELS[industry][l]}`,
    `${selection.asset[locale]}=${ASSET_LABELS[asset][l]}`,
    `${selection.appeal[locale]}=${ANGLE_LABELS[angle][l]}`,
    selection.priority[locale],
    selection.guard[locale],
  ].join(" / ")
}

function sampleCopy(locale, industry, asset, angle) {
  const l = lang(locale)
  return LOCALE_COPY.sample[locale]
    .replace("{industry}", INDUSTRY_LABELS[industry][l])
    .replace("{appeal}", ANGLE_LABELS[angle][l])
    .replace("{asset}", ASSET_LABELS[asset][l])
}

function templates() {
  return LOCALES.flatMap((locale) =>
    INDUSTRIES.flatMap((industry) =>
      ANGLES[locale].flatMap((angle) =>
        ASSET_TYPES.map((asset) => {
          const offer = OFFER_BY_ANGLE[angle]
          return {
            region: locale === "ja" ? "jp" : "global",
            report_locale: locale,
            target_country: countryForLocale(locale),
            industry,
            offer_code: offer.code,
            asset_type: asset,
            appeal_angle: angle,
            template_variant: offer.variant,
            title: title(locale, industry, asset, angle),
            purpose: purpose(locale, asset, angle),
            quality_bar: quality(locale, asset),
            dify_selection_rule: selectionRule(locale, industry, asset, angle),
            structure: structure(asset, angle),
            prompt_template: prompt(locale, industry, asset, angle),
            output_contract: CONTRACT[asset],
            toolchain: TOOLCHAIN[asset],
            sample_copy: sampleCopy(locale, industry, asset, angle),
            is_active: true,
            version: 1,
          }
        }),
      ),
    ),
  )
}

function supabaseFromEnv() {
  const rawUrl = readFirstEnv(["SALES_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"])
  const key = readFirstEnv(["SALES_SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"])
  const url = rawUrl.replace(/\/+$/, "")
  return { url, key }
}

function readFirstEnv(names) {
  for (const name of names) {
    const value = process.env[name]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  throw new Error(`Missing required environment variable. Tried: ${names.join(", ")}`)
}

async function upsert(rows) {
  const { url, key } = supabaseFromEnv()
  const res = await fetch(`${url}/rest/v1/sales_content_templates?on_conflict=report_locale,target_country,industry,offer_code,asset_type,appeal_angle,template_variant,version`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`sales_content_templates upsert failed: HTTP ${res.status} ${text.slice(0, 200)}`)
  return JSON.parse(text)
}

async function main() {
  const rows = templates()
  if (process.argv.includes("--print-count")) {
    console.log(rows.length)
    return
  }
  const saved = await upsert(rows)
  console.log(`Seeded sales_content_templates: ${saved.length}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
