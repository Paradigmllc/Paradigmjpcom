const fs = require('fs');
const path = require('path');

const rootFiles = fs.readdirSync('supabase')
  .filter(f => f.endsWith('.sql'))
  .sort();

const subFiles = fs.readdirSync(path.join('supabase', 'migrations'))
  .filter(f => f.endsWith('.sql'))
  .sort()
  .map(f => {
    const num = f.match(/^migration_(\d+)/);
    if (num) return { name: f.replace(/^migration_(\d+)/, 'migration_$1' + 'b'), orig: f };
    return { name: f, orig: f };
  });

const allNames = rootFiles.map(f => path.basename(f));
for (const sf of subFiles) {
  if (allNames.includes(sf.name)) continue;
  allNames.push(sf.name);
}

const dockerCmd = 'docker exec -i paradigm-supabase-db psql -U postgres -d postgres < /root/supabase-oss/migrations/';

const rootLines = rootFiles.map(f => `${dockerCmd}${f}`);
const subLines = subFiles.map(sf => `${dockerCmd}${sf.name}  # original: supabase/migrations/${sf.orig}`);

const lines = [...rootLines, ...subLines];
fs.writeFileSync('scripts/run-migrations.sh', lines.join('\n') + '\n');
console.log(`Script generated: ${lines.length} migration lines (${rootFiles.length} root + ${subFiles.length} subdirectory).`);
