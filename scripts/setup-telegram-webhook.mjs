/**
 * scripts/setup-telegram-webhook.mjs
 *
 * Register @aiparadigmbot webhook → paradigmjp.com/api/sales/agent/telegram-command
 *
 * Usage:
 *   node scripts/setup-telegram-webhook.mjs            # register webhook
 *   node scripts/setup-telegram-webhook.mjs --delete    # unregister webhook
 *   node scripts/setup-telegram-webhook.mjs --info      # show current webhook info
 *
 * Required env:
 *   TELEGRAM_BOT_TOKEN     = BotFather token for @aiparadigmbot
 *   TELEGRAM_WEBHOOK_SECRET = secret_token passed to Telegram (must match server env)
 */

import { config } from "dotenv"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, "..", ".env.local") })

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const WEBHOOK_URL = process.env.PARADIGM_AI_AGENT_WEBHOOK_URL
  ?? "https://paradigmjp.com/api/sales/agent/telegram-command"

const API = `https://api.telegram.org/bot${TOKEN}`

function log(label, data) {
  console.log(`\n📡 ${label}`)
  console.log(JSON.stringify(data, null, 2))
}

async function main() {
  const mode = process.argv[2]

  if (!TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set in .env.local")
    console.error("   Get it from @BotFather: /mybots → @aiparadigmbot → API Token")
    process.exit(1)
  }

  if (mode === "--delete") {
    const res = await fetch(`${API}/deleteWebhook`, { method: "POST" })
    const data = await res.json()
    log("Webhook deleted", data)
    return
  }

  if (mode === "--info") {
    const res = await fetch(`${API}/getWebhookInfo`)
    const data = await res.json()
    log("Webhook info", data)
    if (data.result?.url) {
      console.log(`   URL: ${data.result.url}`)
      console.log(`   Has custom cert: ${data.result.has_custom_certificate}`)
      console.log(`   Pending updates: ${data.result.pending_update_count}`)
      if (data.result.last_error_date) {
        console.log(`   ⚠️ Last error: ${new Date(data.result.last_error_date * 1000).toISOString()}`)
        console.log(`   ⚠️ Error message: ${data.result.last_error_message}`)
      }
    }
    return
  }

  if (!SECRET) {
    console.error("❌ TELEGRAM_WEBHOOK_SECRET is not set in .env.local")
    console.error("   Set it to a random string. Must match the server's env var.")
    console.error("   Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"")
    process.exit(1)
  }

  const body = new URLSearchParams({
    url: WEBHOOK_URL,
    secret_token: SECRET,
    drop_pending_updates: "true",
    max_connections: "5",
  })

  console.log(`🚀 Registering webhook...`)
  console.log(`   Bot: @aiparadigmbot`)
  console.log(`   URL: ${WEBHOOK_URL}`)
  console.log(`   Secret: ${SECRET.slice(0, 8)}...`)

  const res = await fetch(`${API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })
  const data = await res.json()

  if (data.ok) {
    log("✅ Webhook registered successfully", data)

    // Verify it took effect
    const info = await fetch(`${API}/getWebhookInfo`)
    const infoData = await info.json()
    if (infoData.result?.url === WEBHOOK_URL) {
      console.log("✅ Verification: URL matches")
    } else {
      console.warn(`⚠️ Verification: URL mismatch — got ${infoData.result?.url}`)
    }
  } else {
    log("❌ Registration failed", data)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("💥 Fatal error:", err)
  process.exit(1)
})
