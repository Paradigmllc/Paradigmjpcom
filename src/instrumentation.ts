export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  // Permanent infra rule: do not start cron-like watchdog loops from app boot.
  // Sales background work is dispatched by webhooks, queues, and explicit API actions.
}
