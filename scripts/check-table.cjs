const { execSync } = require('child_process');
try {
  const out = execSync('ssh root@139.59.250.5 "docker exec -i paradigm-supabase-db psql -U postgres -d postgres -c \\"SELECT count(*) FROM public.sales_crm_view_fields;\\""');
  console.log(out.toString());
} catch(e) { console.error(e.toString()); }
