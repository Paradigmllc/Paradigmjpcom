#!/usr/bin/env node
/**
 * Seed professional Sales OS content templates into Supabase.
 * Secrets are read from env only and are never printed.
 */

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

const INDUSTRY_LABELS = {
  beauty_salon: { ja: "美容サロン", en: "beauty salon" },
  dental: { ja: "歯科医院", en: "dental clinic" },
  restaurant: { ja: "飲食店", en: "restaurant" },
  construction: { ja: "建設・工務店", en: "construction company" },
  accounting: { ja: "会計事務所", en: "accounting firm" },
  retail: { ja: "小売・店舗", en: "retail business" },
  cleaning: { ja: "清掃・メンテナンス", en: "cleaning service" },
  consulting: { ja: "コンサルティング", en: "consulting firm" },
}

const ASSET_LABELS = {
  diagnostic_report: { ja: "診断レポート", en: "diagnostic report" },
  astro_demo_site: { ja: "Astroデモサイト", en: "Astro replacement demo" },
  sales_deck: { ja: "営業資料", en: "sales deck" },
  sales_video: { ja: "営業動画", en: "sales video" },
}

const ANGLE_LABELS = {
  revenue_recovery: { ja: "売上機会の回収", en: "revenue recovery" },
  trust_authority: { ja: "信頼・権威づけ", en: "trust and authority" },
  speed_conversion: { ja: "速度・CV改善", en: "speed and conversion" },
  automation_dx: { ja: "DX・自動化", en: "automation and DX" },
  japan_entry: { ja: "日本市場参入", en: "Japan market entry" },
  video_retention: { ja: "動画継続納品", en: "video retention" },
}

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
  return locale === "ja" ? "ja" : "en"
}

function title(locale, industry, asset, angle) {
  const l = lang(locale)
  return `${INDUSTRY_LABELS[industry][l]} | ${ANGLE_LABELS[angle][l]} | ${ASSET_LABELS[asset][l]}`
}

function purpose(locale, asset, angle) {
  const ja = locale === "ja"
  if (asset === "diagnostic_report") return ja ? "公開データと実測値を、相手がすぐ理解できる損失仮説・改善優先度・提案導線へ変換する。" : "Turn public evidence into a clear loss hypothesis, prioritized actions, and a proposal path."
  if (asset === "astro_demo_site") return ja ? "診断で見つけた弱点を、改善後のファーストビューとCTA導線として体験できるデモにする。" : "Convert diagnostic weaknesses into a tangible improved first view and CTA journey."
  if (asset === "sales_deck") return ja ? "商談前後に共有できる、根拠・提案・費用感・進行計画が揃った意思決定用資料にする。" : "Package proof, proposal, pricing logic, and rollout into a decision-ready deck."
  if (angle === "video_retention") return ja ? "月次で量産できる動画納品サブスクの価値を、初回提案から具体的に見せる。" : "Show the value of a recurring short-video production subscription from the first proposal."
  return ja ? "診断の要点を短い営業動画にして、資料内やフォローで視聴されやすくする。" : "Create a compact sales video that makes the diagnostic story easy to watch and share."
}

function quality(locale, asset) {
  const ja = locale === "ja"
  if (asset === "diagnostic_report") return ja ? "1画面目で結論・根拠・損失仮説・次アクションが読める。脅しではなく、客観データと改善余地を中心にする。" : "The first viewport shows conclusion, evidence, loss hypothesis, and next action without hype."
  if (asset === "astro_demo_site") return ja ? "スマホで見た瞬間に、現状サイトとの差分、信頼要素、予約・問い合わせ導線が分かる。装飾より速度と明瞭さを優先する。" : "On mobile, the visitor immediately sees the improved difference, trust proof, and CTA path."
  if (asset === "sales_deck") return ja ? "10枚以内。問題提起、実測根拠、提案、概算、導入順序、予約導線まで過不足なく入れる。" : "Ten slides or fewer, from problem and evidence to proposal, estimate, rollout, and booking."
  return ja ? "冒頭15秒で相手企業固有の痛みを提示し、60秒前後で改善後の未来とCTAまで到達する。" : "Within 15 seconds, show the account-specific pain; around 60 seconds, reach the improved future and CTA."
}

