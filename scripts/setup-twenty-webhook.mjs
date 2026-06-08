#!/usr/bin/env node
/**
 * Twenty CRM webhook auto-configuration.
 * 
 * Configures Twenty to POST to our webhook endpoint when companies are created/updated.
 * Twenty is self-hosted at twenty.paradigmjp.com.
 */

import { readProductionEnvValue } from "./lib/coolify-env.mjs"

const TWENTY_BASE = process.env.TWENTY_BASE_URL || "https://twenty.paradigmjp.com"
const WEBHOOK_URL = "https://paradigmjp.com/api/sales/twenty/webhook"

async function main() {
  const apiKey = await readProductionEnvValue("TWENTY_API_KEY")
  if (!apiKey) {
    console.error("TWENTY_API_KEY not found in Coolify or local env")
    process.exit(1)
  }

  const webhookSecret = await readProductionEnvValue("N8N_WEBHOOK_SECRET") ??
    await readProductionEnvValue("TRIGGER_WEBHOOK_SECRET")

  console.log("Twenty CRM Webhook Setup")
  console.log("=========================")
  console.log(`Twenty URL: ${TWENTY_BASE}`)
  console.log(`Webhook URL: ${WEBHOOK_URL}`)
  console.log(`Secret: ${webhookSecret ? "configured" : "NOT SET"}`)
  console.log()

  // Try Twenty GraphQL API to configure webhooks
  try {
    const gqlRes = await fetch(`${TWENTY_BASE}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: `
          mutation CreateWebhook($input: CreateWebhookInput!) {
            createWebhook(input: $input) {
              id
              targetUrl
              operations
            }
          }
        `,
        variables: {
          input: {
            targetUrl: WEBHOOK_URL,
            operations: ["company.created", "company.updated"],
            secret: webhookSecret || undefined,
          },
        },
      }),
    })

    const gqlBody = await gqlRes.json()
    if (gqlBody.data?.createWebhook?.id) {
      console.log("✅ Twenty webhook configured successfully!")
      console.log(`   ID: ${gqlBody.data.createWebhook.id}`)
      console.log(`   URL: ${gqlBody.data.createWebhook.targetUrl}`)
    } else if (gqlBody.errors) {
      console.log("⚠️  Twenty GraphQL webhook mutation not supported (older version)")
      console.log("   Errors:", JSON.stringify(gqlBody.errors).slice(0, 300))
      printManualSteps()
    } else {
      printManualSteps()
    }
  } catch (e) {
    console.log("⚠️  Could not reach Twenty GraphQL API:", e.message)
    printManualSteps()
  }
}

function printManualSteps() {
  console.log()
  console.log("📋 Manual setup (Twenty Admin UI):")
  console.log("   1. Open https://twenty.paradigmjp.com")
  console.log("   2. Settings → Developers → Webhooks")
  console.log("   3. Add webhook:")
  console.log(`      URL: ${WEBHOOK_URL}`)
  console.log("      Events: company.created, company.updated")
  console.log(`      Secret: (use N8N_WEBHOOK_SECRET from Coolify)`)
  console.log()
  console.log("Alternatively, the Trigger.dev cron already syncs every 1 minute.")
}

main().catch((e) => { console.error(e); process.exit(1) })
