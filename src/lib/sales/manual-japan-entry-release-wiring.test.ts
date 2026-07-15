import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

describe("manual Japan Entry release wiring", () => {
  it("applies and verifies the dedicated table before deploy", () => {
    const deploy = read("scripts/sales-os-no-login-deploy.mjs")
    const verifier = read("scripts/verify-db-tables.mjs")
    const doctor = read("scripts/release-doctor.mjs")
    const twenty = read("scripts/twenty-sales-select-options.sql")

    expect(deploy).toContain("applyManualJapanEntryWorkMigration")
    expect(deploy).toContain("20260715031327_manual_japan_entry_work.sql")
    expect(verifier).toContain('"manual_japan_entry_work"')
    expect(doctor).toContain("manual Japan Entry workbench has RLS")
    expect(twenty).toContain("'manual_work'")
  })
})