function prompt(locale, industry, asset, angle) {
  const ja = locale === "ja"
  const industryName = INDUSTRY_LABELS[industry][lang(locale)]
  const base = ja
    ? [
        `あなたはParadigmの営業戦略・制作ディレクターです。対象は${industryName}です。`,
        "入力される企業カルテ、公開データ、実測値、診断レポートURL、デモURLだけを根拠にしてください。",
        "相手を煽りすぎず、経営者が次の15分商談を自然に受けたくなる温度で書いてください。",
        "法改正、罰金額、市場統計、CAGR、業界平均は一次情報URLが無い限り顧客向けに断定しないでください。",
      ]
    : [
        `You are Paradigm's sales strategist and production director. The target is a ${industryName}.`,
        "Use only the provided company dossier, public evidence, measured data, report URL, and demo URL.",
        "Keep the tone executive, specific, and helpful. Never invent unavailable evidence or overclaim results.",
        "Do not assert legal, penalty, market, CAGR, or benchmark claims without a primary-source URL.",
      ]
  const instruction = {
    diagnostic_report: ja ? "Next.js診断レポート用に、hero、根拠カード、損失仮説、改善優先度、提案、CTAをJSONで出力してください。" : "Output JSON for a Next.js diagnostic report: hero, evidence cards, loss hypothesis, priorities, proposal, and CTA.",
    astro_demo_site: ja ? "Astroデモサイト用に、hero、信頼証拠、サービス導線、改善後CTA、計測イベントをセクション単位で出力してください。" : "Output Astro demo sections: hero, trust proof, service path, improved CTA, and tracking events.",
    sales_deck: ja ? "Slidev/GotenbergでPDF化できる営業資料として、10枚以内のMarkdownを出力してください。" : "Output Slidev-compatible Markdown for a PDF proposal deck in ten slides or fewer.",
    sales_video: ja ? "HyperFrames/Remotion/ComfyUI用に、60秒前後の構成、ナレーション、ビジュアル指示、字幕要約を出力してください。" : "Output a roughly 60-second brief for HyperFrames/Remotion/ComfyUI with scenes, narration, visuals, and captions.",
  }[asset]
  return [...base, `訴求角度: ${ANGLE_LABELS[angle][lang(locale)]}`, instruction, "URLは必ずそのまま保持してください。"].join("\n")
}

function structure(asset, angle) {
  const common = { angle, personalization_inputs: ["company_name", "industry", "pain_points", "source_runs", "report_url", "demo_url"] }
  if (asset === "diagnostic_report") return { ...common, sections: ["hero", "evidence", "business_impact", "proposal", "cta"] }
  if (asset === "astro_demo_site") return { ...common, sections: ["hero", "proof_bar", "service_path", "case_preview", "booking_cta"] }
  if (asset === "sales_deck") return { ...common, slides: ["title", "why_now", "evidence", "demo", "proposal", "timeline", "price_logic", "next_step"] }
  return { ...common, scenes: ["personal_hook", "evidence_reveal", "pain_to_solution", "demo_glimpse", "cta"] }
}

function templates() {
  return LOCALES.flatMap((locale) =>
    INDUSTRIES.flatMap((industry) =>
      ANGLES[locale].flatMap((angle) =>
        ASSET_TYPES.map((asset) => {
          const offer = OFFER_BY_ANGLE[angle]
          const l = lang(locale)
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
            dify_selection_rule: `言語=${locale} / 国=${countryForLocale(locale)} / 業界=${INDUSTRY_LABELS[industry][l]} / 成果物=${ASSET_LABELS[asset][l]} / 訴求=${ANGLE_LABELS[angle][l]} / 優先順位: 完全一致 > 業界一致 > 商材一致 > 痛み根拠の強さ > 最新version / 未検証の法改正・罰金・市場統計・CAGRを断定しない`,
            structure: structure(asset, angle),
            prompt_template: prompt(locale, industry, asset, angle),
            output_contract: CONTRACT[asset],
            toolchain: TOOLCHAIN[asset],
            sample_copy: locale === "ja" ? `${INDUSTRY_LABELS[industry].ja}向けに「${ANGLE_LABELS[angle].ja}」を軸に、企業カルテと実測根拠から${ASSET_LABELS[asset].ja}へ展開する。` : `For a ${INDUSTRY_LABELS[industry].en}, turn measured evidence into a ${ASSET_LABELS[asset].en} around ${ANGLE_LABELS[angle].en}.`,
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
