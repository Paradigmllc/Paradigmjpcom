/**
 * Patch all non-JA/EN locale files with new serviceDetail.web and pricingPage keys.
 * Run: node scripts/patch-locale-messages.mjs
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const baseDir = path.resolve(__dirname, "..", "messages")

const webPatch = {
  heroBadgeShort: "Web Dev",
  ctaTitle: "Talk to us about web development",
  ctaHighlight: "Web Dev",
  ctaDesc: "Conversion-focused websites. Free consultation to find your best plan.",
  ctaLabel: "Book a free consultation",
  processEyebrow: "Process",
  processTitle: "How we build",
  process: [
    {
      step: "01",
      title: "Discovery & Scope",
      desc: "We dig into your business goals, audience, and requirements to define a clear project direction.",
    },
    {
      step: "02",
      title: "Design & Architecture",
      desc: "Wireframes → high-fidelity mockups. UI/UX optimisation and content strategy defined.",
    },
    {
      step: "03",
      title: "Build & Implement",
      desc: "Fast, SEO-optimised site built in Next.js or WordPress. CMS integration for easy self-updates.",
    },
    {
      step: "04",
      title: "Launch & Grow",
      desc: "Post-launch analytics, SEO iteration, and ongoing maintenance to maximise long-term results.",
    },
  ],
}

const pricingPatch = {
  faqEyebrow: "FAQ",
  faqTitle: "Frequently asked pricing questions",
  pricingFaqs: [
    {
      q: "Are prices tax-inclusive?",
      a: "All displayed prices include tax. We also support Japan's qualified invoice system.",
    },
    {
      q: "What payment methods do you accept?",
      a: "Bank transfer, credit card (via Stripe), and invoice payment. Web projects: 50% upfront + 50% on delivery. Monthly services: billed end of month, due the following month.",
    },
    {
      q: "Are there any additional costs?",
      a: "No extra fees for items listed in your plan. Significant scope changes outside the original spec will be quoted separately.",
    },
    {
      q: "What is PPP adjustment?",
      a: "PPP (Purchasing Power Parity) adjustment automatically scales prices based on your region's cost of living. Visitors from developing markets see adjusted prices.",
    },
    {
      q: "How much does maintenance cost?",
      a: "Post-launch web maintenance starts at ¥19,800/mo (SSL, monitoring, backups, minor fixes). AI maintenance starts at ¥29,800/mo. MEO/SEO monthly plans include maintenance.",
    },
    {
      q: "Is there a minimum contract term?",
      a: "Web and AI (lump-sum) projects have no minimum term. MEO/SEO monthly plans require a minimum 6-month commitment.",
    },
  ],
}

const locales = ["ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"]
let patched = 0
let skipped = 0

for (const lc of locales) {
  const fp = path.join(baseDir, `${lc}.json`)
  if (!fs.existsSync(fp)) {
    console.log(`SKIP missing: ${fp}`)
    skipped++
    continue
  }

  const raw = fs.readFileSync(fp, "utf8")
  const data = JSON.parse(raw)
  let changed = false

  // Patch serviceDetail.web — only add if keys are missing
  if (data.serviceDetail?.web) {
    const w = data.serviceDetail.web
    for (const [key, val] of Object.entries(webPatch)) {
      if (!(key in w)) {
        w[key] = val
        changed = true
      }
    }
  }

  // Patch pricingPage FAQ — only add if pricingFaqs is missing
  if (data.pricingPage && !data.pricingPage.pricingFaqs) {
    Object.assign(data.pricingPage, pricingPatch)
    changed = true
  }

  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2) + "\n", "utf8")
    patched++
    console.log(`Patched: ${lc} (${fp})`)
  } else {
    console.log(`No change: ${lc}`)
  }
}

console.log(`\nDone. Patched: ${patched}, Skipped: ${skipped}`)
