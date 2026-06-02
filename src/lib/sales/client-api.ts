"use client"

function compactSnippet(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 180)
}

export async function readSalesApiJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) return {} as T

  try {
    return JSON.parse(text) as T
  } catch (error) {
    const contentType = res.headers.get("content-type") ?? "unknown content type"
    const snippet = compactSnippet(text)
    console.error("[sales-api] non-json response:", {
      status: res.status,
      contentType,
      snippet,
      error,
    })
    const hint = text.trimStart().startsWith("<")
      ? "APIがHTMLページを返しました。ログイン状態、ルート、またはサーバー例外を確認してください。"
      : "APIがJSONではないレスポンスを返しました。"
    throw new Error(`${hint} HTTP ${res.status} / ${contentType}`)
  }
}
