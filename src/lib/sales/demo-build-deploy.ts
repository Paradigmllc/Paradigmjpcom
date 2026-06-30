/**
 * demo-build-deploy.ts — End-to-end pipeline:
 * DeepSeek V4 → complete Astro code → astro build → deploy to R2/CF Pages.
 *
 * Called from enrichment Phase 4 to produce a live, deployable demo site.
 */
import { generateAstroCode, type AstroCodeResult } from "./astro-code-generator"
import { deployStaticToR2, deployDistToPages, ensureDemoPagesProject } from "./cf-pages-deploy"
import type { DesignPromptInput } from "./demo-design-prompts"
import { buildDesignInput } from "./demo-design-generator"
import type { SalesCompany } from "./types"

export interface BuildDeployResult {
  ok: boolean
  url?: string
  slug?: string
  error?: string
}

// ── Build step: write generated code as .astro file and run astro build ──

async function buildAstroProject(
  code: string,
  slug: string,
): Promise<{ ok: boolean; distPath?: string; error?: string }> {
  const fs = await import("fs/promises")
  const path = await import("path")
  const os = await import("os")
  const { execSync } = await import("child_process")

  // Create temp project directory
  const tmpDir = path.join(os.tmpdir(), `astro-demo-${slug}-${Date.now()}`)
  const pagesDir = path.join(tmpDir, "src", "pages")
  const componentsDir = path.join(tmpDir, "src", "components", "pipeline")

  try {
    await fs.mkdir(pagesDir, { recursive: true })
    await fs.mkdir(componentsDir, { recursive: true })

    // Copy component library
    const compSrc = path.join(process.cwd(), "astro-demo", "src", "components", "pipeline")
    const compFiles = await fs.readdir(compSrc)
    for (const f of compFiles) {
      if (f.endsWith(".astro")) {
        await fs.copyFile(path.join(compSrc, f), path.join(componentsDir, f))
      }
    }

    // Write generated code as index.astro
    await fs.writeFile(path.join(pagesDir, "index.astro"), code, "utf-8")

    // Write package.json
    const pkg = {
      name: `demo-${slug}`,
      type: "module",
      scripts: { build: "astro build" },
      dependencies: { astro: "^4.16.0", "@astrojs/node": "^8.3.0" },
    }
    await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify(pkg, null, 2))

    // Write astro.config.mjs
    const config = `import { defineConfig } from "astro/config"
export default defineConfig({ output: "static" })`
    await fs.writeFile(path.join(tmpDir, "astro.config.mjs"), config)

    // Install deps and build
    try {
      execSync("npm install --prefer-offline --no-audit --no-fund", {
        cwd: tmpDir, timeout: 120_000, stdio: "pipe",
      })
      execSync("npx astro build", {
        cwd: tmpDir, timeout: 60_000, stdio: "pipe",
      })
    } catch {
      return { ok: false, error: "astro build failed" }
    }

    const distPath = path.join(tmpDir, "dist")
    try {
      await fs.access(distPath)
    } catch {
      return { ok: false, error: "dist/ not found after build" }
    }

    return { ok: true, distPath }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── Main pipeline ──

export async function buildAndDeployDemo(
  company: SalesCompany,
): Promise<BuildDeployResult> {
  const locale = (company.report_locale || "ja") as "ja" | "en"
  const slug = `${(company.domain || company.id).replace(/[^a-zA-Z0-9.-]+/g, "-").slice(0, 40)}-demo`

  // Build input for DeepSeek
  const diag = {
    pain_summary: company.pain_diagnosis ?? {},
    detected_issues: company.detected_issues ?? [],
    pagespeed_mobile: company.pagespeed_mobile ?? null,
    pagespeed_desktop: company.pagespeed_desktop ?? null,
    tech_stack: company.tech_stack ?? {},
    improvement_actions: [],
  } as Record<string, unknown>

  const websiteAssets = company.meta?.website_assets as Record<string, unknown> | undefined

  const input = buildDesignInput({
    company_name: company.company_name,
    domain: company.domain,
    industry: company.industry ?? null,
    location: company.prefecture ?? null,
    locale,
    website_assets: websiteAssets ?? null,
    diagnosis: diag,
  })

  if (!input) return { ok: false, error: "insufficient company data", slug }

  // Step 1: Generate Astro code via DeepSeek V4
  console.info(`[demo-build-deploy] generating code for ${company.company_name}`)
  const codeResult = await generateAstroCode(input)
  if (!codeResult.ok || !codeResult.code) {
    return { ok: false, error: codeResult.error ?? "code generation failed", slug }
  }

  // Step 2: Deploy to R2 (fast path — skip astro build for now, deploy HTML directly)
  // For full SSG: call buildAstroProject(codeResult.code, slug) then deployDistToPages()
  
  // R2 direct: embed generated code in a simple HTML wrapper
  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="robots" content="noindex,nofollow"/>
<title>${company.company_name}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,"Noto Sans JP",system-ui,sans-serif;line-height:1.7;-webkit-font-smoothing:antialiased}
main{padding:2rem;max-width:800px;margin:0 auto}
h1{font-size:2rem;margin-bottom:1rem}
p{margin-bottom:1rem;opacity:0.8}
.generated-at{font-size:0.8rem;opacity:0.4;margin-top:2rem}
</style>
</head>
<body>
<main>
${codeResult.code
  .replace(/---[\s\S]*?---/, "") // strip frontmatter
  .replace(/import\s+.*?from\s+['"].*?['"]\s*;?\n?/g, "") // strip imports
  .replace(/<(HeroSection|ProofStrip|ServiceCards|TestimonialCards|PricingTable|FAQAccordion|CTABanner|ContactForm|PageLayout)[^>]*\/>/g, "<div>[$1 component]</div>")
  .replace(/<(HeroSection|ProofStrip|ServiceCards|TestimonialCards|PricingTable|FAQAccordion|CTABanner|ContactForm|PageLayout)[^>]*>/g, "<div>")
  .replace(/<\/(HeroSection|ProofStrip|ServiceCards|TestimonialCards|PricingTable|FAQAccordion|CTABanner|ContactForm|PageLayout)>/g, "</div>")
  .replace(/<slot\s*\/>/g, "")
  .slice(0, 30000)
}
<p class="generated-at">Generated ${new Date().toISOString()} by DeepSeek V4</p>
</main>
</body>
</html>`

  const r2Result = await deployStaticToR2(slug, html)
  if (!r2Result.ok || !r2Result.url) {
    return { ok: false, error: r2Result.error ?? "R2 deploy failed", slug }
  }

  return { ok: true, url: r2Result.url, slug }
}
