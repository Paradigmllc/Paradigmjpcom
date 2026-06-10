#!/usr/bin/env node
/**
 * scripts/seed-global-templates.mjs  ESprint 16 グローバル牁E56 templates (en) 投�E
 *
 * 役割: 8 industries ÁE7 issues = 56 templates の英語�Eース seed.
 *       既孁Ejp 版と同じ 5-stage frame (despair→hope) めEencode・英語で書ぁE
 *       Supabase + Notion グローバル牁E4 DB に同時投�E.
 */

import { createClient } from "@supabase/supabase-js"

const NOTION_API_KEY = process.env.NOTION_API_KEY
if (!NOTION_API_KEY) {
  console.error('NOTION_API_KEY env var must be set')
  process.exit(1)
}
const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://yihdmgtxiqfdgdueolub.supabase.co"
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const NOTION_DB_TEMPLATES_GLOBAL =
  process.env.NOTION_DB_TEMPLATES_GLOBAL ?? "35fa2b78-f3fc-817f-8e05-ca06234adac4"

if (!SUPABASE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY env required")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

/* ───── industry context (en) ───── */
const INDUSTRY = {
  beauty_salon: { label: "Hair Salon", customer: "salon clients", booking: "via Google Maps", avg: 80 },
  dental: { label: "Dental Clinic", customer: "new patients", booking: "via web booking", avg: 120 },
  restaurant: { label: "Restaurant", customer: "diners", booking: "via Google Maps", avg: 45 },
  construction: { label: "Construction", customer: "homeowners considering remodels", booking: "via web quote", avg: 8000 },
  accounting: { label: "Accounting Firm", customer: "business owners seeking advisors", booking: "via web consultation", avg: 3600 },
  retail: { label: "Retail Store", customer: "shoppers", booking: "via Google Maps & Instagram", avg: 60 },
  cleaning: { label: "Cleaning Service", customer: "homeowners requesting quotes", booking: "via online quote", avg: 280 },
  consulting: { label: "Consulting", customer: "decision-makers with business challenges", booking: "via LinkedIn/web", avg: 12000 },
}

const ISSUE = {
  speed_critical: { severity: "critical", bounce: 60, fix: 800, cta: "Speed audit (free)" },
  ua_残孁E { severity: "critical", bounce: 0, fix: 500, cta: "GA4 + Cookie consent setup" },
  ssl_expired: { severity: "critical", bounce: 85, fix: 300, cta: "SSL renewal + Cloudflare integration" },
  wp_outdated: { severity: "critical", bounce: 0, fix: 600, cta: "Emergency WP update + backup" },
  no_ogp: { severity: "warning", bounce: 70, fix: 250, cta: "OGP + Twitter Card optimization" },
  no_sns: { severity: "info", bounce: 0, fix: 400, cta: "SNS integration + review funnel" },
  copyright_old: { severity: "warning", bounce: 35, fix: 150, cta: "Site freshness audit package" },
}

function generate(industryCode, issueCode) {
  const ind = INDUSTRY[industryCode]
  const iss = ISSUE[issueCode]

  const headlineMap = {
    speed_critical: `${iss.bounce}% of your visitors leave before seeing your content`,
    ua_残孁E `You haven't been able to see who visits your site (since GA4 migration deadline)`,
    ssl_expired: `Chrome and Safari are showing "dangerous site" warnings on your URL`,
    wp_outdated: `Your ${ind.label} site is running outdated WordPress  Eknown vulnerabilities`,
    no_ogp: `Your links appear as blank rectangles when shared on social media`,
    no_sns: `60%+ of ${ind.customer} search ${ind.booking}. You have zero SNS integration.`,
    copyright_old: `"Is this business still operating?"  Eyour visitors are asking`,
  }

  const painMap = {
    speed_critical: `PageSpeed Insights mobile score is below 50. Visitors feel friction and bounce to competitors. Industry standard is 80+.`,
    ua_残孁E `Analytics broken for 2+ years. Where visitors come from, what they see, where they drop off  Ecompletely opaque. Ad spend ROI cannot be measured.`,
    ssl_expired: `https:// is broken. Visitors bounce before reaching the booking form. Browser warnings trigger.`,
    wp_outdated: `Known vulnerabilities in older WordPress versions. ${ind.label} sites handle names, phones, and bookings  Eliability for breach is significant.`,
    no_ogp: `Even when ${ind.customer} share your site organically, click-through rate drops to 1/4 of normal. Free social marketing wasted.`,
    no_sns: `Without SNS funnel, ${ind.customer} researching options go to competitors. No review acquisition mechanism.`,
    copyright_old: `Outdated copyright year signals "abandoned business" to visitors. Trust score plummets.`,
  }

  const fearMap = {
    speed_critical: `Google's Core Web Vitals are an official ranking factor since 2024. Slow sites continue to lose rankings; in 3 months your acquisition channel may disappear entirely.`,
    ua_残孁E `Without data, monthly ad spend is "may or may not be working" black-box money. Privacy regulations also apply (GDPR / Cookie consent).`,
    ssl_expired: `From 2026, search engines will start excluding non-SSL sites from results. Without action, you'll be off Google in 6 months.`,
    wp_outdated: `Vulnerability databases are public. Attackers run automated scans nightly. Tampering and data breaches are a matter of time. Legal cost: tens of thousands USD+.`,
    no_ogp: `Competitors with OGP setup acquire new ${ind.customer} monthly from social shares. You're giving away that channel. The gap compounds yearly.`,
    no_sns: `Review and photo sharing on ${ind.booking} is industry-standard. Without SNS integration, your acquisition cost is 2-3x competitors and rising.`,
    copyright_old: `"Is this business open?" questions kill inquiries before they start. Lost inquiries don't return.`,
  }

  const monthlyVisitors = 1200
  const lostVisitors = Math.round((monthlyVisitors * (iss.bounce || 30)) / 100)
  const monthlyLoss = Math.round(lostVisitors * ind.avg * 0.02)
  const annualLoss = Math.round((monthlyLoss * 12) / 1000)

  const lossMap = {
    speed_critical: `Mobile bounce ${iss.bounce}% ÁE1,200 monthly visitors ÁE$${ind.avg} avg ticket ÁE2% CVR = ~$${monthlyLoss.toLocaleString()}/month (~$${annualLoss}K/year) opportunity loss`,
    ua_残孁E `Without measurable ROI, $2K/month ad spend assumption = $24K/year of black-box expense. Estimated $${annualLoss || 50}K/year improvement opportunity remains untapped.`,
    ssl_expired: `Warning-driven bounce ${iss.bounce}% ÁE1,200 visitors = ~1,020/month lost. At $${ind.avg} ticket ÁE2% CVR ↁE$${annualLoss || 100}K+/year loss.`,
    wp_outdated: `Breach legal cost: $300+ per record ÁE${ind.label} customer DB of ~1,000 records = $300K liability. Probability ~8%/year for outdated versions.`,
    no_ogp: `Social share rate 5% ÁE1,200 visitors ÁE1/4 CTR loss = ~45 new entries/month lost. Annually: 540 entries ÁE2% CVR ÁE$${ind.avg} = $${Math.round((540 * 0.02 * ind.avg) / 1000)}K/year.`,
    no_sns: `${ind.label} industry: 30-40% of new clients come via SNS. Lost monthly opportunity: ~$${Math.round(annualLoss / 12 || 8)}K. Annually: $${annualLoss || 100}K-scale.`,
    copyright_old: `"Abandoned business" suspicion costs ~1/3 of new inquiries. ${ind.label} business depends on trust.`,
  }

  const ctaMap = {
    speed_critical: `${iss.cta}  EParadigm gets your PageSpeed to 80+ in 14 days. From $${iss.fix}.`,
    ua_残孁E `${iss.cta}  EGA4 + Cookie consent banner + data restoration. From $${iss.fix}.`,
    ssl_expired: `${iss.cta}  ESSL re-issue + server infrastructure review. From $${iss.fix}.`,
    wp_outdated: `${iss.cta}  EEmergency update + automated backups + WAF. From $${iss.fix}.`,
    no_ogp: `${iss.cta}  EOGP image generator + Twitter Card + LINE share. From $${iss.fix}.`,
    no_sns: `${iss.cta}  EInstagram + Google Business Profile integration + review automation. From $${iss.fix}.`,
    copyright_old: `${iss.cta}  EAutomatic copyright update + site-wide freshness audit. From $${iss.fix}.`,
  }

  return {
    template_name: `${ind.label}_${issueCode}_global`,
    region: "global",
    industry: industryCode,
    issue_code: issueCode,
    severity: iss.severity,
    headline: headlineMap[issueCode],
    pain: painMap[issueCode],
    fear: fearMap[issueCode],
    loss: lossMap[issueCode],
    cta_text: ctaMap[issueCode],
    is_active: true,
  }
}

let lastNotion = 0
async function notionPost(path, body) {
  const now = Date.now()
  if (now - lastNotion < 350) await new Promise((r) => setTimeout(r, 350 - (now - lastNotion)))
  lastNotion = Date.now()
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) return { ok: false, error: data.message }
  return { ok: true, data }
}

