import "server-only"

interface AutomaticRecoveryOptions<T> {
  phase: string
  maxAttempts: number
  operation: (attempt: number) => Promise<T>
  accept?: (value: T) => boolean
}
export interface AutomaticRecoveryResult<T> {
  value: T
  attempts: number
}

function retryDelayMs(attempt: number): number {
  return Math.min(750, 150 * (2 ** Math.max(0, attempt - 1)))
}

export async function runWithManualWorkAutoRecovery<T>(
  options: AutomaticRecoveryOptions<T>,
): Promise<AutomaticRecoveryResult<T>> {
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1 || options.maxAttempts > 3) {
    throw new Error("Manual work automatic recovery attempts must be between 1 and 3")
  }
  let lastValue: T | undefined
  let hasValue = false
  let lastError: unknown
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      const value = await options.operation(attempt)
      lastValue = value
      hasValue = true
      if (!options.accept || options.accept(value) || attempt === options.maxAttempts) {
        return { value, attempts: attempt }
      }
      console.warn("[manual-work] automatic recovery rejected a phase result:", {
        phase: options.phase,
        attempt,
        maxAttempts: options.maxAttempts,
      })
    } catch (error) {
      lastError = error
      console.error("[manual-work] automatic recovery phase failed:", {
        phase: options.phase,
        attempt,
        maxAttempts: options.maxAttempts,
        error,
      })
      if (attempt === options.maxAttempts) throw error
    }
    await new Promise<void>((resolve) => setTimeout(resolve, retryDelayMs(attempt)))
  }
  if (hasValue) return { value: lastValue as T, attempts: options.maxAttempts }
  throw lastError instanceof Error ? lastError : new Error(`${options.phase} failed after automatic recovery`)
}
