import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const migrationName = "20260907120000_video_factory_generation_control_plane.sql"
const migration = readFileSync(`supabase/migrations/${migrationName}`, "utf8").toLowerCase()
const deploy = readFileSync("scripts/sales-os-no-login-deploy.mjs", "utf8")
const runMigrations = readFileSync("scripts/run-migrations.sh", "utf8")

describe("Video Factory generation control release contract", () => {
  it("ships all ledgers with forced RLS and service-role-only RPCs", () => {
    for (const table of ["generation_policies", "provider_health", "generation_runs", "generation_attempts", "generation_quality_reviews", "generation_events"]) {
      expect(migration).toContain(`video_factory_${table}`)
    }
    expect(migration).toContain("force row level security")
    expect(migration).toContain("from public, anon, authenticated")
    expect(migration).toContain("to service_role")
  })

  it("enforces budget, token, GPU, idempotency, cache, attempts, and circuit guards atomically", () => {
    for (const marker of [
      "pg_advisory_xact_lock", "idempotency_key", "daily_cost_limit", "per_run_cost_limit",
      "llm_token_limit", "gpu_time_limit", "cache_hit", "generation attempt limit reached",
      "circuit_failure_threshold", "provider_circuit_open",
    ]) expect(migration).toContain(marker)
  })

  it("is wired into both migration runners", () => {
    expect(deploy).toContain(migrationName)
    expect(deploy).toContain("applyVideoFactoryGenerationControlPlaneMigration")
    expect(runMigrations).toContain(migrationName)
  })
})
