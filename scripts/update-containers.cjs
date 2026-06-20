const { execSync } = require('child_process');
execSync('scp docker-compose.supabase.yml root@178.105.138.55:/root/supabase-oss/docker-compose.yml');
const out = execSync('ssh root@178.105.138.55 "cd /root/supabase-oss && docker compose up -d"');
console.log(out.toString());
