process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const url = 'https://supabase.appexx.me/rest/v1/sales_companies?select=id&limit=1';
const key = require('fs').readFileSync('.env.local', 'utf8').match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
fetch(url, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` } })
  .then(res => res.text().then(text => console.log('HTTP', res.status, text)));
