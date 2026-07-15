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
    expect(deploy).toContain("20260715151000_lead_source_partial_pilot_claim.sql")
    expect(deploy).toContain("applyLeadSourcePartialPilotClaimMigration")
    expect(deploy).toContain("await applyLeadSourcePartialPilotClaimMigration(envs)")
    expect(deploy).toContain("20260715173000_lead_source_product_fit_retry.sql")
    expect(deploy).toContain("applyLeadSourceProductFitRetryMigration")
    expect(deploy).toContain("await applyLeadSourceProductFitRetryMigration(envs)")
    expect(deploy).toContain("20260715233000_lead_source_product_evidence_retry.sql")
    expect(deploy).toContain("applyLeadSourceProductEvidenceRetryMigration")
    expect(deploy).toContain("await applyLeadSourceProductEvidenceRetryMigration(envs)")
    expect(deploy.indexOf("await applyLeadSourceProductEvidenceRetryMigration(envs)"))
      .toBeGreaterThan(deploy.indexOf("await applySalesOptionalColumnRepairMigration(envs)"))
  })

  it("limits historical product-fit retries to official Tier 3 SME evidence", () => {
    const migration = read("supabase/migrations/20260715233000_lead_source_product_evidence_retry.sql")

    expect(migration).toContain("source_config.trust_tier >= 3")
    expect(migration).toContain("source_record.is_sme = true")
    expect(migration).toContain("ARRAY['japan_entry_offer_fit_missing']::text[]")
    expect(migration).toContain("ARRAY['ai_evidence_review_failed']::text[]")
    expect(migration).toContain("jsonb_array_length(prior_item.quality_gate->'aiReview'->'evidenceQuotes') >= 2")
    expect(migration).toContain("jsonb_array_length(prior_item.quality_gate->'aiReview'->'riskFlags') = 0")
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.sales_claim_lead_source_records")
  })

  it("checks the split selection service and preflight fail-closed contract", () => {
    const doctor = read("scripts/release-doctor.mjs")

    expect(doctor).toContain("src/lib/sales/lead-source-selection.ts")
    expect(doctor).toContain("sales_claim_lead_source_records")
    expect(doctor).toContain("sales_claim_lead_source_preflight_records")
    expect(doctor).toContain("sales_claim_lead_source_pilot_records")
    expect(doctor).toContain("preflight_checked_at >= now() - interval '7 days'")
    expect(doctor).toContain("official-SMB grounded product-evidence claim contract")
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
