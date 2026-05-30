#!/usr/bin/env node
/**
 * Seed Sales OS content templates.
 *
 * Creates the first ja/en template matrix for:
 * - Next.js diagnostic reports
 * - Astro replacement demo sites
 * - Slidev/Gotenberg proposal decks
 * - ComfyUI/HyperFrames/Remotion sales videos
 */

const ASSET_TYPES = ["diagnostic_report", "astro_demo_site", "sales_deck", "sales_video"]
const INDUSTRIES = [
  "beauty_salon",
  "dental",
  "restaurant",
  "construction",
  "accounting",
  "retail",
  "cleaning",
  "consulting",
]

const INDUSTRY_LABELS = {
  beauty_salon: { ja: "美容サロン", en: "beauty salon" },
  dental: { ja: "歯科", en: "dental clinic" },
  restaurant: { ja: "飲食店", en: "restaurant" },
  construction: { ja: "建設・工務店", en: "construction company" },
  accounting: { ja: "会計事務所", en: "accounting firm" },
  retail: { ja: "小売・店舗", en: "retail business" },
  cleaning: { ja: "清掃・メンテナンス", en: "cleaning service" },
  consulting: { ja: "コンサルティング", en: "consulting firm" },
}

const LOCALES = ["ja", "en"]
const ANGLES = {
  ja: ["revenue_recovery", "trust_authority", "speed_conversion", "automation_dx"],
  en: ["japan_entry", "trust_authority", "speed_conversion", "video_retention"],
}
const OFFER_BY_ANGLE = {
  revenue_recovery: { code: "jp_web_production", variant: "website_diagnostic" },
  trust_authority: { code: "jp_web_production", variant: "website_diagnostic" },
  speed_conversion: { code: "jp_web_production", variant: "website_diagnostic" },
  automation_dx: { code: "jp_dx_package", variant: "outreach" },
  japan_entry: { code: "global_jaas", variant: "japan_entry" },
  video_retention: { code: "global_video_subscription", variant: "video_subscription" },
}

const ASSET_TOOLCHAIN = {
  diagnostic_report: {
    primary: "Next.js",
    support: ["Dify", "DeepSeek V4", "PageSpeed", "Wappalyzer", "gBizInfo", "Google Places"],
  },
  astro_demo_site: { primary: "Astro", support: ["Dify", "Next.js preview", "Cloudflare R2"] },
  sales_deck: { primary: "Slidev", support: ["Gotenberg", "Dify", "Tavily", "Serp API"] },
  sales_video: {
    primary: "HyperFrames",
    support: ["ComfyUI", "Remotion", "Faster Whisper", "MoviePy", "Cloudflare R2"],
  },
}

const OUTPUT_CONTRACT = {
  diagnostic_report: { format: "json", required: ["hero", "evidence", "pain_points", "offer", "cta"] },
  astro_demo_site: { format: "astro_sections", required: ["hero", "proof", "service", "case", "cta"] },
  sales_deck: { format: "slidev_markdown", required: ["title", "problem", "evidence", "proposal", "timeline", "cta"] },
  sales_video: { format: "video_brief", required: ["hook", "scenes", "voiceover", "asset_prompts", "cta"] },
}

function titleFor(locale, industry, assetType, angle) {
  const lang = locale === "ja" ? "ja" : "en"
  const industryName = INDUSTRY_LABELS[industry][lang]
  const assetLabel = {
    diagnostic_report: lang === "ja" ? "診断レポート" : "diagnostic report",
    astro_demo_site: lang === "ja" ? "Astro差し替えデモ" : "Astro replacement demo",
    sales_deck: lang === "ja" ? "営業資料" : "sales deck",
    sales_video: lang === "ja" ? "営業動画" : "sales video",
  }[assetType]
  return `${industryName} / ${angle} / ${assetLabel}`
}

