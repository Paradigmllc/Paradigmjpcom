import type { JsonRecord } from "./sales-pipeline-types"

export async function addChatwootPrivateNote(
  accountId: string,
  conversationId: string | number,
  content: string
): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = process.env.CHATWOOT_BASE_URL
  const apiKey = process.env.CHATWOOT_API_KEY
  if (!baseUrl || !apiKey || !accountId) {
    return { ok: false, error: "Chatwoot credentials not configured" }
  }

  try {
    const url = `${baseUrl.replace(/\/+$/, "")}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api_access_token": apiKey,
      },
      body: JSON.stringify({
        content,
        message_type: "outgoing",
        private: true,
      }),
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "unknown response")
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (e) {
    console.error("[chatwoot-client] failed to add private note:", e)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
