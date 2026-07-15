import { readProductionEnvValue } from "./lib/coolify-env.mjs"

type Snapshot = {
  listingUrl: string
  companyName: string
  category: string
  description: string
  address?: string | null
  phone?: string | null
  websiteUrl?: string | null
  socialLinks?: string[]
  images: Array<{ url: string; alt: string }>
}

async function readStdin(): Promise<string> {
  const chunks: string[] = []
  for await (const chunk of process.stdin) chunks.push(String(chunk))
  return chunks.join("")
}

async function loadProductionEnv(): Promise<void> {
  const names = [
    "SALES_SUPABASE_URL",
    "SALES_SUPABASE_SERVICE_ROLE_KEY",
    "TWENTY_API_URL",
    "TWENTY_API_KEY",
    "TRIGGER_WEBHOOK_SECRET",
    "NEXT_PUBLIC_SITE_URL",
  ] as const
  for (const name of names) {
    const value = await readProductionEnvValue(name)
    if (value) process.env[name] = value
  }
  process.env.SALES_SUPABASE_PRIMARY = "true"
}

async function main(): Promise<void> {
  const parsed = JSON.parse(await readStdin()) as { snapshots?: Snapshot[] }
  const snapshots = Array.isArray(parsed.snapshots) ? parsed.snapshots : []
  if (snapshots.length === 0) throw new Error("snapshots are required")
  if (snapshots.length > 100) throw new Error("batch is limited to 100 snapshots")
  await loadProductionEnv()
  const secret = process.env.TRIGGER_WEBHOOK_SECRET?.trim()
  const origin = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://paradigmjp.com").replace(/\/+$/u, "")
  if (!secret) throw new Error("TRIGGER_WEBHOOK_SECRET is not configured")
  const apiHeaders = { "content-type": "application/json", "x-webhook-secret": secret }
  const importResponse = await fetch(`${origin}/api/sales/demo-site/portal-candidates`, {
    method: "POST",
    headers: apiHeaders,
    body: JSON.stringify({ source: "ekiten", operatorConfirmed: true, snapshots }),
  })
  const importResult = await importResponse.json() as { imported?: number; failed?: number; ok?: boolean; error?: string }
  if (!importResponse.ok) throw new Error(importResult.error ?? `portal import failed (${importResponse.status})`)
  const listingUrls = new Set(snapshots.map((snapshot) => snapshot.listingUrl))
  const candidates: Array<Record<string, unknown>> = []
  for (let offset = 0; ; offset += 100) {
    const response = await fetch(`${origin}/api/sales/demo-site/portal-candidates?source=ekiten&limit=100&offset=${offset}`, { headers: { "x-webhook-secret": secret } })
    const page = await response.json() as { candidates?: Array<Record<string, unknown>>; nextOffset?: number | null; error?: string }
    if (!response.ok) throw new Error(page.error ?? `portal list failed (${response.status})`)
    for (const candidate of page.candidates ?? []) if (listingUrls.has(typeof candidate.listingUrl === "string" ? candidate.listingUrl : "")) candidates.push(candidate)
    if (page.nextOffset === null || page.nextOffset === undefined) break
  }
  const ready = candidates.filter((candidate) => candidate.reviewStatus === "ready_for_review")
  const demoResults: Array<{ candidateId: string; ok: boolean; companyName?: string; jobId?: string; error?: string }> = []
  for (const candidate of ready) {
    const images = Array.isArray(candidate.images) ? candidate.images.filter((value): value is { url: string; alt: string } => Boolean(value && typeof value === "object" && typeof (value as { url?: unknown }).url === "string")) : []
    const listingUrl = typeof candidate.listingUrl === "string" ? candidate.listingUrl : ""
    const companyName = typeof candidate.companyName === "string" ? candidate.companyName : "候補企業"
    const assets = images.slice(0, 8).map((image, index) => ({
      id: `ekiten-${String(candidate.id)}-${index + 1}`,
      kind: "image" as const,
      sourceUrl: image.url,
      ownerLabel: companyName,
      sourceAccount: listingUrl,
      useBasis: "private_proposal" as const,
      officialSource: true,
      peopleVisible: /スタッフ|人物|モデル|顔/u.test(image.alt),
      watermarkVisible: false,
      alt: image.alt || `${companyName}の掲載写真 ${index + 1}`,
      notes: "エキテン掲載素材。非公開提案用。権利確認前は公開・納品に使用しない。",
    }))
    if (assets.length < 3) continue
    try {
      const queuedResponse = await fetch(`${origin}/api/sales/demo-site/portal-candidates`, {
        method: "PUT",
        headers: apiHeaders,
        body: JSON.stringify({ candidateId: candidate.id, industry: "Other", prefecture: typeof candidate.prefecture === "string" ? candidate.prefecture : undefined, assets }),
      })
      const queued = await queuedResponse.json() as { ok?: boolean; companyName?: string; jobId?: string; error?: string }
      demoResults.push({ candidateId: String(candidate.id), ok: queued.ok === true, companyName: queued.companyName, jobId: queued.jobId, error: queued.error })
      if (!queuedResponse.ok && !queued.error) console.error("[ekiten-browser-batch] demo approval failed:", queuedResponse.status)
    } catch (error) {
      console.error("[ekiten-browser-batch] demo approval failed:", candidate.id, error)
      demoResults.push({ candidateId: String(candidate.id), ok: false, companyName, error: error instanceof Error ? error.message : String(error) })
    }
  }
  console.log(JSON.stringify({ imported: importResult.imported ?? 0, failed: importResult.failed ?? 0, candidates: candidates.length, ready: ready.length, demos: demoResults }, null, 2))
}

main().catch((error) => {
  console.error("[ekiten-browser-batch] fatal:", error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
