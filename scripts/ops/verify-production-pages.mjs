#!/usr/bin/env node

import fs from "node:fs"
import { pathToFileURL } from "node:url"
import { setTimeout as sleep } from "node:timers/promises"

const DEFAULT_SITE = "https://paradigmjp.com"
const DEFAULT_EVIDENCE_PATH = "/tmp/production-verification.json"

export const PRODUCTION_PAGE_SPECS = [
  ["/ja", ["Video as a Service", "Web制作", "AI制作・導入支援"]],
  ["/en", ["Japan Market Partner", "Video as a Service"]],
  [
    "/ja/video-as-a-service",
    [
      "動画制作チームを、採用せずに。",
      "$1,500",
      "$3,500",
      "$5,500",
      "契約前によくある質問",
    ],
  ],
  [
    "/en/video-as-a-service",
    [
      "Your on-demand video production team.",
      "$1,500",
      "$3,500",
      "$5,500",
      "Questions before you subscribe",
    ],
  ],
  [
    "/ja/video-as-a-service/terms",
    ["Video as a Service 利用規約", "2026年7月28日", "契約文書の優先順位"],
  ],
  [
    "/en/video-as-a-service/terms",
    ["Video as a Service Terms", "July 28, 2026", "Order of precedence"],
  ],
  [
    "/ja/contact?intent=video-as-a-service&plan=unlimited",
    ["Video as a Service 申込み", "希望プラン", "Unlimited", "素材の準備状況"],
  ],
  [
    "/en/contact?intent=video-as-a-service&plan=unlimited",
    ["Apply for Video as a Service", "Preferred plan", "Unlimited", "Asset readiness"],
  ],
  ["/api/ready", []],
]

function decodeNumericEntity(match, raw, radix) {
  const codePoint = Number.parseInt(raw, radix)
  if (!Number.isSafeInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return match
  }
  try {
    return String.fromCodePoint(codePoint)
  } catch {
    return match
  }
}

export function normalizePageText(input) {
  const withoutNonContent = String(input)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")

  const decoded = withoutNonContent
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (match, raw) =>
      decodeNumericEntity(match, raw, 16),
    )
    .replace(/&#([0-9]+);/g, (match, raw) =>
      decodeNumericEntity(match, raw, 10),
    )

  return {
    readable: decoded.replace(/\s+/g, " ").trim(),
    compact: decoded.replace(/\s+/g, ""),
  }
}

export function findMissingMarkers(body, markers) {
  const compactBody = normalizePageText(body).compact
  return markers.filter((marker) => {
    const compactMarker = normalizePageText(marker).compact
    return compactMarker.length > 0 && !compactBody.includes(compactMarker)
  })
}

export async function probePage({ site, pathname, markers, fetchImpl = fetch }) {
  try {
    const url = new URL(pathname, site)
    url.searchParams.set("deployment_verify", String(Date.now()))
    const response = await fetchImpl(url, {
      headers: { "Cache-Control": "no-cache" },
      redirect: "follow",
      signal: AbortSignal.timeout(25_000),
    })
    const body = await response.text()
    const missing = findMissingMarkers(body, markers)
    return {
      pathname,
      status: response.status,
      ok: response.ok && missing.length === 0,
      missing,
    }
  } catch (error) {
    return {
      pathname,
      status: 0,
      ok: false,
      missing: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  const site = process.env.PRODUCTION_SITE || DEFAULT_SITE
  const evidencePath =
    process.env.PRODUCTION_VERIFICATION_PATH || DEFAULT_EVIDENCE_PATH
  const attempts = Number.parseInt(process.env.PRODUCTION_VERIFY_ATTEMPTS || "36", 10)
  const delayMs = Number.parseInt(process.env.PRODUCTION_VERIFY_DELAY_MS || "5000", 10)

  if (!Number.isSafeInteger(attempts) || attempts < 1) {
    throw new Error("PRODUCTION_VERIFY_ATTEMPTS must be a positive integer")
  }
  if (!Number.isSafeInteger(delayMs) || delayMs < 0) {
    throw new Error("PRODUCTION_VERIFY_DELAY_MS must be a non-negative integer")
  }

  let results = []
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    results = await Promise.all(
      PRODUCTION_PAGE_SPECS.map(([pathname, markers]) =>
        probePage({ site, pathname, markers }),
      ),
    )
    console.log(
      `attempt ${attempt}/${attempts}: ${results.filter((result) => result.ok).length}/${results.length} passed`,
    )
    for (const result of results) {
      console.log(
        `${result.ok ? "PASS" : "FAIL"} ${result.pathname} HTTP ${result.status}; missing=${result.missing.join(" | ") || "none"}${result.error ? `; error=${result.error}` : ""}`,
      )
    }
    if (results.every((result) => result.ok)) break
    if (attempt < attempts && delayMs > 0) await sleep(delayMs)
  }

  fs.writeFileSync(evidencePath, `${JSON.stringify(results, null, 2)}\n`)
  if (!results.every((result) => result.ok)) process.exitCode = 1
}

const isMain =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error))
    process.exitCode = 1
  })
}
