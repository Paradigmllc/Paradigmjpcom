/**
 * demo-build-deploy.ts — End-to-end pipeline:
 * DeepSeek V4 → multi-page Astro code → astro build → deploy.
 *
 * Called from enrichment Phase 4 to produce a live, deployable demo site.
 */
import { generateMultiPageSite, buildAstroPages } from "./multi-page-generator"
import { deployStaticToR2 } from "./cf-pages-deploy"
import type { SalesCompany } from "./types"

export interface BuildDeployResult {
  ok: boolean
  url?: string
  slug?: string
  error?: string
}

// ── Build step: write generated code as .astro files and run astro build ──

async function buildAstroProject(
  files: Map<string, string>,
  slug: string,
): Promise<{ ok: boolean; distPath?: string; error?: string }> {
  const fs = await import("fs/promises")
  const path = await import("path")
  const os = await import("os")
  const { execSync } = await import("child_process")

  const tmpDir = path.join(os.tmpdir(), `astro-demo-${slug}-${Date.now()}`)
  const pagesDir = path.join(tmpDir, "src", "pages")
  const componentsDir = path.join(tmpDir, "src", "components", "pipeline")

  try {
    await fs.mkdir(pagesDir, { recursive: true })
    await fs.mkdir(componentsDir, { recursive: true })

    const compSrc = path.join(process.cwd(), "astro-demo", "src", "components", "pipeline")
    const compFiles = await fs.readdir(compSrc)
    for (const f of compFiles) {
      if (f.endsWith(".astro")) {
        await fs.copyFile(path.join(compSrc, f), path.join(componentsDir, f))
      }
    }

    for (const [name, code] of files) {
      await fs.writeFile(path.join(pagesDir, name), code, "utf-8")
    }

    const pkg = {
      name: `demo-${slug}`, type: "module",
      scripts: { build: "astro build" },
      dependencies: { astro: "^4.16.0", "@astrojs/node": "^8.3.0" },
    }
    await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify(pkg, null, 2))
    await fs.writeFile(path.join(tmpDir, "astro.config.mjs"),
      `import { defineConfig } from "astro/config"\nexport default defineConfig({ output: "static" })`)

    execSync("npm install --prefer-offline --no-audit --no-fund", {
      cwd: tmpDir, timeout: 120_000, stdio: "pipe",
    })
    execSync("npx astro build", {
      cwd: tmpDir, timeout: 60_000, stdio: "pipe",
    })

    const distPath = path.join(tmpDir, "dist")
    await fs.access(distPath)
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

  const diag = {
    pain_summary: company.pain_diagnosis ?? {},
    issues: company.detected_issues ?? [],
    pagespeed_mobile: company.pagespeed_mobile ?? null,
    pagespeed_desktop: company.pagespeed_desktop ?? null,
    tech_stack: company.tech_stack ?? {},
    improvements: [],
  } as Record<string, unknown>

  const websiteAssets = company.meta?.website_assets as Record<string, unknown> | undefined
  const content = websiteAssets?.content as Record<string, unknown> | undefined
  const images = websiteAssets?.images as Record<string, unknown> | undefined
  const galleryImages = Array.isArray(images?.gallery)
    ? (images.gallery as Array<{ url: string }>).map((g: { url: string }) => g.url)
    : []

  console.info(`[demo-build-deploy] generating multi-page site for ${company.company_name}`)
  
  const result = await generateMultiPageSite({
    companyName: company.company_name,
    domain: company.domain,
    industry: company.industry ?? null,
    location: company.prefecture ?? null,
    locale,
    diagnosis: {
      pain_summary: String(diag.pain_summary ?? ""),
      issues: Array.isArray(diag.issues) ? diag.issues.map(String) : [],
      pagespeed_mobile: typeof diag.pagespeed_mobile === "number" ? diag.pagespeed_mobile : null,
      pagespeed_desktop: typeof diag.pagespeed_desktop === "number" ? diag.pagespeed_desktop : null,
      tech_stack: Array.isArray(diag.tech_stack) ? diag.tech_stack.map(String) : [],
      improvements: [],
    },
    realContent: {
      about: typeof content?.about === "string" ? content.about : undefined,
      services: typeof content?.services === "string" ? content.services : undefined,
      testimonials: typeof content?.testimonials === "string" ? content.testimonials : undefined,
    },
    availableImages: galleryImages,
  })

  if (!result.ok || !result.manifest) {
    return { ok: false, error: result.error ?? "generation failed", slug }
  }

  const files = buildAstroPages(result.manifest)
  console.info(`[demo-build-deploy] generated ${files.size} pages for ${company.company_name}`)

  // Build and get dist path
  const buildResult = await buildAstroProject(files, slug)
  if (!buildResult.ok || !buildResult.distPath) {
    console.error(`[demo-build-deploy] build failed: ${buildResult.error}`)
    // Fallback: deploy HTML wrapper
    const html = `<!doctype html><html><head><meta charset="UTF-8"/><title>${company.company_name}</title></head><body><h1>${company.company_name}</h1><p>Demo generated.</p></body></html>`
    const r2Result = await deployStaticToR2(slug, html)
    return { ok: !!r2Result.ok, url: r2Result.url, slug }
  }

  // Upload dist to R2
  const fsp = await import("fs")
  const path2 = await import("path")
  const allFiles: string[] = []
  function walk(dir: string) {
    for (const entry of fsp.readdirSync(dir, { withFileTypes: true })) {
      const full = path2.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else allFiles.push(full)
    }
  }
  walk(buildResult.distPath)

  for (const fullPath of allFiles) {
    const key = `demos/${slug}/${path2.relative(buildResult.distPath, fullPath)}`
    try {
      const body = fsp.readFileSync(fullPath)
      await deployStaticToR2(key, body.toString("utf-8"))
    } catch {
      // non-fatal
    }
  }

  const url = `https://demo.paradigmjp.com/demos/${slug}/index.html`
  return { ok: true, url, slug }
}
