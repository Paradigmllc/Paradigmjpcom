/**
 * Mozilla Observatory API — free security headers audit
 * No API key required. Public endpoint.
 * https://observatory.mozilla.org/api/v2
 */

export interface ObservatoryResult {
  ok: boolean
  domain: string
  score?: number
  grade?: string
  testsPassed?: number
  testsTotal?: number
  error?: string
}

export async function scanMozillaObservatory(domain: string): Promise<ObservatoryResult> {
  try {
    // Step 1: Trigger scan (POST)
    const scanUrl = `https://http-observatory.security.mozilla.org/api/v2/analyze?host=${encodeURIComponent(domain)}`
    const scanRes = await fetch(scanUrl, {
      method: "POST",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    })

    if (!scanRes.ok) {
      return { ok: false, domain, error: `scan POST HTTP ${scanRes.status}` }
    }

    const scanBody = (await scanRes.json()) as {
      scan_id?: number
      state?: string
      grade?: string
      score?: number
      tests_passed?: number
      tests_quantity?: number
      error?: string
    }

    // If scan is pending, poll once more
    if (scanBody.state === "PENDING" && scanBody.scan_id) {
      await new Promise((resolve) => setTimeout(resolve, 3_000))
      const pollUrl = `https://http-observatory.security.mozilla.org/api/v2/analyze?host=${encodeURIComponent(domain)}`
      const pollRes = await fetch(pollUrl, {
        method: "POST",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      })
      if (pollRes.ok) {
        const pollBody = (await pollRes.json()) as typeof scanBody
        return {
          ok: true,
          domain,
          score: pollBody.score,
          grade: pollBody.grade,
          testsPassed: pollBody.tests_passed,
          testsTotal: pollBody.tests_quantity,
        }
      }
    }

    if (scanBody.error) {
      return { ok: false, domain, error: scanBody.error }
    }

    return {
      ok: true,
      domain,
      score: scanBody.score,
      grade: scanBody.grade,
      testsPassed: scanBody.tests_passed,
      testsTotal: scanBody.tests_quantity,
    }
  } catch (e) {
    console.error("[mozilla-observatory] scan failed:", e)
    return { ok: false, domain, error: e instanceof Error ? e.message : "Observatory scan failed" }
  }
}
