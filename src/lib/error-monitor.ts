/**
 * lib/error-monitor.ts — lightweight error monitoring (Slack-backed)
 *
 * 役割: 本番でキャッチされたエラーを Slack #all-paradigm に通知。
 *       @sentry/nextjs 導入の前段として、最低限の可視化を確保する。
 *
 * 入力: { error, context?, severity?, source? }
 * 出力: void (best-effort fire-and-forget)
 *
 * 永久ルール (BB / WW):
 *   - エラー時はサイレント失敗を作らない
 *   - 本番ダウン時は Slack #all-paradigm に即報告
 *
 * 拡張ロード: SENTRY_DSN env が設定されていれば Sentry にも送る (@sentry/nextjs
 *   インストール後に hookable)。現状は Slack のみ。
 */

interface CaptureOptions {
  context?: Record<string, unknown>
  severity?: "info" | "warning" | "error" | "fatal"
  source?: string // e.g. "/api/contact", "blog/[slug]"
}

// 2026-05-13 appexx.me 連携一時断絶: SLACK_WEBHOOK_URL env から
// Slack Incoming Webhook を直接呼ぶ。未設定なら no-op + console (fail-soft)。
// 旧: "https://appexx.me/api/studio/notify" hardcode (archived 2026-05-13)
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL ?? ""
const NODE_ENV = process.env.NODE_ENV ?? "development"

/**
 * Best-effort error capture. NEVER throws (any internal failure is swallowed
 * to avoid recursion / second-order failures).
 */
export async function captureException(
  error: unknown,
  options: CaptureOptions = {},
): Promise<void> {
  const severity = options.severity ?? "error"
  const source = options.source ?? "unknown"

  // Always console.error first — most reliable surface.
  // eslint-disable-next-line no-console
  console.error(`[error-monitor] [${severity}] [${source}]`, error, options.context)

  // Skip Slack notification in development to avoid spam.
  if (NODE_ENV !== "production") return

  // Skip if NODE_ENV is production but explicit override is set.
  if (process.env.ERROR_MONITOR_DISABLED === "1") return

  // Skip if SLACK_WEBHOOK_URL not configured (appexx.me archive 2026-05-13).
  if (!SLACK_WEBHOOK_URL) {
    // eslint-disable-next-line no-console
    console.warn("[error-monitor] SLACK_WEBHOOK_URL not set — production error logged to stdout only")
    return
  }

  try {
    const errorObj = error instanceof Error
      ? { message: error.message, name: error.name, stack: error.stack?.split("\n").slice(0, 8).join("\n") }
      : { message: String(error) }

    const slackText = [
      `🚨 *paradigmjp.com error* [${severity}]`,
      `*Source:* ${source}`,
      `*Message:* ${errorObj.message}`,
      errorObj.name ? `*Type:* ${errorObj.name}` : null,
      options.context ? `*Context:* \`\`\`${JSON.stringify(options.context, null, 2).slice(0, 1000)}\`\`\`` : null,
      errorObj.stack ? `*Stack:* \`\`\`${errorObj.stack.slice(0, 1500)}\`\`\`` : null,
    ]
      .filter(Boolean)
      .join("\n")

    await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: slackText }),
      signal: AbortSignal.timeout(3_000),
    })
  } catch {
    // Best-effort — never throw from monitor itself.
  }

  // Future: forward to Sentry if SENTRY_DSN set + @sentry/nextjs installed.
  // import("@sentry/nextjs").then(s => s.captureException(error)).catch(() => {})
}

/**
 * Convenience: wrap an async handler so any throw is captured + re-thrown
 * (preserves caller's error path). Useful for route handlers.
 */
export async function withErrorMonitor<T>(
  source: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    await captureException(e, { source, severity: "error" })
    throw e
  }
}
