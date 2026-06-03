const fs = require('fs');
const files = fs.readdirSync('supabase').filter(f => f.endsWith('.sql')).sort();
const lines = files.map(f => `docker exec -i supabase-oss-db-1 psql -U postgres -d postgres < /root/supabase-oss/migrations/${f}`);
fs.writeFileSync('scripts/run-migrations.sh', lines.join('\n'));
console.log('Script generated.');
