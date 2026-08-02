type EmailResult = { ok: true; id: string } | { ok: false; error: string }

export async function sendQuoteRecoveryEmail(input: { to: string; subject: string; html: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.QUOTE_RECOVERY_FROM_EMAIL?.trim()
  if (!apiKey || !from) {
    const error = "RESEND_API_KEY or QUOTE_RECOVERY_FROM_EMAIL is not configured"
    console.error(`[quote-recovery/email] ${error}`)
    return { ok: false, error }
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
      signal: AbortSignal.timeout(15_000),
    })
    const body: unknown = await response.json()
    if (!response.ok || !body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string") {
      const error = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : `Resend HTTP ${response.status}`
      console.error("[quote-recovery/email] delivery failed:", error)
      return { ok: false, error }
    }
    return { ok: true, id: body.id }
  } catch (error) {
    console.error("[quote-recovery/email] request failed:", error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
