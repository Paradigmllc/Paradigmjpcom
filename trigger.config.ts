import { defineConfig } from "@trigger.dev/sdk/v3"

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "paradigm-sales-os",
  dirs: ["./trigger"],
  runtime: "node",
  maxDuration: 1800,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 2,
      minTimeoutInMs: 30_000,
      maxTimeoutInMs: 300_000,
      factor: 2,
      randomize: true,
    },
  },
  logLevel: "info",
})
