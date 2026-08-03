import fs from "node:fs"
import path from "node:path"
import { describe, expect, test } from "vitest"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("Pet Life Movie production release wiring", () => {
  test("applies and verifies every private table through canonical release paths", () => {
    const migration = read("supabase/migrations/20260801213954_pet_life_movie_mvp.sql")
    const marketMigration = read("supabase/migrations/20260802020742_pet_life_movie_market_ready.sql")
    const commercialMigration = read("supabase/migrations/20260802210000_pet_life_movie_commercial_quality.sql")
    const qaMigration = read("supabase/migrations/20260803113000_pet_movie_qa_renders.sql")
    const deploy = read("scripts/sales-os-no-login-deploy.mjs")
    const migrationRunner = read("scripts/run-migrations.sh")
    const dbVerifier = read("scripts/verify-db-tables.mjs")
    const dataAccess = read("src/lib/pet-life-movie/data.ts")
    const checkoutRoute = read("src/app/api/pet-life-movie/projects/[id]/checkout/route.ts")
    const retention = read("src/lib/pet-life-movie/retention.ts")

    for (const table of [
      "pet_movie_projects",
      "pet_movie_contributors",
      "pet_movie_assets",
      "pet_movie_jobs",
      "pet_movie_events",
    ]) {
      expect(migration).toContain(table)
      expect(dbVerifier).toContain(table)
    }
    expect(marketMigration).toContain("pet_movie_deliverables")
    expect(marketMigration).toContain("force row level security")
    expect(marketMigration).toContain("to service_role")
    expect(commercialMigration).toContain("terms_accepted_at")
    expect(commercialMigration).toContain("consent_confirmed")
    expect(qaMigration).toContain("pet_movie_qa_renders")
    expect(qaMigration).toContain("force row level security")
    expect(qaMigration).toContain("to service_role")
    expect(migration).toContain("enable row level security")
    expect(migration).toContain("force row level security")
    expect(migration).toContain("to service_role")
    expect(migration).not.toContain("references auth.users")
    expect(deploy).toContain("applyPetLifeMovieMigration")
    expect(deploy).toContain("applyPetLifeMovieMarketReadyMigration")
    expect(deploy).toContain("applyPetLifeMovieCommercialQualityMigration")
    expect(deploy).toContain("applyPetLifeMovieQaRenderMigration")
    expect(deploy).toContain("verifyPetLifeMovieSchema")
    expect(deploy).toContain("isInternalDataApiUrl(url)")
    expect(deploy).toContain("has_table_privilege('service_role', 'public.pet_movie_projects', 'SELECT')")
    expect(deploy).toContain("const cachedSupabaseDbContainers = new Map()")
    expect(deploy).toContain("input: sqlWithSchemaReload")
    expect(migrationRunner).toContain("20260801213954_pet_life_movie_mvp.sql")
    expect(migrationRunner).toContain("20260802020742_pet_life_movie_market_ready.sql")
    expect(migrationRunner).toContain("20260802210000_pet_life_movie_commercial_quality.sql")
    expect(migrationRunner).toContain("20260803113000_pet_movie_qa_renders.sql")
    expect(dataAccess).toContain("getServiceSalesSupabase")
    expect(dataAccess).not.toContain("getServiceSupabase()")
    expect(checkoutRoute).toContain("createPetMovieCheckoutIdempotencyKey")
    expect(checkoutRoute).not.toContain("Math.floor(Date.now() / 1_800_000)")
    expect(retention).toContain("expireCheckoutSession(checkoutSessionId)")
  })
})
