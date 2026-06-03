const { execSync } = require('child_process');
const fs = require('fs');

const sql = `
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
`;
fs.writeFileSync('grants.sql', sql);
execSync('scp grants.sql root@139.59.250.5:/root/supabase-oss/grants.sql');
const out = execSync('ssh root@139.59.250.5 "docker exec -i supabase-oss-db-1 psql -U postgres -d postgres < /root/supabase-oss/grants.sql"');
console.log('Grants executed: ' + out.toString());
