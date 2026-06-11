/**
 * cf-pages-deploy.ts — Cloudflare Pages auto-deploy for Astro demo sites.
 *
 * Pipeline:
 *   DiagnosticReport → Keystatic demo content → Cloudflare Pages deploy → demo URL
 *
 * When Sales OS enriches a company, this module:
 *  1. Generates Keystatic-compatible demo data from the diagnostic report
 *  2. Triggers a Cloudflare Pages deployment
 *  3. Returns the deployed demo URL
 */
import type { DiagnosticReportData } from "./diagnostic"
import type { SalesCompany } from "./types"
import { themeForIndustry } from "./render-quality"
import { envValue } from "./oss-service-health"
import { getServiceSalesSupabase } from "@/lib/supabase"
import { DB_TABLES } from "@/lib/sales/db-tables"

const CF_ACCOUNT_ID = "7ff83549f2bdc7bc62c1d64a698aabf1"
const CF_PAGES_PROJECT = "paradigm-astro-demo"
const GITHUB_REPO = "Paradigmllc/Paradigmjpcom"
const GITHUB_BRANCH = "main"

function cfToken(): string | null {
  return process.env.CLOUDFLARE_API_TOKEN ?? null
}

function githubToken(): string | null {
  return process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null
}

function cfHeaders(): Record<string, string> {
  const token = cfToken()
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN is not configured")
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

/** Build Keystatic-compatible frontmatter from a diagnostic report */
export function buildDemoFrontmatter(
  company: SalesCompany,
  report: DiagnosticReportData,
): string {
  const theme = themeForIndustry(report.industry)
  const services = report.acts.slice(0, 4).map((act) => ({
    title: act.headline?.slice(0, 40) ?? "サービス",
    description: act.body?.slice(0, 80) ?? "",
    icon: "Globe",
  }))

  const metrics = [
    { label: "改善余地", value: String(report.source_coverage.score), suffix: "点" },
    { label: "検出課題", value: String(report.acts.length), suffix: "件" },
    { label: "推定損失", value: report.total_loss?.replace(/[^0-9]/g, "")?.slice(0, 6) ?? "0", suffix: "円/月" },
  ]

  const lines = [
    "---",
    `title: ${company.slug ?? company.id}-demo`,
    `customerName: "${company.company_name}"`,
    `companyId: "${company.id}"`,
    `domain: "${company.domain ?? ""}"`,
    `industry: "${report.industry ?? "consulting"}"`,
    `accentColor: "${theme.accent ?? "#7c3aed"}"`,
    `accentColorDark: "${theme.accentDark ?? "#5b21b6"}"`,
    `status: ready`,
    `heroHeadline: "${report.hook ?? `${company.company_name}のWebサイト改善提案`}"`,
    `heroSubtitle: "データ診断に基づくパーソナライズド改善プラン"`,
    `serviceTitle: "改善提案`,
    "services:",
    ...services.map((s) => `  - title: "${s.title}"\n    description: "${s.description}"\n    icon: ${s.icon}`),
    `caseTitle: "診断サマリ"`,
    `caseDescription: "公開データから検出した${report.acts.length}件の改善ポイント"`,
    "caseMetrics:",
    ...metrics.map((m) => `  - label: ${m.label}\n    value: "${m.value}"\n    suffix: ${m.suffix}`),
    `ctaTitle: "まずは無料相談"`,
    `ctaBody: "15分のオンライン診断で改善余地を可視化します"`,
    `calBookingUrl: "https://cal.com/paradigm-jp/15min"`,
    "---",
    `${company.company_name}向け自動生成デモサイト。診断レポートID: ${report.report_url ?? "N/A"}`,
  ]

  return lines.join("\n")
}

/** Check if Cloudflare Pages deploy is configured */
export function isCfPagesConfigured(): boolean {
  return cfToken() !== null
}

/** Commit a file to GitHub via API (auto-triggers Cloudflare Pages rebuild) */
async function commitToGitHub(
  path: string,
  content: string,
  message: string,
): Promise<boolean> {
  const token = githubToken()
  if (!token) {
    console.warn("[cf-pages-deploy] GITHUB_TOKEN not set, skipping git commit")
    return false
  }
  try {
    // Check if file exists to get SHA (needed for update)
    let sha: string | null = null
    try {
      const getRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          signal: AbortSignal.timeout(15_000),
        },
      )
      if (getRes.ok) {
        const getData = await getRes.json() as { sha?: string }
        sha = getData.sha ?? null
      }
    } catch {
      // File doesn't exist yet — that's fine for create
    }

    const body: Record<string, string> = {
      message,
      content: Buffer.from(content).toString("base64"),
      branch: GITHUB_BRANCH,
    }
    if (sha) body.sha = sha

    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      },
    )
    if (putRes.ok) {
      console.warn("[cf-pages-deploy] committed to GitHub:", path)
      return true
    }
    const errData = await putRes.json().catch(() => ({})) as { message?: string }
    console.error("[cf-pages-deploy] GitHub commit failed:", errData.message ?? putRes.status)
    return false
  } catch (error) {
    console.error("[cf-pages-deploy] GitHub commit error:", error)
    return false
  }
}

