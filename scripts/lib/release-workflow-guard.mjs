import fs from "node:fs"
import path from "node:path"

// Regression guard for known direct-deploy paths, not a shell sandbox.
export function releaseWorkflowViolations(files) {
  const violations = []
  for (const { name, source } of files) {
    if (/\/deploy\s*\?/.test(source)) violations.push(`${name}: direct deployment endpoint`)
    if (/\bnode\s+["']?(?:\.\/)?scripts\/sales-os-no-login-deploy\.mjs\b/.test(source)) {
      violations.push(`${name}: bypasses the outer release doctor`)
    }
    if (/\/deployments\/[^\r\n]*\/cancel\b/.test(source)) {
      violations.push(`${name}: direct deployment cancellation`)
    }
    if (name === "one-shot-country-partner-release.yml") {
      if (/secrets\.|statuses:\s*write|^  deploy:/m.test(source)) {
        violations.push(`${name}: routing validation must not carry deployment authority`)
      }
      if (!source.includes("release-workflow-guard.test.mjs")) {
        violations.push(`${name}: missing release-boundary regression check`)
      }
    }
  }
  return violations
}

export function inspectReleaseWorkflows(directory = ".github/workflows") {
  const files = fs.readdirSync(directory)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => ({ name, source: fs.readFileSync(path.join(directory, name), "utf8") }))
  if (!files.some(({ name }) => name === "one-shot-country-partner-release.yml")) {
    return ["Missing production routing validation workflow"]
  }
  return releaseWorkflowViolations(files)
}
