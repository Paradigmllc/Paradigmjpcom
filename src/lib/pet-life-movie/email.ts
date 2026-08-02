import type { PetMovieLocale, PetMoviePlan } from "./types"

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function subject(locale: PetMovieLocale, petName: string, delivered: boolean): string {
  if (locale === "ja") return delivered ? `${petName}の動画が完成しました` : `${petName}の動画制作を受け付けました`
  return delivered ? `${petName}'s Pet Life Movie is ready` : `We received ${petName}'s Pet Life Movie order`
}

export async function sendPetMovieEmail(input: {
  to: string
  petName: string
  locale: PetMovieLocale
  plan: PetMoviePlan
  memoryUrl: string
  delivered: boolean
  idempotencyKey?: string
}): Promise<void> {
  const apiKey = requiredEnv("RESEND_API_KEY")
  const from = process.env.PET_MOVIE_FROM_EMAIL?.trim() || "Pet Life Movie <noreply@paradigmjp.com>"
  const support = process.env.PET_MOVIE_SUPPORT_EMAIL?.trim() || "support@paradigmjp.com"
  const heading = subject(input.locale, input.petName, input.delivered)
  const message = input.locale === "ja"
    ? input.delivered
      ? "品質確認が完了しました。下の専用ページから各サイズの動画をダウンロードできます。"
      : "お支払いを確認しました。動画は制作と人による品質確認を経て、完成後にこのメールアドレスへお知らせします。"
    : input.delivered
      ? "Human quality review is complete. Download every included format from your private page below."
      : "Payment is confirmed. Your film will be rendered and reviewed by a person before we email you again."
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      reply_to: support,
      subject: heading,
      text: `${heading}\n\n${message}\n\n${input.memoryUrl}\n\nPlan: ${input.plan}`,
      html: `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(message)}</p><p><a href="${escapeHtml(input.memoryUrl)}">Open your private movie page</a></p><p>Plan: ${escapeHtml(input.plan)}</p>`,
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    const details = await response.text().catch((error) => {
      console.error("[pet-life-movie] Resend error body read failed", error)
      return ""
    })
    throw new Error(`Customer email failed: HTTP ${response.status} ${details.slice(0, 200)}`)
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character)
}
