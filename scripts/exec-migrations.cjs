const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

try {
  console.log('Creating directory on server...');
  execSync('ssh -o BatchMode=yes root@139.59.250.5 "mkdir -p /root/supabase-oss/migrations"');

  console.log('Copying root SQL files...');
  execSync('scp supabase/*.sql root@139.59.250.5:/root/supabase-oss/migrations/');

  const subDir = path.join('supabase', 'migrations');
  if (fs.existsSync(subDir)) {
    const subFiles = fs.readdirSync(subDir).filter(f => f.endsWith('.sql')).sort();
    for (const f of subFiles) {
      const num = f.match(/^migration_(\d+)/);
      const dest = num ? f.replace(/^migration_(\d+)/, 'migration_$1' + 'b') : f;
      console.log(`Copying subdirectory migration: ${f} -> ${dest}`);
      execSync(`scp "${path.join(subDir, f)}" "root@139.59.250.5:/root/supabase-oss/migrations/${dest}"`);
    }
  }

  console.log('Copying run-migrations.sh...');
  execSync('scp scripts/run-migrations.sh root@139.59.250.5:/root/supabase-oss/run-migrations.sh');

  console.log('Running migrations on server...');
  const output = execSync('ssh root@139.59.250.5 "chmod +x /root/supabase-oss/run-migrations.sh && cd /root/supabase-oss && ./run-migrations.sh"');
  console.log(output.toString());
  
  console.log('Done!');
} catch (e) {
  console.error(e.message);
  if (e.stdout) console.error('STDOUT:', e.stdout.toString());
  if (e.stderr) console.error('STDERR:', e.stderr.toString());
}
