/**
 * Deploy OSS AI & browser automation services to Coolify via API.
 * Run: node scripts/deploy-oss-ai-services.mjs
 *
 * Creates a Docker Compose stack with Steel-Browser, FlareSolverr, and MassDNS.
 * All OSS, free, self-hosted — no SaaS dependency.
 */

import { coolifyRequest, getCoolifyAuth } from "./lib/coolify-env.mjs"

const PROJECT_UUID = "okgoks4gwkg0o04csso0s0wg"
const SERVER_UUID = "cw84s4488k8kwc4osckkosk8"
const COMPOSE_FILE = "docker-compose.oss-ai-services.yml"
const SERVICE_NAME = "paradigm-oss-ai-services"

async function findExistingService() {
  const services = await coolifyRequest("/api/v1/services")
  const list = Array.isArray(services) ? services : (services.data ?? [])
  return list.find(s => s.name === SERVICE_NAME)
}

async function deployCompose() {
  console.log("[deploy-oss-ai] Checking Coolify auth...")
  const auth = getCoolifyAuth()
  if (!auth) {
    console.error("[deploy-oss-ai] COOLIFY_API_TOKEN not configured")
    process.exit(1)
  }

  // Check if service already exists
  const services = await coolifyRequest("/api/v1/services")
  const list = Array.isArray(services) ? services : (services.data ?? [])
  const existing = list.find(s => s.name === SERVICE_NAME)

  if (existing) {
    console.log(`[deploy-oss-ai] Service exists (uuid: ${existing.uuid}), triggering redeploy...`)
    const deploy = await coolifyRequest(`/api/v1/deploy?uuid=${existing.uuid}&force=true`, { method: "POST" })
    console.log(`[deploy-oss-ai] Redeploy queued:`, deploy?.deployment_uuid || "ok")
    return
  }

  console.log("[deploy-oss-ai] Creating new Docker Compose service...")
  const body = {
    name: SERVICE_NAME,
    description: "Steel-Browser + FlareSolverr + MassDNS — OSS browser automation stack",
    project_uuid: PROJECT_UUID,
    server_uuid: SERVER_UUID,
    docker_compose_raw: null,
    docker_compose_location: COMPOSE_FILE,
    git_repository: "git@github.com:Paradigmllc/Paradigmjpcom.git",
    git_branch: "main",
    build_pack: "dockercompose",
    ports_exposes: "3000,8191",
    is_public: false,
    instant_deploy: true,
  }
  try {
    const result = await coolifyRequest("/api/v1/services", {
      method: "POST",
      body: JSON.stringify(body),
    })
    console.log("[deploy-oss-ai] Service created, deploying:", result?.uuid || JSON.stringify(result).slice(0, 200))
  } catch (error) {
    console.error("[deploy-oss-ai] Service creation failed:", error.message)
    // Try with alternative format
    try {
      const altBody = {
        type: "docker-compose",
        name: SERVICE_NAME,
        description: "Steel-Browser + FlareSolverr + MassDNS",
        project_uuid: PROJECT_UUID,
        server_uuid: SERVER_UUID,
        environment_name: "production",
        docker_compose_location: COMPOSE_FILE,
        git_repository: "git@github.com:Paradigmllc/Paradigmjpcom.git",
        git_branch: "main",
        build_pack: "dockercompose",
        ports_exposes: "3000,8191",
        is_public: false,
        instant_deploy: true,
      }
      const altResult = await coolifyRequest("/api/v1/services", {
        method: "POST",
        body: JSON.stringify(altBody),
      })
      console.log("[deploy-oss-ai] Service created (alt format):", altResult?.uuid || "ok")
    } catch (altError) {
      console.error("[deploy-oss-ai] Alt format also failed:", altError.message)
      process.exit(1)
    }
  }
}

deployCompose()
