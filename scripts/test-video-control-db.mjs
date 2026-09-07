// Isolated PostgreSQL/WASM regression suite; never connects to production.
// npm install --prefix <temporary-directory> --save-exact @electric-sql/pglite@0.5.8
// node scripts/test-video-control-db.mjs <temporary-directory>/node_modules/@electric-sql/pglite/dist/index.js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

if (!process.argv[2]) throw new Error('Pass the installed PGlite module path')
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href)
const db = new PGlite()
let passed = 0
const migration = await readFile('supabase/migrations/20260907120000_video_factory_generation_control_plane.sql', 'utf8')
async function reserve(key, overrides = {}) {
  const p = { key, hash: 'a'.repeat(64), project: 'fixture', shot: 'broll', tier: 'economy',
    provider: 'vast_oss', cost: 100, tokens: 0, seconds: 30, actor: 'test:operator', ...overrides }
  const result = await db.query(`select public.video_factory_reserve_generation_run(
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as result`, Object.values(p))
  return result.rows[0].result
}
async function test(name, fn) {
  await db.exec('begin')
  try {
    await db.exec("update public.video_factory_generation_policies set enabled = true")
    await fn()
    passed++
    process.stdout.write(`PASS ${name}\n`)
  } finally {
    await db.exec('rollback')
  }
}
try {
  await db.exec('create role anon; create role authenticated; create role service_role;')
  await db.exec(migration)
  // Applying the same undeployed migration twice must be safe.
  await db.exec(migration)
  const initial = await reserve('disabled-default')
  assert.equal(initial.run.block_reason, 'policy_disabled')
  passed++
  await test('idempotent replay creates only one run', async () => {
    const first = await reserve('same-request')
    const second = await reserve('same-request')
    assert.equal(first.run.id, second.run.id)
    assert.equal(second.idempotent_replay, true)
  })
  for (const change of [{ hash: 'b'.repeat(64) }, { actor: 'test:other' }, { project: 'other' }, { cost: 101 }]) {
    await test(`reject conflicting key ${Object.keys(change)[0]}`, async () => {
      await reserve('conflict-request')
      await assert.rejects(reserve('conflict-request', change), /idempotency payload conflict/)
    })
  }
  for (const state of ['running', 'queued', 'retryable', 'cancelled']) {
    await test(`budget includes ${state} across expiry and midnight`, async () => {
      const first = await reserve(`spent-${state}`, { cost: 900 })
      await db.query(`update public.video_factory_generation_runs set state=$2,
        actual_cost_cents=900, created_at=now()-interval '2 days',
        expires_at=now()-interval '1 day', updated_at=now() where id=$1`, [first.run.id, state])
      await db.exec('update public.video_factory_generation_policies set daily_budget_cents=1200')
      const result = await reserve(`next-${state}`, { cost: 400 })
      assert.equal(result.run.block_reason, 'daily_cost_limit')
    })
  }
  await test('expired unstarted reservation releases unused funds', async () => {
    const first = await reserve('expired-reservation', { cost: 900 })
    await db.query("update public.video_factory_generation_runs set expires_at=now()-interval '1 minute' where id=$1", [first.run.id])
    await db.exec('update public.video_factory_generation_policies set daily_budget_cents=1200')
    assert.equal((await reserve('after-expiry', { cost: 400 })).run.decision, 'allow')
  })
  await test('only one half-open probe despite health timestamp changes', async () => {
    await db.exec("update public.video_factory_provider_health set circuit_state='open', retry_after=now()-interval '1 minute'")
    assert.equal((await reserve('first-probe')).run.decision, 'allow')
    await db.exec("update public.video_factory_provider_health set updated_at=now()+interval '1 second'")
    assert.equal((await reserve('second-probe')).run.block_reason, 'provider_half_open_probe_in_progress')
  })
  await test('approved review alone cannot authorize cache reuse', async () => {
    const first = await reserve('cache-candidate')
    await db.query("update public.video_factory_generation_runs set state='succeeded', completed_at=now() where id=$1", [first.run.id])
    await db.query(`insert into public.video_factory_generation_quality_reviews
      (run_id, identity_score,motion_score,prompt_score,artifact_score,audio_score,commercial_score,approved,reviewer,note)
      values ($1,100,100,100,100,100,100,true,'test:reviewer','Approved fixture without artifact')`, [first.run.id])
    assert.equal((await reserve('cache-recheck')).run.decision, 'allow')
  })
  await test('failed attempt cannot automatically retry', async () => {
    const first = await reserve('attempt-failure')
    const result = await db.query(`select public.video_factory_record_generation_attempt(
      $1,'failed','fixture-external',100,0,30,'fixture_failure','Fixture failure','test:operator') as run`, [first.run.id])
    assert.equal(result.rows[0].run.state, 'failed')
  })
  await test('service role can reserve but cannot bypass ledger RPCs', async () => {
    await db.exec('set local role service_role')
    assert.equal((await reserve('service-reserve')).run.decision, 'allow')
    await assert.rejects(db.exec('update public.video_factory_generation_runs set reserved_cost_cents=0'), /permission denied/)
  })
  for (const role of ['anon', 'authenticated']) {
    await test(`${role} cannot invoke privileged reservation`, async () => {
      await db.exec(`set local role ${role}`)
      await assert.rejects(reserve(`forbidden-${role}`), /permission denied/)
    })
  }
  process.stdout.write(`${passed} database assertions passed (single-connection PGlite; not a concurrency test).\n`)
} finally {
  await db.close()
}
