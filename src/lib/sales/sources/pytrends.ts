/**
 * Pytrends — Google Trends data via unofficial API
 * Free, no API key required. Uses pytrends RSS-like endpoint.
 * Note: This is a lightweight HTTP caller; heavy trend analysis should use pytrends CLI.
 */

export interface TrendsResult {
  ok: boolean
  domain: string
  interestOverTime?: Record<string, number>
  relatedQueries?: string[]
  error?: string
}

export async function fetchGoogleTrendsInterest(domain: string): Promise<TrendsResult> {
  try {
    // Use the Trends explore endpoint (public, no auth)
    const keyword = domain.replace(/^www\./, "").split(".")[0] || domain
    const url = `https://trends.google.com/trends/api/explore?hl=en-US&tz=-540&req=${encodeURIComponent(JSON.stringify({
      comparisonItem: [{ keyword, geo: "JP", time: "today 12-m" }],
      category: 0,
      property: "",
    }))}&tz=-540`

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "RevenueOS/1.0",
      },
      signal: AbortSignal.timeout(12_000),
    })

    // Google Trends returns `)]}'` prefix before JSON
    const text = await res.text()
    const jsonText = text.startsWith(")]}'") ? text.slice(5) : text

    if (!res.ok) {
      return { ok: false, domain, error: `HTTP ${res.status}` }
    }

    const body = JSON.parse(jsonText) as {
      widgets?: Array<{ token?: string; title?: string }>
    }

    const widgetToken = body.widgets?.find((w) => w.token)?.token

    // If we got a token, fetch the actual timeline data
    if (widgetToken) {
      const dataUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=-540&req=${encodeURIComponent(JSON.stringify({
        time: "today 12-m",
        resolution: "MONTH",
        locale: "en-US",
        comparisonItem: [{ keyword, geo: "JP", time: "today 12-m" }],
        requestOptions: { property: "", backend: "IZG", category: 0 },
        token: widgetToken,
      }))}&token=${widgetToken}&tz=-540`

      const dataRes = await fetch(dataUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "RevenueOS/1.0",
        },
        signal: AbortSignal.timeout(12_000),
      })

      const dataText = await dataRes.text()
      const dataJson = JSON.parse(dataText.startsWith(")]}'") ? dataText.slice(5) : dataText) as {
        default?: { timelineData?: Array<{ formattedTime?: string; value?: number[] }> }
      }

      const timeline = dataJson.default?.timelineData ?? []
      const interestOverTime: Record<string, number> = {}
      for (const point of timeline) {
        const time = point.formattedTime ?? ""
        const value = point.value?.[0] ?? 0
        if (time) interestOverTime[time] = value
      }

      return { ok: true, domain, interestOverTime }
    }

    return { ok: true, domain }
  } catch (e) {
    console.error("[pytrends] interest fetch failed:", e)
    return { ok: false, domain, error: e instanceof Error ? e.message : "Google Trends fetch failed" }
  }
}
