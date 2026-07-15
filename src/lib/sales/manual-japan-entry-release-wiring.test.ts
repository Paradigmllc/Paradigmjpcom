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
    const service = read("src/lib/sales/manual-japan-entry-service.ts")
    const report = read("src/lib/sales/manual-japan-entry-report.ts")
    const formVerification = read("src/lib/sales/sources/external-form-verification.ts")

    expect(deploy).toContain("applyManualJapanEntryWorkMigration")
    expect(deploy).toContain("20260715031327_manual_japan_entry_work.sql")
    expect(verifier).toContain('"manual_japan_entry_work"')
    expect(doctor).toContain("manual Japan Entry workbench has grounded initial-interest copy")
    expect(twenty).toContain("'manual_work'")
    expect(service).toContain('purpose: "initial_interest"')
    expect(service).not.toContain('purpose: "commercial_offer"')
    expect(service).toContain("productContext: input.evidence.productContext")
    expect(report).toContain("buildJapanEntryPersonalizationFacts")
    expect(report).toContain("matchContentTemplate")
    expect(report).toContain('evidence_contract: "public-pages-only"')
    expect(formVerification).toContain('inspection.status === "form"')
  })
})
