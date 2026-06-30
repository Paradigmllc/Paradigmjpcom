/**
 * cf-pages-deploy.ts — Cloudflare Pages Direct Upload deployment for
 * AI-generated Astro demo sites. Bypasses git entirely.
 */
import { uploadToR2 } from "./r2-storage"

const CF_API = "https://api.cloudflare.com/client/v4"
const CF_ACCOUNT_ID = "7ff83549f2bdc7bc62c1d64a698aabf1"

export interface DeployResult {
  ok: boolean
  url?: string
  error?: string
}

function cfToken(): string | null {
  const v = process.env.CLOUDFLARE_API_TOKEN
  return v ? v.trim() : null
}

async function cfRequest(path: string, method: string, body?: unknown): Promise<unknown> {
  const token = cfToken()
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN not configured")
  const res = await fetch(`${CF_API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  return res.json()
}

// ── Create Pages project (idempotent) ──

export async function ensureDemoPagesProject(): Promise<string | null> {
  const name = "paradigm-demo-sites"
  try {
    // Try creating
    const r = (await cfRequest(`/accounts/${CF_ACCOUNT_ID}/pages/projects`, "POST", {
      name,
      production_branch: "main",
    })) as { result?: { name: string; subdomain: string }; errors?: Array<{ message: string }> }

    if (r.result) {
      console.info(`[cf-pages] project created: ${r.result.name}`)
      return name
    }
    // Already exists
    if (r.errors?.[0]?.message?.includes("already exists")) {
      return name
    }
    return null
  } catch (e) {
    console.error("[cf-pages] ensure project failed:", e)
    return null
  }
}

// ── Direct Upload: build dist/ → deploy to CF Pages ──

export async function deployDistToPages(
  projectName: string,
  distPath: string,
): Promise<DeployResult> {
  try {
    const fs = await import("fs/promises")
    const path = await import("path")

    // Walk dist/ directory to collect all files
    const files: Array<{ name: string; body: Buffer }> = []
    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
        } else {
          const rel = path.relative(distPath, full).replace(/\\/g, "/")
          files.push({ name: rel, body: await fs.readFile(full) })
        }
      }
    }
    await walk(distPath)

    if (files.length === 0) return { ok: false, error: "dist/ is empty" }

    // Create deployment via Direct Upload
    const manifest: Record<string, string> = {}
    for (const f of files) {
      // Generate SHA256 hash of file content
      const { createHash } = await import("crypto")
      manifest[`/${f.name}`] = createHash("sha256").update(f.body).digest("hex")
    }

    // 1. Start deployment
    const start = (await cfRequest(
      `/accounts/${CF_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
      "POST",
      { manifest },
    )) as { result?: { id: string; url: string } }

    if (!start.result?.id) {
      return { ok: false, error: "Failed to start deployment" }
    }

    const deployId = start.result.id

    // 2. Upload each file
    for (const f of files) {
      // URL-encode the filename for the upload endpoint
      const encodedName = encodeURIComponent(f.name)
      const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${projectName}/deployments/${deployId}/assets/upload`
      
      const formData = new FormData()
      const blob = new Blob([new Uint8Array(f.body)])
      formData.append("file", blob, encodedName)

      // Use fetch with form data
      const token = cfToken()
      await fetch(uploadUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: AbortSignal.timeout(30_000),
      })
    }

    // 3. Mark deployment as ready
    await cfRequest(
      `/accounts/${CF_ACCOUNT_ID}/pages/projects/${projectName}/deployments/${deployId}`,
      "PATCH",
      { status: "active" },
    )

    const deployUrl = start.result.url
    console.info(`[cf-pages] deployed: ${deployUrl}`)
    return { ok: true, url: deployUrl }
  } catch (e) {
    console.error("[cf-pages] deploy failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// ── R2 fallback: upload raw HTML/CSS/JS to R2 ──

export async function deployStaticToR2(
  slug: string,
  html: string,
): Promise<DeployResult> {
  try {
    const htmlKey = `demos/${slug}/index.html`
    const htmlUrl = await uploadToR2(htmlKey, Buffer.from(html, "utf-8"), "text/html; charset=utf-8")
    return { ok: true, url: htmlUrl }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
