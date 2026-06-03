const { execSync } = require('child_process');

try {
  console.log('Creating directory on server...');
  execSync('ssh -o BatchMode=yes root@139.59.250.5 "mkdir -p /root/supabase-oss/migrations"');

  console.log('Copying SQL files...');
  execSync('scp supabase/*.sql root@139.59.250.5:/root/supabase-oss/migrations/');

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
