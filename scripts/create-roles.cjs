const { execSync } = require('child_process');
const fs = require('fs');
const sql = `
DO $$
BEGIN
  CREATE ROLE anon NOLOGIN;
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE ROLE authenticated NOLOGIN;
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE ROLE service_role NOLOGIN;
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$
BEGIN
  CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
`;
fs.writeFileSync('roles.sql', sql);
execSync('scp roles.sql root@139.59.250.5:/root/supabase-oss/roles.sql');
const out = execSync('ssh root@139.59.250.5 "docker exec -i supabase-oss-db-1 psql -U postgres -d postgres < /root/supabase-oss/roles.sql"');
console.log('Roles created: ' + out.toString());
