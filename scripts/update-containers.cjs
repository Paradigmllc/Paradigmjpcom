const { execSync } = require('child_process');
execSync('scp docker-compose.supabase.yml root@139.59.250.5:/root/supabase-oss/docker-compose.yml');
const out = execSync('ssh root@139.59.250.5 "cd /root/supabase-oss && docker compose up -d"');
console.log(out.toString());
