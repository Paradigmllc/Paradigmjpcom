#!/usr/bin/env node
import { readProductionEnvValue } from "./lib/coolify-env.mjs"

const envName = process.argv[2] || "SUPABASE_SERVICE_ROLE_KEY"
const printSecret = process.argv.includes("--print-secret")
const value = await readProductionEnvValue(envName)

if (!value) {
  console.error(`${envName} is not configured`)
  process.exit(1)
}

if (!printSecret) {
  console.log(`${envName}: configured`)
  process.exit(0)
}

process.stdout.write(value)
