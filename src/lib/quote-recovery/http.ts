export function quoteRecoveryMutationAllowed(request: Request): boolean {
  const origin = request.headers.get("origin")
  if (!origin) return process.env.NODE_ENV !== "production"
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!configured) {
    console.error("[quote-recovery/http] NEXT_PUBLIC_SITE_URL is required for CSRF protection")
    return false
  }
  try {
    return new URL(origin).origin === new URL(configured).origin
  } catch (error) {
    console.error("[quote-recovery/http] invalid Origin header:", error)
    return false
  }
}

export function quoteRecoveryJsonAllowed(request: Request): boolean {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""
  return quoteRecoveryMutationAllowed(request) && contentType.startsWith("application/json")
}
