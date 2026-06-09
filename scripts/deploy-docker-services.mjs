/**
 * Deploy OSS Docker services to Coolify (hf-renderer, Morphic, Perplexica, Skyvern)
 *
 * Creates Coolify applications from Docker Compose files.
 * Requires: COOLIFY_API_TOKEN (auto-resolved via coolify-env.mjs)
 *
 * Usage: node scripts/deploy-docker-services.mjs [--dry]
 */
import { getCoolifyAuth, coolifyRequest } from "./lib/coolify-env.mjs"

const PROJECT_UUID = "okgoks4gwkg0o04csso0s0wg"
const SERVER_UUID = "cw84s4488k8kwc4osckkosk8"

const SERVICES = [
  {
    name: "paradigm-hf-renderer",
    description: "HyperFrames MP4 Renderer (Chromium + FFmpeg)",
    composeFile: "docker-compose.hf-renderer.yml",
    port: 3001,
    domain: "hyperframes.paradigmjp.com",
  },
  {
    name: "paradigm-ai-services",
    description: "Morphic + Perplexica + Skyvern (AI search + browser automation)",
    composeFile: "docker-compose.oss-ai-services.yml",
    ports: "3002,3003,3004,8000",
    domain: null,
  },
]

async function createService(service, dry) {
  const body = {
    name: service.name,
    description: service.description,
    project_uuid: PROJECT_UUID,
    server_uuid: SERVER_UUID,
    docker_compose_raw: null, // Use compose file from repo
    docker_compose_location: service.composeFile,
    git_repository: "git@github.com:Paradigmllc/Paradigmjpcom.git",
    git_branch: "main",
    build_pack: "dockercompose",
    ports_exposes: String(service.port || service.ports),
    is_public: false,
    instant_deploy: true,
  }

  if (dry) {
    console.log(`[DRY RUN] Would create: ${service.name}`)
    console.log(JSON.stringify(body, null, 2))
    return { ok: true }
  }

  try {
    const res = await coolifyRequest("/api/v1/services", {
      method: "POST",
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      console.log(`✅ Created: ${service.name} (${data.uuid})`)
      if (service.domain) {
        console.log(`   Domain: ${service.domain}`)
      }
      return data
    }
    console.error(`❌ Failed to create ${service.name}:`, data.message || data)
    return null
  } catch (e) {
    console.error(`❌ Error creating ${service.name}:`, e.message)
    return null
  }
}

async function main() {
  const dry = process.argv.includes("--dry")
  const auth = await getCoolifyAuth()
  console.log(`Coolify: ${auth.baseUrl}`)
  console.log(`Project: ${PROJECT_UUID} | Server: ${SERVER_UUID}`)
  console.log(dry ? "DRY RUN MODE" : "LIVE MODE")
  console.log("")

  for (const svc of SERVICES) {
    await createService(svc, dry)
  }
}

main().catch(console.error)