/** Get the base URL for a company-specific Cloudflare Pages project */
function getCfPagesBaseUrlForSlug(slug: string): string {
  return `https://${slug}.pages.dev`
}

/** Build the full demo URL for a given slug — clean companyname.pages.dev */
export function getCfPagesDemoUrl(slug: string): string {
  return getCfPagesBaseUrlForSlug(slug)
}

/** Create a dedicated CF Pages project for a company (idempotent — returns existing if present) */
async function ensureCfPagesProject(slug: string, githubRepo: string, githubBranch: string): Promise<{ ok: boolean; projectName: string; error?: string }> {
  const token = cfToken()
  if (!token) return { ok: false, projectName: slug, error: "CLOUDFLARE_API_TOKEN not configured" }

  const projectName = slug.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-|-$/g, "").toLowerCase()

  try {
    // Check if project already exists
    const getRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${encodeURIComponent(projectName)}`,
      { headers: cfHeaders(), signal: AbortSignal.timeout(10_000) }
    )
    if (getRes.ok) {
      const getData = await getRes.json() as { success?: boolean; result?: { name: string } }
      if (getData.success && getData.result) {
        console.warn("[cf-pages-deploy] project exists:", projectName)
        return { ok: true, projectName }
      }
    }

    // Create new project
    const createRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects`,
      {
        method: "POST",
        headers: cfHeaders(),
        body: JSON.stringify({
          name: projectName,
          production_branch: githubBranch,
        }),
        signal: AbortSignal.timeout(15_000),
      }
    )
    const createData = await createRes.json() as { success?: boolean; result?: { name: string }; errors?: Array<{ message: string }> }

    if (!createRes.ok || !createData.success) {
      const errMsg = createData.errors?.[0]?.message ?? `HTTP ${createRes.status}`
      console.error("[cf-pages-deploy] project create failed:", errMsg)
      return { ok: false, projectName, error: errMsg }
    }

    // Set up GitHub integration for auto-deploy
    try {
      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${encodeURIComponent(projectName)}`,
        {
          method: "PATCH",
          headers: cfHeaders(),
          body: JSON.stringify({
            deployment_configs: {
              production: {
                env_vars: {
                  SUPABASE_URL: { value: process.env.NEXT_PUBLIC_SUPABASE_URL || "" },
                  SUPABASE_ANON_KEY: { value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
                },
              },
            },
          }),
          signal: AbortSignal.timeout(10_000),
        }
      )
    } catch (e) {
      console.warn("[cf-pages-deploy] env vars setup failed (non-fatal):", e)
    }

    console.warn("[cf-pages-deploy] created new project:", projectName)
    return { ok: true, projectName }
  } catch (e) {
    console.error("[cf-pages-deploy] ensureProject failed:", e)
    return { ok: false, projectName, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Trigger a Cloudflare Pages deployment (rebuilds the entire project) */
export async function triggerCfPagesDeploy(): Promise<{
  ok: boolean
  deploymentId?: string
  url?: string
  error?: string
}> {
  if (!isCfPagesConfigured()) {
    return { ok: false, error: "CLOUDFLARE_API_TOKEN is not configured" }
  }

  try {
    const headers = cfHeaders()

    // Create a deployment
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PAGES_PROJECT}/deployments`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ branch: "main" }),
        signal: AbortSignal.timeout(30_000),
      },
    )

    const data = (await res.json()) as {
      success?: boolean
      result?: { id?: string; url?: string }
      errors?: Array<{ message: string }>
    }

    if (!res.ok || !data.success) {
      const errMsg = data.errors?.[0]?.message ?? `HTTP ${res.status}`
      console.error("[cf-pages-deploy] deployment trigger failed:", errMsg)
      return { ok: false, error: errMsg }
    }

    console.warn("[cf-pages-deploy] deployment triggered:", data.result?.id?.slice(0, 12))
    return {
      ok: true,
      deploymentId: data.result?.id,
      url: data.result?.url,
    }
  } catch (error) {
    console.error("[cf-pages-deploy] deployment trigger error:", error)
    return { ok: false, error: String(error) }
  }
}

