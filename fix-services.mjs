import { readFileSync } from 'node:fs';
import('./scripts/lib/coolify-env.mjs').then(async m => {
  const auth = await m.getCoolifyAuth();
  const headers = { 'Authorization': 'Bearer ' + auth.token, 'Content-Type': 'application/json' };
  
  // Check ai-services
  const r = await fetch(auth.baseUrl + '/api/v1/services/ui07zaesh1jgo2zvhi9vvrst', { headers });
  const d = await r.json();
  console.log('ai-services:', d.status);
  
  // hf-renderer: simple nginx placeholder (real service needs Docker build on server)  
  const simpleCompose = `services:
  hf-renderer:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "3001:80"
`;
  const base64 = Buffer.from(simpleCompose).toString('base64');
  
  const pr = await fetch(auth.baseUrl + '/api/v1/services/xfmylqsjgqod5i5sapebxc7m', {
    method: 'PATCH', headers, body: JSON.stringify({ docker_compose_raw: base64 })
  });
  console.log('hf-renderer:', pr.status, 'patched');
  
  await fetch(auth.baseUrl + '/api/v1/services/xfmylqsjgqod5i5sapebxc7m/restart', { method: 'POST', headers });
  console.log('hf-renderer restart queued');
}).catch(e => console.error(e.message));
