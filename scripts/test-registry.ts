// dotenv must be loaded before modules that read process.env.
import { config } from "dotenv"

config({ path: ".env.local" })

import { getSalesIntegrationStatus } from "../src/lib/sales/integration-registry"

async function main() {
  const result = await getSalesIntegrationStatus({ liveBalance: false })
  const counts = {
    ready: 0,
    partial: 0,
    missing: 0,
    other: 0,
  }

  console.log("=== Full Status Report ===\n")

  for (const row of result) {
    if (row.status === "ready") counts.ready++
    else if (row.status === "partial") counts.partial++
    else if (row.status === "missing") counts.missing++
    else counts.other++

    const marker =
      row.status === "ready"
        ? "[ready]"
        : row.status === "partial"
          ? "[partial]"
          : row.status === "missing"
            ? "[missing]"
            : "[other]"
    console.log(`${marker} ${row.displayName} (${row.slug}) - ${row.status}`)
    if (row.missingEnv.length > 0) console.log(`   Missing: ${row.missingEnv.join(", ")}`)
  }

  console.log("\n=== Summary ===")
  console.log(
    `Total: ${result.length} | Ready: ${counts.ready} | Partial: ${counts.partial} | Missing: ${counts.missing} | Other: ${counts.other}`,
  )
}

main().catch((error) => {
  console.error("[test-registry] failed:", error)
  process.exit(1)
})