/** Trigger a deployment on a specific CF Pages project by name */
async function triggerCfPagesDeployForProject(projectName: string): Promise<{ ok: boolean; error?: string }> {
  if (!isCfPagesConfigured()) return { ok: false, error: "CLOUDFLARE_API_TOKEN is not configured" }
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${encodeURIComponent(projectName)}/deployments`,
      { method: "POST", headers: cfHeaders(), body: JSON.stringify({ branch: GITHUB_BRANCH }), signal: AbortSignal.timeout(30_000) }
    )
    const data = await res.json() as { success?: boolean; errors?: Array<{ message: string }> }
    if (!res.ok || !data.success) {
      return { ok: false, error: data.errors?.[0]?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/**
 * Generate demo content + trigger Cloudflare Pages deploy.
 * Returns the demo URL once the content has been saved to Keystatic.
 *
 * Note: The actual deploy is async (Cloudflare Pages build takes ~30s).
 * The demo URL becomes available once the deploy completes.
 */
export async function deployDemoToCfPages(
  company: SalesCompany,
  report: DiagnosticReportData,
): Promise<{
  ok: boolean
  demoUrl?: string
  error?: string
}> {
  // Clean slug from domain: "tokyo-sushi.example.com" → "tokyo-sushi"
  const rawSlug = (company.domain || company.slug || company.id)
    .replace(/^https?:\/\//, "")
    .replace(/\.[^.]+$/, "")  // remove TLD
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 50)
  const slug = rawSlug || `company-${company.id?.slice(0, 8)}`
  const demoUrl = getCfPagesDemoUrl(slug)

  if (!isCfPagesConfigured()) {
    return { ok: false, error: "CLOUDFLARE_API_TOKEN is not configured" }
  }

  try {
    // 1. Generate Keystatic content
    const frontmatter = buildDemoFrontmatter(company, report)

    // 2. Commit to GitHub (stores .mdoc content in repo)
    const contentPath = `content/keystatic/demo-sites/${slug}.mdoc`
    const commitMsg = `demo: add ${company.company_name} Astro demo [skip ci]`
    const committed = await commitToGitHub(contentPath, frontmatter, commitMsg)

    // 3. Ensure CF Pages project exists (companyname.pages.dev)
    const project = await ensureCfPagesProject(slug, GITHUB_REPO, GITHUB_BRANCH)
    if (!project.ok) {
      console.error("[cf-pages-deploy] project ensure failed:", project.error)
    } else {
      // Trigger deploy on the dedicated project
      const deploy = await triggerCfPagesDeployForProject(project.projectName)
      if (!deploy.ok) {
        console.error("[cf-pages-deploy] deploy trigger failed:", deploy.error)
      } else {
        console.warn("[cf-pages-deploy] demo deploying to:", demoUrl)
      }
    }

    // 3. Save to Supabase web_demos table as backup
    try {
      const sb = getServiceSalesSupabase()
      if (sb) {
        await sb.from(DB_TABLES.WEB_DEMOS).upsert({
          slug,
          name: `${company.company_name} Demo`,
          html_content: frontmatter,
          source: "sales_enrichment_cf_pages",
          is_published: true,
          meta: {
            generator: "cf-pages-deploy",
            company_id: company.id,
            committed_to_github: committed,
            generated_at: new Date().toISOString(),
          },
        }, { onConflict: "slug" })
      }
    } catch (dbErr) {
      console.error("[cf-pages-deploy] Supabase save failed:", dbErr)
    }

    // 4. Write demo_site url back to sales_companies so reports show it
    try {
      const sb = getServiceSalesSupabase()
      if (sb) {
        const existing = await sb.from(DB_TABLES.SALES_COMPANIES).select("meta").eq("id", company.id).maybeSingle()
        const currentMeta = (existing?.data as { meta?: Record<string, unknown> } | null)?.meta ?? {}
        await sb.from(DB_TABLES.SALES_COMPANIES).update({
          meta: {
            ...(currentMeta as Record<string, unknown>),
            demo_site: {
              url: demoUrl,
              type: "astro_cf_pages",
              slug,
              committed_to_github: committed,
              generated_at: new Date().toISOString(),
            },
          },
        }).eq("id", company.id)
      }
    } catch (metaErr) {
      console.error("[cf-pages-deploy] meta update failed:", metaErr)
    }

    // 5. Trigger Cloudflare Pages rebuild (redundant if GitHub commit worked, but safe)
    if (!committed) {
      const deploy = await triggerCfPagesDeploy()
      if (!deploy.ok) {
        console.error("[cf-pages-deploy] CF Pages trigger failed:", deploy.error)
      }
    } else {
      console.warn("[cf-pages-deploy] GitHub commit will auto-trigger CF Pages build, URL:", demoUrl)
    }

    return {
      ok: true,
      demoUrl,
    }
  } catch (error) {
    console.error("[cf-pages-deploy] failed:", error)
    return { ok: false, error: String(error) }
  }
}
