import fs from "node:fs"
import path from "node:path"
import { describe, expect, test } from "vitest"

const root = process.cwd()
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8")

describe("Pet Life Movie production release wiring", () => {
  test("applies and verifies every private table through canonical release paths", () => {
    const migration = read("supabase/migrations/20260801213954_pet_life_movie_mvp.sql")
    const deploy = read("scripts/sales-os-no-login-deploy.mjs")
    const migrationRunner = read("scripts/run-migrations.sh")
    const dbVerifier = read("scripts/verify-db-tables.mjs")
    const dataAccess = read("src/lib/pet-life-movie/data.ts")

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
    expect(migration).toContain("enable row level security")
    expect(migration).toContain("force row level security")
    expect(migration).toContain("to service_role")
    expect(migration).not.toContain("references auth.users")
    expect(deploy).toContain("applyPetLifeMovieMigration")
    expect(deploy).toContain("verifyPetLifeMovieSchema")
    expect(migrationRunner).toContain("20260801213954_pet_life_movie_mvp.sql")
    expect(dataAccess).toContain("getServiceSalesSupabase")
    expect(dataAccess).not.toContain("getServiceSupabase()")
  })
})
