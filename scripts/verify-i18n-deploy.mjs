#!/usr/bin/env node
/**
 * scripts/verify-i18n-deploy.mjs — Post-deploy 12-locale fingerprint check
 *
 * P17 2026-04-27 新規実装
 *
 * Public marketing locales are JA/EN. The legacy locale paths intentionally
 * return a permanent redirect to /en and are verified as redirects.
 *
 * 使い方: node scripts/verify-i18n-deploy.mjs [--base=https://paradigmjp.com]
 */

const args = process.argv.slice(2)
const baseArg = args.find((a) => a.startsWith("--base="))
const BASE = baseArg ? baseArg.replace("--base=", "") : "https://paradigmjp.com"

const LOCALES = ["ja", "en", "ko", "zh", "de", "fr", "es", "pt", "ru", "ar", "vi", "id"]
const PUBLIC_LOCALES = new Set(["ja", "en"])

async function check(locale) {
  const url = `${BASE}/${locale}`
  const start = Date.now()
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    })
    const elapsed = Date.now() - start
    const status = res.status
    const contentType = res.headers.get("content-type") || ""
    const html = await res.text()
    if (!PUBLIC_LOCALES.has(locale)) {
      const ok = [301, 302, 307, 308].includes(status) && Boolean(res.headers.get("location"))
      return { locale, status, redirect: res.headers.get("location"), ok, elapsed, urlLen: url.length, htmlLen: html.length }
    }
    const langMatch = html.match(/<html[^>]*lang="([^"]+)"/)
    const dirMatch = html.match(/<html[^>]*dir="([^"]+)"/)
    const lang = langMatch ? langMatch[1] : "?"
    const dir = dirMatch ? dirMatch[1] : "?"
    const ok = status === 200 && lang === locale
    const expectedDir = locale === "ar" ? "rtl" : "ltr"
    const dirOk = dir === expectedDir
    return { locale, status, lang, dir, expectedDir, dirOk, ok: ok && dirOk, elapsed, urlLen: url.length, htmlLen: html.length }
  } catch (e) {
    return { locale, status: "ERROR", error: e.message, ok: false }
  }
}

async function main() {
  console.log(`🌐 Verifying 12-locale deploy at ${BASE}\n`)
  const results = []
  for (const l of LOCALES) {
    const r = await check(l)
    results.push(r)
    if (r.ok && PUBLIC_LOCALES.has(l)) {
      console.log(`  ✅ /${l.padEnd(2)} → ${r.status} | lang="${r.lang}" dir="${r.dir}" | ${r.elapsed}ms | ${(r.htmlLen / 1024).toFixed(0)}KB`)
    } else if (r.ok) {
      console.log(`  ✅ /${l.padEnd(2)} → ${r.status} redirect=${r.redirect} | ${r.elapsed}ms`)
    } else if (r.status === "ERROR") {
      console.log(`  ❌ /${l.padEnd(2)} → ERROR: ${r.error}`)
    } else {
      console.log(`  ⚠️  /${l.padEnd(2)} → ${r.status} | lang="${r.lang}"(expected ${l}) dir="${r.dir}"(expected ${r.expectedDir}) | ${r.elapsed}ms`)
    }
  }
  const okCount = results.filter((r) => r.ok).length
  const errCount = results.length - okCount
  console.log(`\n📊 Summary: ${okCount}/${LOCALES.length} ✅`)
  if (errCount > 0) {
    console.log(`Failed locales: ${results.filter((r) => !r.ok).map((r) => r.locale).join(", ")}`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})
