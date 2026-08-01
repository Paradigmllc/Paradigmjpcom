#!/usr/bin/env node
// Audit production service env readiness without printing secret values.

import { readCoolifyApplicationEnvs } from "./lib/coolify-env.mjs";

const SERVICES = [
  { name: "Browserless", envs: ["BROWSERLESS_URL", "BROWSERLESS_TOKEN"] },
  { name: "Chatwoot", envs: ["CHATWOOT_BASE_URL", "CHATWOOT_API_KEY", "CHATWOOT_ACCOUNT_ID"] },
  { name: "Directus", envs: ["DIRECTUS_BASE_URL"], any: ["DIRECTUS_TOKEN", ["DIRECTUS_ADMIN_EMAIL", "DIRECTUS_ADMIN_PASSWORD"]] },
  { name: "Keystatic", envs: ["KEYSTATIC_BASE_URL"] },
  { name: "LiveKit", envs: ["LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"] },
  { name: "Stagehand", envs: ["STAGEHAND_URL", "STAGEHAND_API_KEY"] },
  { name: "HyperFrames", envs: ["HYPERFRAMES_RENDERER_URL", "HYPERFRAMES_API_URL", "HYPERFRAMES_API_KEY"] },
  { name: "OpenMontage", envs: ["OPENMONTAGE_API_URL", "OPENMONTAGE_API_KEY", "NEXT_PUBLIC_OPENMONTAGE_STUDIO_URL"] },
  { name: "ComfyUI", envs: ["COMFYUI_API_URL", "COMFYUI_API_KEY"] },
  { name: "Cloudflare R2", envs: ["CLOUDFLARE_R2_ACCOUNT_ID", "CLOUDFLARE_R2_ACCESS_KEY_ID", "CLOUDFLARE_R2_SECRET_ACCESS_KEY", "CLOUDFLARE_R2_BUCKET", "CLOUDFLARE_R2_PUBLIC_BASE_URL"] },
  { name: "Gotenberg", envs: ["GOTENBERG_URL"] },
  { name: "Slidev", envs: ["SLIDEV_RENDER_URL"] },
  { name: "Crawlee", envs: ["CRAWLEE_WORKER_URL"] },
  { name: "Playwright Stealth", envs: ["OUTREACH_WORKER_URL"] },
  { name: "FFmpeg", envs: ["FFMPEG_BIN"] },
  { name: "FFCreator", envs: ["FFCREATOR_WORKER_URL"] },
  { name: "Astro", envs: ["ASTRO_DEMO_WORKER_URL", "ASTRO_DEMO_FACTORY_URL"] },
  { name: "Cal.com", envs: ["CALCOM_BASE_URL", "CALCOM_API_KEY"] },
  { name: "Supabase Studio", envs: ["NEXT_PUBLIC_SUPABASE_STUDIO_URL"] },
  { name: "Dify Cloud", envs: ["DIFY_API_KEY"], optional: ["DIFY_BASE_URL", "DIFY_API_BASE"] },
  { name: "OpenClaw", envs: ["OPENCLAW_API_KEY"], optional: ["OPENCLAW_API_URL", "OPENCLAW_PIPELINE_TASK_ID", "OPENCLAW_ENRICHMENT_TASK_ID"] },
  { name: "Stripe", envs: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"] },
  { name: "Vast.ai", envs: ["VAST_API_KEY"] },
];

async function main() {
  const envs = await readCoolifyApplicationEnvs();
  const difyBase = envs.DIFY_BASE_URL || envs.DIFY_API_BASE || "https://api.dify.ai";
  
  console.log("=== Service Environment Audit ===\n");
  console.log(`Dify runtime: Cloud (${difyBase === "https://api.dify.ai" ? "default" : "configured"})\n`);
  
  let totalMissing = 0;
  let totalPartial = 0;
  let totalReady = 0;
  
  for (const svc of SERVICES) {
    const configured = svc.envs.filter(e => envs[e] && envs[e].length > 0);
    const missing = svc.envs.filter(e => !envs[e] || envs[e].length === 0);
    const anyReady = (svc.any || []).some((entry) => {
      const names = Array.isArray(entry) ? entry : [entry];
      return names.every((name) => envs[name] && envs[name].length > 0);
    });
    const missingAny = (svc.any && !anyReady) ? [`one of ${svc.any.map((entry) => Array.isArray(entry) ? entry.join("+") : entry).join(" or ")}`] : [];
    const optional = (svc.optional || []).filter(e => envs[e] && envs[e].length > 0);
    
    const status = missing.length === 0 && missingAny.length === 0 ? "READY" : 
                   configured.length > 0 || anyReady ? "PARTIAL" : "MISSING";
    
    if (status === "READY") totalReady++;
    else if (status === "PARTIAL") totalPartial++;
    else totalMissing++;
    
    console.log(`[${status}] ${svc.name}`);
    for (const e of svc.envs) {
      const val = envs[e];
      console.log(`  ${e} = ${val && val.length > 0 ? "(set)" : "(missing)"}`);
    }
    for (const e of missingAny) {
      console.log(`  ${e} = (missing)`);
    }
    for (const e of optional) {
      console.log(`  ${e} = (optional set)`);
    }
    console.log("");
  }
  
  console.log(`=== Summary ===`);
  console.log(`Ready: ${totalReady}`);
  console.log(`Partial: ${totalPartial}`);
  console.log(`Missing: ${totalMissing}`);
}

main().catch(console.error);