async function main() {
  const industries = Object.keys(INDUSTRY)
  const issues = Object.keys(ISSUE)
  const all = []
  for (const ind of industries) {
    for (const iss of issues) {
      all.push(generate(ind, iss))
    }
  }
  console.log(`Generated ${all.length} global templates`)

  // Clear existing global region templates
  const { error: delErr } = await sb
    .from("sales_templates")
    .delete()
    .eq("region", "global")
  if (delErr) console.warn("DELETE warning:", delErr.message)

  // Bulk insert
  const { data, error } = await sb.from("sales_templates").insert(all).select("id, template_name")
  if (error) {
    console.error("INSERT failed:", error.message)
    process.exit(1)
  }
  console.log(`✁ESupabase: ${data.length} global templates inserted`)

  // Notion side: investment for visibility
  console.log("📝 Notion Templates (Global) DB に同期中...")
  let notionCreated = 0
  for (const t of all) {
    const r = await notionPost("/pages", {
      parent: { database_id: NOTION_DB_TEMPLATES_GLOBAL },
      properties: {
        "チE��プレ吁E: { title: [{ text: { content: t.template_name } }] },
        "業種": { select: { name: t.industry } },
        "課題コーチE: { select: { name: t.issue_code } },
        "重要度": { select: { name: t.severity } },
        "headline": { rich_text: [{ text: { content: t.headline.slice(0, 2000) } }] },
        "pain": { rich_text: [{ text: { content: t.pain.slice(0, 2000) } }] },
        "fear": { rich_text: [{ text: { content: t.fear.slice(0, 2000) } }] },
        "loss": { rich_text: [{ text: { content: t.loss.slice(0, 2000) } }] },
        "cta_text": { rich_text: [{ text: { content: t.cta_text.slice(0, 2000) } }] },
        "有効": { checkbox: true },
      },
    })
    if (r.ok) {
      notionCreated++
      // Supabase 側に notion_page_id を書戻
      await sb
        .from("sales_templates")
        .update({ notion_page_id: r.data.id })
        .eq("template_name", t.template_name)
        .eq("region", "global")
    }
  }
  console.log(`✁ENotion: ${notionCreated} global templates created`)
  console.log(`\nNext: /api/sales/sync-templates-from-notion で 5min ごとに自勁Esync`)
}

main().catch((e) => {
  console.error("FATAL:", e.message)
  process.exit(1)
})
