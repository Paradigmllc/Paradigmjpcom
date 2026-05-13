#!/usr/bin/env node
const TOKEN = "6|gmsqAVZz3grFurFygCGBQmBH7CE1iMzNcpa1i9dib44da608"
const res = await fetch("https://coolify.appexx.me/api/v1/applications/i12am4vvcbggefnqdizhnv9a/envs", {
  headers: { Authorization: `Bearer ${TOKEN}` },
})
const envs = await res.json()
const target = envs.find((e) => e.key === "SUPABASE_SERVICE_ROLE_KEY")
if (target) {
  process.stdout.write(target.real_value || target.value || "")
}
