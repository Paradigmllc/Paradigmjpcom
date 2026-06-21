import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Paradigm Infrastructure</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#0a0a0f;color:#e0e0e0;padding:24px;min-height:100vh}
h1{font-size:22px;margin-bottom:4px} .sub{font-size:12px;color:#666;margin-bottom:24px}
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px}
.card{background:#14141f;border:1px solid #222;border-radius:10px;padding:16px}
.label{font-size:11px;color:#777;text-transform:uppercase;letter-spacing:.5px}
.value{font-size:26px;font-weight:700;margin:4px 0}
.subt{font-size:12px;color:#666}
.ok{color:#4ade80}.warn{color:#fbbf24}.crit{color:#ef4444}
.bar-bg{background:#1a1a2e;border-radius:4px;height:6px;margin-top:6px}
.bar{background:#4ade80;border-radius:4px;height:100%}
.bar-warn{background:#fbbf24}.bar-crit{background:#ef4444}
table{width:100%;border-collapse:collapse;background:#14141f;border-radius:10px;overflow:hidden;border:1px solid #222;margin-top:12px}
th{text-align:left;padding:10px 14px;font-size:11px;color:#777;text-transform:uppercase;border-bottom:1px solid #222;background:#1a1a2e}
td{padding:10px 14px;font-size:13px;border-bottom:1px solid #1a1a2e}
tr:last-child td{border-bottom:none}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.up{background:#4ade80}.down{background:#ef4444}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:768px){.grid2{grid-template-columns:1fr}}
h2{font-size:15px;margin:24px 0 12px;color:#ccc}
a{color:#60a5fa;font-size:12px;text-decoration:none}
a:hover{text-decoration:underline}
.disks{display:flex;flex-direction:column;gap:8px}
.disk-item{background:#14141f;border:1px solid #222;border-radius:8px;padding:10px 14px}
</style></head>
<body>
<h1>🖥 Paradigm Infrastructure</h1>
<div class="sub">paradigm-prod-01 · Hetzner · <span id="time"></span></div>
<div id="metrics" class="metrics">Loading...</div>
<div class="grid2">
  <div><h2>📦 Services</h2><table><thead><tr><th>Service</th><th>Status</th></tr></thead><tbody id="svc"></tbody></table></div>
  <div><h2>💾 Disk Usage</h2><div class="disks" id="disk"></div></div>
</div>
<h2>🌐 Public Endpoints</h2>
<table><thead><tr><th>URL</th><th>Type</th></tr></thead><tbody id="eps"></tbody></table>
<script>
const EPS=[{url:"paradigmjp.com",n:"Paradigm Web",t:"Next.js"},{url:"twenty.paradigmjp.com",n:"Twenty CRM",t:"NestJS"},{url:"hermes.appexx.me",n:"Hermes",t:"Agent"},{url:"paperclip.appexx.me",n:"Paperclip",t:"Agent"},{url:"coolify.paradigmjp.com",n:"Coolify",t:"Infra"},{url:"supabase.paradigmjp.com",n:"Supabase",t:"DB"},{url:"n8n.paradigmjp.com",n:"n8n",t:"Automation"}];
async function load(){
  document.getElementById("time").textContent=new Date().toLocaleString("ja-JP");
  try{
    const r=await fetch("/api/infra/status");
    const d=await r.json();
    const pct=d.disk.pct||0,bc=pct>85?"crit":pct>70?"warn":"ok",bw=pct>85?"bar-crit":pct>70?"bar-warn":"bar";
    document.getElementById("metrics").innerHTML=`
      <div class="card"><div class="label">Disk</div><div class="value ${bc}">${d.disk.used}/${d.disk.total}</div><div class="subt">${pct}% used</div><div class="bar-bg"><div class="bar ${bw}" style="width:${pct}%"></div></div></div>
      <div class="card"><div class="label">Containers</div><div class="value ok">${d.docker.containers}</div><div class="subt">running</div></div>
      <div class="card"><div class="label">Images</div><div class="value">${d.docker.images}</div><div class="subt">${d.docker.imageSize||""}</div></div>
      <div class="card"><div class="label">Swap</div><div class="value ok">${d.swap}</div></div>
      <div class="card"><div class="label">Uptime</div><div class="value">${d.uptime}</div></div>
    `;
    document.getElementById("svc").innerHTML=(d.containers||[]).map(c=>`<tr><td><strong>${c.name}</strong><br><span style="font-size:11px;color:#666">${c.image||""}</span></td><td><span class="dot ${c.running?"up":"down"}"></span>${c.running?"Running":"Stopped"}</td></tr>`).join("");
    document.getElementById("disk").innerHTML=(d.diskUsage||[]).map(x=>`<div class="disk-item"><div style="display:flex;justify-content:space-between"><span><strong>${x.path}</strong><br><span style="font-size:11px;color:#666">${x.desc||""}</span></span><span style="font-weight:700">${x.size}</span></div><div class="bar-bg"><div class="bar ${x.sizeGb>10?"bar-warn":""}" style="width:${Math.min(x.sizeGb*5,100)}%"></div></div></div>`).join("");
    document.getElementById("eps").innerHTML=EPS.map(e=>`<tr><td><a href="https://${e.url}" target="_blank">${e.url}</a><br><span style="font-size:11px;color:#666">${e.n}</span></td><td>${e.t}</td></tr>`).join("");
  }catch(e){
    document.getElementById("metrics").innerHTML=`<div class="card"><div class="value crit">Offline</div><div class="subt">${e}</div></div>`;
  }
}
load();
</script>
</body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
