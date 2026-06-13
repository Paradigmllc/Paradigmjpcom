/**
 * Jina Reader API — URL → clean Markdown for LLM consumption.
 * Free tier available. Prefix any URL with r.jina.ai/ to get Markdown.
 * Requires JINA_READER_API_KEY for auth (free at https://jina.ai/reader)
 */
export interface JinaReaderResult {
  ok: boolean
  data?: {
    title?: string
    markdown: string
    description?: string
    url: string
    usage?: { tokens: number }
  }
  error?: string
}

function env(name: string): string | null {
  const v = process.env[name]
  return v && v.trim().length > 0 ? v.trim() : null
}

export async function readWithJina(url: string): Promise<JinaReaderResult> {
  const apiKey = env("JINA_READER_API_KEY")
  const readerUrl = `https://r.jina.ai/${url}`

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "RevenueOS-Jina/1.0",
    }
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`

    const res = await fetch(readerUrl, {
      headers,
      signal: AbortSignal.timeout(20_000),
    })

    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }

    const body = (await res.json()) as {
      data?: {
        title?: string
        content?: string
        description?: string
        url?: string
        usage?: { tokens: number }
      }
    }

    const content = body.data?.content ?? ""
    return {
      ok: true,
      data: {
        title: body.data?.title,
        markdown: content.slice(0, 8000),
        description: body.data?.description,
        url: body.data?.url ?? url,
        usage: body.data?.usage,
      },
    }
  } catch (e) {
    console.error("[jina-reader] failed:", e)
    return { ok: false, error: e instanceof Error ? e.message : "Jina Reader failed" }
  }
}
