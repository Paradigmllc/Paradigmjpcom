import fs from "node:fs"
import path from "node:path"
import { describe, expect, test } from "vitest"

const root = process.cwd()
const migration = fs.readFileSync(
  path.join(
    root,
    "supabase/migrations/migration_068_contact_submission_atomicity.sql",
  ),
  "utf8",
)
const deploy = fs.readFileSync(
  path.join(root, "scripts/sales-os-no-login-deploy.mjs"),
  "utf8",
)
const releaseDoctor = fs.readFileSync(
  path.join(root, "scripts/release-doctor.mjs"),
  "utf8",
)

describe("contact submission migration release contract", () => {
  test("creates one-to-one challenge, lead, and DB outbox reservations", () => {
    expect(migration).toContain("idempotency_key text NOT NULL UNIQUE")
    expect(migration).toContain("challenge_hash text NOT NULL UNIQUE")
    expect(migration).toContain("lead_id uuid UNIQUE")
    expect(migration).toContain("operator_queue_item_id uuid UNIQUE")
    expect(migration).toContain("sales_create_contact_submission")
    expect(migration).toContain("sales_operator_queue_items")
    expect(migration).toContain("v_notification_title")
    expect(migration).toContain("'supabase'")
    expect(migration).not.toContain("'appsmith'")
  })

  test("requires a current lease claim token to complete Slack delivery", () => {
    expect(migration).toContain("notification_claim_token = gen_random_uuid()")
    expect(migration).toContain("notification_status = 'processing'")
    expect(migration).toContain("notification_claim_token = p_claim_token")
    expect(migration).toContain(
      "sales_complete_contact_notification(text, uuid, text, text)",
    )
  })

  test("exposes contact and legacy definer RPCs to service_role only", () => {
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.sales_create_contact_submission",
    )
    expect(migration).toContain(
      "sales_atomic_meta_merge(uuid,jsonb) FROM PUBLIC, anon, authenticated",
    )
    expect(migration).toContain(
      "sales_atomic_meta_history_prepend(uuid,text,text,text) FROM PUBLIC, anon, authenticated",
    )
    expect(migration).toContain(
      "sales_atomic_screenshot_append(uuid,text,jsonb) FROM PUBLIC, anon, authenticated",
    )
  })

  test("applies migration after the operator queue bootstrap and gates release", () => {
    const toolingCall = deploy.indexOf(
      "await applySalesToolingBootstrapMigration(envs)",
    )
    const contactCall = deploy.indexOf(
      "await applyContactSubmissionAtomicityMigration(envs)",
    )
    expect(toolingCall).toBeGreaterThan(0)
    expect(contactCall).toBeGreaterThan(toolingCall)
    expect(releaseDoctor).toContain("contact ingress table/RPC ACL/CAS guard")
    expect(releaseDoctor).toContain("CONTACT_FORM_CHALLENGE_SECRET")
    expect(releaseDoctor).toContain("CLOUDFLARE_ORIGIN_LOCKED")
  })
})
