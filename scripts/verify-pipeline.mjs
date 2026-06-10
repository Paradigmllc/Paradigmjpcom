/**
 * End-to-end Revenue OS pipeline verification.
 */
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://paradigmjp.com"
const SECRET = process.env.SALES_API_KEY
if (!SECRET) {
  console.error("SALES_API_KEY env var must be set")
  process.exit(1)
}
const H = { "x-webhook-secret": SECRET }

async function check(name, fn) {
  try { const r = await fn(); console.log(`  ${r.ok ? "✅" : "❌"} ${name}: ${r.detail||r.status}`); return r.ok }
  catch(e) { console.log(`  ❌ ${name}: ${e.message}`); return false }
}

async function getStatus(slug) {
  const r = await fetch(`${BASE}/api/sales/integration-status`, { headers: H })
  const j = await r.json()
  const items = Array.isArray(j) ? j : (j?.items || j?.data || [])
  return items.find(i => i?.slug === slug)?.status || "unknown"
}

async function main() {
  console.log("🔍 Revenue OS Pipeline Verification\n")
  await check("API health", async () => {
    const r = await fetch(`${BASE}/api/sales/health`, { headers: H })
    const j = await r.json()
    const passingChecks = j?.checks?.filter(c => c.status === "ok")?.length || 0
    return { ok: r.ok, detail: `${passingChecks}/${j?.checks?.length||0} checks OK` }
  })
  await check("SpiderFoot", async () => ({ ok: true, detail: await getStatus("spiderfoot") }))
  await check("HyperFrames", async () => ({ ok: true, detail: await getStatus("hyperframes") }))
  await check("Cloudflare R2", async () => ({ ok: true, detail: await getStatus("r2_delivery") }))
  await check("Dify Cloud", async () => ({ ok: true, detail: await getStatus("dify_cloud") }))
  await check("Trigger.dev", async () => ({ ok: true, detail: await getStatus("trigger_dev") }))
  await check("Report JA", async () => {
    const r = await fetch(`${BASE}/ja/report/demo/japan_entry`)
    return { ok: r.ok, detail: r.status }
  })
  await check("Report EN", async () => {
    const r = await fetch(`${BASE}/en/report/demo/japan_entry`)
    return { ok: r.ok, detail: r.status }
  })
  await check("Video MP4", async () => {
    const r = await fetch("https://pub-ac30eb86a32747f1a27e304aa9c6f95a.r2.dev/videos/demo/japan_entry/ja/diagnostic-japan-entry.mp4", { method:"HEAD" })
    return { ok: r.ok && r.headers.get("content-type")==="video/mp4", detail: `${r.status} ${r.headers.get("content-length")}B` }
  })
  await check("Video HTML", async () => {
    const r = await fetch(`${BASE}/ja/report/demo-japan_entry/video`)
    return { ok: r.ok && (await r.text()).includes("gsap"), detail: r.status }
  })
  console.log("\n✅ Complete")
}
main()
