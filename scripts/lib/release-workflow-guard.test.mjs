import assert from "node:assert/strict"
import test from "node:test"
import { inspectReleaseWorkflows, releaseWorkflowViolations } from "./release-workflow-guard.mjs"

test("finds a direct deployment hidden in a differently named workflow", () => {
  for (const name of ["one-shot-country-partner-release.yml", "renamed-release.yaml"]) {
    assert.ok(releaseWorkflowViolations([{ name, source: 'response="$(coolify_get "${API}/deploy?uuid=${APP}&force=true")"' }])
      .some((message) => message.endsWith("direct deployment endpoint")))
  }
})

test("rejects deployment cancellation and bypassing the release wrapper", () => {
  assert.equal(releaseWorkflowViolations([{ name: "unsafe.yml", source: 'curl "${API}/deployments/${id}/cancel"' }]).length, 1)
  assert.equal(releaseWorkflowViolations([{ name: "unsafe.yml", source: 'node scripts/sales-os-no-login-deploy.mjs --skip-deploy-guard' }]).length, 1)
})

test("permits formal entrypoint instructions and path filters", () => {
  assert.deepEqual(releaseWorkflowViolations([{ name: "ci.yml", source: 'paths:\n  - scripts/sales-os-no-login-deploy.mjs\nrun: npm run release:prod' }]), [])
})

test("routing-only validation cannot regain write credentials", () => {
  const source = 'run: node --test scripts/lib/release-workflow-guard.test.mjs\nenv:\n  TOKEN: ${{ secrets.COOLIFY_TOKEN }}'
  assert.equal(releaseWorkflowViolations([{ name: "one-shot-country-partner-release.yml", source }]).length, 1)
})

test("all actual repository workflows respect the known release boundary", () => {
  assert.deepEqual(inspectReleaseWorkflows(), [])
})