function qualityBar(locale, assetType) {
  const ja = locale === "ja"
  if (assetType === "diagnostic_report") {
    return ja ? "1画面目で結論、根拠、損失、次アクションが読める。" : "First viewport shows conclusion, proof, loss, and next action."
  }
  if (assetType === "astro_demo_site") {
    return ja ? "スマホでも改善後の導線とCTAが迷わず伝わる。" : "Mobile visitors understand the improved CTA path immediately."
  }
  if (assetType === "sales_deck") {
    return ja ? "10枚以内で根拠、提案、費用、導入順、予約導線まで完結。" : "Under ten slides from proof to proposal, pricing, rollout, and booking."
  }
  return ja ? "15秒以内に痛みと改善後の未来が伝わる。" : "Show pain and improved future within 15 seconds."
}

function purpose(locale, assetType) {
  const ja = locale === "ja"
  if (assetType === "diagnostic_report") return ja ? "公開データから痛みと優先施策を可視化する。" : "Visualize pains and priorities from public evidence."
  if (assetType === "astro_demo_site") return ja ? "改善後のファーストビューを即体験できるデモへ変換する。" : "Turn the recommendation into a live replacement demo."
  if (assetType === "sales_deck") return ja ? "商談で共有する根拠付き提案資料にまとめる。" : "Package the proposal into a shareable evidence-backed deck."
  return ja ? "診断要点を営業動画として資料やフォローに埋め込む。" : "Embed the diagnostic story as a sales video."
}

function prompt(locale, industry, assetType, angle) {
  const lang = locale === "ja" ? "ja" : "en"
  const industryName = INDUSTRY_LABELS[industry][lang]
  const base = locale === "ja"
    ? `${industryName}向けに企業カルテ、痛み、推奨商材、レポートURL、デモURLを使って作成してください。`
    : `Create for a ${industryName} using company evidence, pains, recommended offer, report URL, and demo URL.`
  return `${base}\nAsset: ${assetType}. Appeal angle: ${angle}. Never invent unavailable evidence. Preserve URLs exactly.`
}

function structure(assetType, angle) {
  const common = { angle, personalization_inputs: ["company_name", "industry", "pain_points", "source_runs", "report_url", "demo_url"] }
  if (assetType === "diagnostic_report") return { ...common, sections: ["hero", "evidence", "pain", "loss", "offer", "cta"] }
  if (assetType === "astro_demo_site") return { ...common, sections: ["hero", "proof_bar", "service_cards", "case_preview", "booking_cta"] }
  if (assetType === "sales_deck") return { ...common, slides: ["title", "why_now", "evidence", "demo", "proposal", "timeline", "pricing", "next_step"] }
  return { ...common, scenes: ["hook", "data_reveal", "pain", "solution", "proof", "cta"] }
}

function templates() {
  return LOCALES.flatMap((locale) =>
    INDUSTRIES.flatMap((industry) =>
      ANGLES[locale].flatMap((angle) =>
        ASSET_TYPES.map((assetType) => {
          const offer = OFFER_BY_ANGLE[angle]
          return {
            region: locale === "ja" ? "jp" : "global",
            report_locale: locale,
            target_country: locale === "ja" ? "JP" : "US",
            industry,
            offer_code: offer.code,
            asset_type: assetType,
            appeal_angle: angle,
            template_variant: offer.variant,
            title: titleFor(locale, industry, assetType, angle),
            purpose: purpose(locale, assetType),
            quality_bar: qualityBar(locale, assetType),
            dify_selection_rule: `locale=${locale} / industry=${industry} / asset=${assetType} / angle=${angle}`,
            structure: structure(assetType, angle),
            prompt_template: prompt(locale, industry, assetType, angle),
            output_contract: OUTPUT_CONTRACT[assetType],
            toolchain: ASSET_TOOLCHAIN[assetType],
            sample_copy: locale === "ja" ? "企業カルテから自然に成果物へ接続する構成です。" : "A pattern that turns company evidence into a sales asset.",
            is_active: true,
            version: 1,
          }
        }),
      ),
    ),
  )
}

function supabaseFromEnv() {
  const url = (process.env.SALES_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "")
  const key = process.env.SALES_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("SALES_SUPABASE_URL and SALES_SUPABASE_SERVICE_ROLE_KEY are required")
  return { url, key }
}

async function upsert(rows) {
  const { url, key } = supabaseFromEnv()
  const res = await fetch(`${url}/rest/v1/sales_content_templates?on_conflict=report_locale,target_country,industry,offer_code,asset_type,appeal_angle,template_variant,version`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
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
