import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("Video Factory Vast provisioning", () => {
  it("supports the official ComfyUI template layout and environment", () => {
    const script = readFileSync(
      resolve(root, "scripts/vast/provision-video-factory-wan22.sh"),
      "utf8",
    )

    expect(script).toContain("/opt/workspace-internal/ComfyUI")
    expect(script).toContain("/venv/comfyui/bin/python")
    expect(script).toContain("/etc/vast_boot.d/55-tls-cert-gen.sh")
    expect(script).toContain("openssl x509 -in /etc/instance.crt -noout")
    expect(script.split(/\r?\n/).length).toBeLessThanOrEqual(500)
  })

  it("uses the system CA bundle for Python and the Vast CA for Node", () => {
    const dockerfile = readFileSync(resolve(root, "Dockerfile"), "utf8")

    expect(dockerfile).toContain(
      "ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/vast-ai-jupyter-root.crt",
    )
    expect(dockerfile).toContain(
      "ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt",
    )
    expect(dockerfile).toMatch(/RUN apk add --no-cache curl \\/)
  })
})
