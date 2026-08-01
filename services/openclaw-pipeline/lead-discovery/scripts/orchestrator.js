#!/usr/bin/env node
/**
 * Full Auto-Chain Pipeline Orchestrator.
 * One command: discover → diagnose → sync → outreach-ready. No user intervention.
 */

const { execSync } = require('child_process');
const PIPE = '/app/openclaw-pipeline';
const twenty = require(`${PIPE}/lead-discovery/lib/twenty-client`);

function run(cmd, label) {
  console.log(`\n━━━ ${label} ───`);
  try {
    const out = execSync(cmd, { encoding: 'utf8', timeout: 600000, maxBuffer: 50*1024*1024, stdio: 'pipe' });
    process.stdout.write(out);
    return { ok: true, output: out };
  } catch (e) {
    process.stdout.write((e.stdout||'')+(e.stderr||''));
    return { ok: false, error: e.message };
  }
}

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { country:'US', industry:'all', limit:5, minScore:55 };
  for (let i=0; i<a.length; i++) {
    const v=a[i+1];
    switch(a[i]) {
      case '--country': opts.country=v?.toUpperCase(); i++; break;
      case '--industry': opts.industry=v; i++; break;
      case '--limit': opts.limit=parseInt(v,10); i++; break;
      case '--min-score': opts.minScore=parseInt(v,10); i++; break;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const start = Date.now();

  console.log('╔══════════════════════════════════════╗');
  console.log(`║  全自動パイプライン ${opts.country} ${opts.industry.padEnd(10)} ${opts.limit}件 ║`);
  console.log('╚══════════════════════════════════════╝');

  // Stage 1: Discover
  const d = run(`node ${PIPE}/lead-discovery/scripts/pipeline.js --country ${opts.country} --industry ${opts.industry} --limit ${opts.limit} --min-score ${opts.minScore} --concurrency 24`, '① リード発見');
  if (!d.ok) { console.log('❌ 発見失敗'); return; }

  // Stage 2: Diagnose + Demo
  const diag = run(`node ${PIPE}/diagnosis-output/scripts/diagnose-batch.js --limit ${opts.limit}`, '② 診断レポート生成 + Supabase保存');
  if (!diag.ok) console.log('⚠ 診断一部失敗も継続');

  // Stage 2b: Demo Generation
  const allAfter = await twenty.listCompanies({limit:opts.limit*3});
  const diagnosed = allAfter.filter(c => c.paradigmReportUrl?.primaryLinkUrl && !c.paradigmDemoUrl?.primaryLinkUrl).slice(0, Math.min(2, opts.limit));
  for (const co of diagnosed) {
    console.log(`  🎨 Demo生成: ${co.name}`);
    try {
      await run(`node ${PIPE}/diagnosis-output/scripts/generate-demo.js --company-id ${co.id}`, `     → ${co.name}`);
    } catch (e) { console.log(`     ⚠ Demo失敗: ${e.message}`); }
  }

  // Stage 3: Sync
  run(`node ${PIPE}/crm-sync/scripts/sync-status.js --batch --limit ${opts.limit*3}`, '③ CRM同期 → 送信待ち');

  // Stage 4: Prep
  const all = await twenty.listCompanies({limit:opts.limit*3});
  const ready = all.filter(c => c.paradigmSalesStatus==='送信待ち / 未対応' && c.paradigmReportUrl?.primaryLinkUrl);
  for (const co of ready.slice(0,opts.limit)) {
    await twenty.updateCompany(co.id, { paradigmNextAction:'アウトリーチ準備完了', paradigmDataStatus:'send_ready' }).catch(()=>{});
  }

  const elapsed = ((Date.now()-start)/1000).toFixed(0);
  const diagCount = all.filter(c=>c.paradigmReportUrl?.primaryLinkUrl).length;
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  ✅ 全自動完了 (${elapsed}s)                  ║`);
  console.log(`║  発見→診断→同期→送信待ち                ║`);
  console.log(`║  診断済: ${diagCount}件 | 送信待ち: ${ready.length}件     ║`);
  console.log(`╚══════════════════════════════════════╝`);
}

main().catch(e=>{console.error(e.message);process.exit(1);});
