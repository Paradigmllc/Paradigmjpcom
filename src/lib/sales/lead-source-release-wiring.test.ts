import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

describe("lead source preflight release wiring", () => {
  it("applies the website preflight migration through the formal release path", () => {
    const deploy = read("scripts/sales-os-no-login-deploy.mjs")

    expect(deploy).toContain("20260715113000_lead_source_website_preflight.sql")
    expect(deploy).toContain("applyLeadSourceWebsitePreflightMigration")
    expect(deploy).toContain("await applyLeadSourceWebsitePreflightMigration(envs)")
  })

  it("checks the split selection service and preflight fail-closed contract", () => {
    const doctor = read("scripts/release-doctor.mjs")

    expect(doctor).toContain("src/lib/sales/lead-source-selection.ts")
    expect(doctor).toContain("sales_claim_lead_source_records")
    expect(doctor).toContain("sales_claim_lead_source_preflight_records")
    expect(doctor).toContain("preflight_checked_at >= now() - interval '7 days'")
  })

  it("applies country source-pack provenance through the formal release path", () => {
    const deploy = read("scripts/sales-os-no-login-deploy.mjs")
    const doctor = read("scripts/release-doctor.mjs")

    expect(deploy).toContain("20260715140000_lead_source_country_packs.sql")
    expect(deploy).toContain("applyLeadSourceCountryPacksMigration")
    expect(deploy).toContain("await applyLeadSourceCountryPacksMigration(envs)")
    expect(doctor).toContain("source_pack_query_sha256")
    expect(doctor).toContain("sales_lead_inventory_runs_no_delivery_check")
    expect(doctor).toContain("European Commission CORDIS")
    expect(doctor).toContain("bounded, attributed and no-delivery")
  })
})
