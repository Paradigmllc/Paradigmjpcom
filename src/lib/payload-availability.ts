const DEFAULT_COOLDOWN_MS = 120_000

let lastFailureAt = 0
let lastFailureMessage = ""

function cooldownMs(): number {
  const raw = process.env.PAYLOAD_INIT_FAILURE_COOLDOWN_MS
  if (!raw) return DEFAULT_COOLDOWN_MS
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 10_000 ? parsed : DEFAULT_COOLDOWN_MS
}

export function payloadInitCooldownRemainingMs(): number {
  if (lastFailureAt === 0) return 0
  return Math.max(0, cooldownMs() - (Date.now() - lastFailureAt))
}

export function isPayloadInitCoolingDown(): boolean {
  return payloadInitCooldownRemainingMs() > 0
}

export function markPayloadInitFailure(error: unknown): void {
  lastFailureAt = Date.now()
  lastFailureMessage = error instanceof Error ? error.message : String(error)
}

export function getPayloadInitFailureMessage(): string {
  return lastFailureMessage
}
